#!/usr/bin/env python3
"""FreePBX LAN agent for the Classic Visions CRM.

Runs on any machine on the office LAN (or on the FreePBX server itself). It
controls calls through the Asterisk Manager Interface (AMI) and only makes
outbound HTTPS calls to the website, so no ports are opened to the internet.

  1. Polls the `pbx-agent` edge function for click-to-call requests made on the
     website and starts them: the staff extension rings first, then the customer.
     While the call lasts it reports its progress and carries out the Hang up,
     Record and Stop buttons pressed on the website.
  2. Uploads call recordings that staff chose to make, and asks the website to
     link them to a contact, log them in the CRM and transcribe them. This needs
     the PBX's recording folder (PBX_MONITOR_DIR) to be readable from here; when
     it is not, calls still work and recordings stay on the PBX.

Python 3 standard library only. Setup: docs/pbx-calls-setup.md
"""
import json
import os
import posixpath
import re
import socket
import sys
import time
import urllib.error
import urllib.request
import wave


def load_env_file():
    # Windows Task Scheduler cannot set environment variables, so settings may sit
    # in pbx-agent.env beside this script (KEY=VALUE lines). The real environment wins.
    path = os.environ.get("PBX_AGENT_ENV_FILE") or os.path.join(os.path.dirname(os.path.abspath(__file__)), "pbx-agent.env")
    try:
        with open(path, encoding="utf-8") as handle:
            for line in handle:
                key, sep, value = line.strip().partition("=")
                if sep and not key.startswith("#"):
                    os.environ.setdefault(key.strip(), value.strip())
    except OSError:
        pass


load_env_file()
FUNCTION_URL = os.environ["PBX_AGENT_URL"].rstrip("/")  # https://<project>.supabase.co/functions/v1/pbx-agent
TOKEN = os.environ["PBX_AGENT_TOKEN"]
# AMI login made in FreePBX Settings > Asterisk Manager Users, permitted from this host only.
AMI_HOST = os.environ.get("PBX_AMI_HOST", "127.0.0.1")
AMI_PORT = int(os.environ.get("PBX_AMI_PORT", "5038"))
AMI_USER = os.environ["PBX_AMI_USER"]
AMI_SECRET = os.environ["PBX_AMI_SECRET"]
# Recording folder as this machine sees it (scanned for uploads), and as the PBX sees
# it (where the website's Record button tells Asterisk to write).
MONITOR_DIR = os.environ.get("PBX_MONITOR_DIR", "/var/spool/asterisk/monitor")
PBX_RECORDING_DIR = os.environ.get("PBX_RECORDING_DIR", "/var/spool/asterisk/monitor")
STATE_FILE = os.environ.get("PBX_AGENT_STATE", "/var/lib/pbx-agent/state.json")
# Dialplan context staff phones dial out from (confirmed 2026-10-30).
CONTEXT = os.environ.get("PBX_DIAL_CONTEXT", "from-internal")
# Outside-line prefix the outbound routes expect (none on this PBX).
DIAL_PREFIX = os.environ.get("PBX_DIAL_PREFIX", "")
POLL_SECONDS = float(os.environ.get("PBX_POLL_SECONDS", "3"))
SCAN_SECONDS = float(os.environ.get("PBX_SCAN_SECONDS", "30"))
SETTLE_SECONDS = 20  # a file still being written is left alone
# Recording from the website's Record button stays off until the consent notice
# and retention plan in docs/pbx-calls-setup.md are agreed. Set to 1 to allow it.
ALLOW_RECORDING = os.environ.get("PBX_ALLOW_RECORDING", "") == "1"
NO_CHANNEL_SECONDS = 15  # originate accepted but no channel appeared: give up
RING_SECONDS = 30  # how long the staff phone rings before the call is dropped
AUDIO_EXTENSIONS = (".wav", ".mp3")


def log(message):
    print(time.strftime("%Y-%m-%d %H:%M:%S"), message, flush=True)


def call_function(payload):
    request = urllib.request.Request(
        FUNCTION_URL,
        data=json.dumps(payload).encode(),
        headers={"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.loads(response.read() or b"{}")


class AmiError(Exception):
    pass


def read_message(reader):
    fields = {}
    while True:
        line = reader.readline()
        if not line:
            raise AmiError("AMI connection closed")
        line = line.rstrip("\r\n")
        if not line:
            if fields:
                return fields
            continue
        key, _, value = line.partition(":")
        fields[key.strip()] = value.strip()


def ami(*actions):
    """Run AMI actions on one short connection. Returns, per action, the list
    events it sent back (empty for actions that only answer Success)."""
    with socket.create_connection((AMI_HOST, AMI_PORT), timeout=10) as sock:
        reader = sock.makefile("r", encoding="utf-8", newline="")
        reader.readline()  # "Asterisk Call Manager/x.y" banner

        def send(fields):
            sock.sendall(("".join(f"{key}: {value}\r\n" for key, value in fields.items()) + "\r\n").encode())

        def reply_to(action_id):
            while True:  # skip anything that is not the answer to this action
                message = read_message(reader)
                if message.get("ActionID") == action_id:
                    return message

        send({"Action": "Login", "Username": AMI_USER, "Secret": AMI_SECRET, "Events": "off", "ActionID": "login"})
        if reply_to("login").get("Response") != "Success":
            raise AmiError("AMI login refused")
        results = []
        for index, fields in enumerate(actions):
            action_id = str(index)
            send({**fields, "ActionID": action_id})
            reply = reply_to(action_id)
            if reply.get("Response") != "Success":
                raise AmiError(f"{fields['Action']}: {reply.get('Message', 'failed')}")
            items = []
            if reply.get("EventList") == "start":
                while True:
                    message = reply_to(action_id)
                    if message.get("EventList") == "Complete":
                        break
                    items.append(message)
            results.append(items)
        send({"Action": "Logoff"})
    return results


def channels():
    return ami({"Action": "CoreShowChannels"})[0]


def call_status(channel):
    if channel.get("ChannelState") != "6":  # 6 = Up
        return "ringing"  # the staff phone is ringing
    return "connected" if channel.get("BridgeId") else "calling"  # customer answered / being dialled


def start_call(request):
    call_id, extension, destination = request["id"], request["extension"], request["destination"]
    # These values go into AMI headers: digits and a UUID only.
    if (not re.fullmatch(r"\d{2,8}", extension) or not re.fullmatch(r"\d{7,15}", destination)
            or not re.fullmatch(r"[0-9a-f-]{36}", call_id)):
        return False, "Refused: extension, number or call id was not in the expected form."
    # Only one channel per phone is ours to control, so never start a call on a busy phone.
    if any(item.get("Channel", "").startswith(f"PJSIP/{extension}-") for item in channels()):
        return False, "Your phone is already on a call."
    # Rings the staff phone itself (not the extension's dialplan, which could send an
    # unanswered call to voicemail and then dial the customer into it). When it is
    # answered, the dialplan dials the customer. The caller ID tells FreePBX which
    # extension is calling (outbound route, caller ID) and shows the number on the
    # phone; ChannelId lets the agent find this call's channel again.
    ami({
        "Action": "Originate",
        "Channel": f"PJSIP/{extension}",
        "Context": CONTEXT,
        "Exten": f"{DIAL_PREFIX}{destination}",
        "Priority": "1",
        "CallerID": f'"Call {destination}" <{extension}>',
        "Timeout": str(RING_SECONDS * 1000),
        "ChannelId": call_id,
        "Async": "true",
    })
    return True, ""


def recording_path(call):
    # FreePBX's own naming, so the website links the file to the call and contact.
    stamp = time.strftime("%Y%m%d-%H%M%S")
    return posixpath.join(PBX_RECORDING_DIR, f"out-{call['destination']}-{call['extension']}-{stamp}-{time.time():.3f}.wav")


def apply_control(call, control):
    channel = call.get("channel")
    if not channel:
        return "The call has not started yet."
    if control == "hangup":
        ami({"Action": "Hangup", "Channel": channel})
    elif control == "record":
        if not ALLOW_RECORDING:
            return "Recording from the website is turned off on the PBX agent."
        if not call["recording"]:
            ami({"Action": "MixMonitor", "Channel": channel, "File": recording_path(call)})
            call["recording"] = True
    elif control == "stop-record" and call["recording"]:
        ami({"Action": "StopMixMonitor", "Channel": channel})
        call["recording"] = False
    return ""


def track_calls(active):
    """Report the state of calls started from the website and apply staff controls."""
    updates = []
    current = {item.get("Uniqueid"): item for item in channels()}
    for call in list(active.values()):
        channel = current.get(call["id"])
        if channel:
            call["channel"] = channel["Channel"]
            status = call_status(channel)
        elif call.get("channel") or time.time() - call["started"] > NO_CHANNEL_SECONDS:
            status = "ended"
        else:
            continue  # originate accepted, channel not created yet
        updates.append({"id": call["id"], "status": status, "recording": call["recording"], "error": call.pop("error", "")})
        if status == "ended":
            del active[call["id"]]
    if not updates:
        return
    controls = call_function({"action": "sync", "calls": updates}).get("controls") or {}
    for call_id, control in controls.items():
        call = active.get(call_id)
        if call:
            try:
                call["error"] = apply_control(call, control)
            except (AmiError, OSError) as error:
                call["error"] = f"The phone system did not accept that: {error}"
            log(f"call {call_id}: {control} {call['error'] or 'done'}")


def load_state():
    try:
        with open(STATE_FILE) as handle:
            return json.load(handle)
    except (OSError, ValueError):
        # First run: only recordings made from now on are uploaded, never the backlog.
        return {"baseline": time.time(), "done": []}


def save_state(state):
    os.makedirs(os.path.dirname(STATE_FILE), exist_ok=True)
    with open(STATE_FILE, "w") as handle:
        json.dump(state, handle)


def wav_seconds(path):
    if not path.lower().endswith(".wav"):
        return None
    try:
        with wave.open(path) as handle:
            return handle.getnframes() / float(handle.getframerate())
    except (wave.Error, EOFError, OSError):
        return None


def upload_recording(path, name, mtime):
    info = call_function({"action": "upload-url", "filename": name})
    if info.get("exists"):
        return
    with open(path, "rb") as handle:
        body = handle.read()
    content_type = "audio/wav" if name.lower().endswith(".wav") else "audio/mpeg"
    put = urllib.request.Request(info["uploadUrl"], data=body, headers={"Content-Type": content_type}, method="PUT")
    urllib.request.urlopen(put, timeout=300).read()
    result = call_function({
        "action": "finish",
        "filename": name,
        "path": info["path"],
        "recordedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(mtime)),
        "durationSeconds": wav_seconds(path),
    })
    log(f"uploaded {name}: {result}")


def scan_recordings(state):
    done = set(state["done"])
    now = time.time()
    for folder, _dirs, files in os.walk(MONITOR_DIR):
        for name in files:
            if not name.lower().endswith(AUDIO_EXTENSIONS) or name in done:
                continue
            path = os.path.join(folder, name)
            try:
                mtime = os.path.getmtime(path)
            except OSError:
                continue
            if mtime < state["baseline"] or now - mtime < SETTLE_SECONDS:
                continue
            try:
                upload_recording(path, name, mtime)
            except (urllib.error.URLError, OSError, ValueError) as error:
                log(f"upload failed for {name}, will retry: {error}")
                continue
            done.add(name)
            state["done"] = sorted(done)
            save_state(state)


def main():
    state = load_state()
    save_state(state)
    last_scan = 0.0
    active = {}  # website calls in progress, by request id
    can_scan = os.path.isdir(MONITOR_DIR)
    log(f"pbx-agent started, AMI {AMI_HOST}:{AMI_PORT}, "
        + (f"uploading recordings from {MONITOR_DIR}" if can_scan else f"recording folder {MONITOR_DIR} not reachable, recordings stay on the PBX"))
    while True:
        try:
            if active:
                track_calls(active)
            request = call_function({"action": "claim"}).get("request")
            if request:
                try:
                    ok, error = start_call(request)
                except (AmiError, OSError) as failure:
                    ok, error = False, f"The phone system did not accept the call: {failure}"
                log(f"call {request['id']}: {'started' if ok else 'failed: ' + error}")
                call_function({"action": "report", "id": request["id"], "ok": ok, "error": error})
                if ok:
                    active[request["id"]] = {**request, "started": time.time(), "recording": False}
                continue  # check for another queued call straight away
            if can_scan and time.time() - last_scan >= SCAN_SECONDS:
                last_scan = time.time()
                scan_recordings(state)
        except (urllib.error.URLError, OSError, ValueError, AmiError) as error:
            log(f"error: {error}")
        time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(0)
