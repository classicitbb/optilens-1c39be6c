#!/usr/bin/env python3
"""FreePBX LAN agent for the Classic Visions CRM.

Runs on the FreePBX server (or any machine on the office LAN that has the
`asterisk` CLI). It only makes outbound HTTPS calls, so no ports are opened.

  1. Polls the `pbx-agent` edge function for click-to-call requests made on the
     website and starts them: the staff extension rings first, then the customer.
     While the call lasts it reports its progress and carries out the Hang up,
     Record and Stop buttons pressed on the website.
  2. Uploads call recordings that staff chose to make, and asks the website to
     link them to a contact, log them in the CRM and transcribe them.

Python 3 standard library only. Setup: docs/pbx-calls-setup.md
"""
import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request
import wave

FUNCTION_URL = os.environ["PBX_AGENT_URL"].rstrip("/")  # https://<project>.supabase.co/functions/v1/pbx-agent
TOKEN = os.environ["PBX_AGENT_TOKEN"]
MONITOR_DIR = os.environ.get("PBX_MONITOR_DIR", "/var/spool/asterisk/monitor")
STATE_FILE = os.environ.get("PBX_AGENT_STATE", "/var/lib/pbx-agent/state.json")
# Dialplan context used to ring the staff extension and to dial out. Confirm both
# against the PBX (`asterisk -rx "dialplan show from-internal"`) before go-live.
CONTEXT = os.environ.get("PBX_DIAL_CONTEXT", "from-internal")
# Outside-line prefix your outbound routes expect (often "9" or empty).
DIAL_PREFIX = os.environ.get("PBX_DIAL_PREFIX", "")
POLL_SECONDS = float(os.environ.get("PBX_POLL_SECONDS", "3"))
SCAN_SECONDS = float(os.environ.get("PBX_SCAN_SECONDS", "30"))
SETTLE_SECONDS = 20  # a file still being written is left alone
# Recording from the website's Record button stays off until the consent notice
# and retention plan in docs/pbx-calls-setup.md are agreed. Set to 1 to allow it.
ALLOW_RECORDING = os.environ.get("PBX_ALLOW_RECORDING", "") == "1"
NO_CHANNEL_SECONDS = 15  # originate accepted but no channel appeared: give up
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


def asterisk(command):
    result = subprocess.run(["asterisk", "-rx", command], capture_output=True, text=True, timeout=15)
    if result.returncode != 0:
        raise subprocess.SubprocessError((result.stderr or result.stdout or "asterisk command failed").strip()[:300])
    return result.stdout


def extension_channels(extension):
    """Channels of one extension's phone, from `core show channels concise`.

    Fields: Channel!Context!Exten!Priority!State!Application!Data!CallerID!
    Accountcode!PeerAccount!AMAflags!Duration!BridgeID!Uniqueid
    """
    prefix = f"PJSIP/{extension}-"
    rows = []
    for line in asterisk("core show channels concise").splitlines():
        fields = line.split("!")
        if len(fields) >= 13 and fields[0].startswith(prefix):
            rows.append({"name": fields[0], "state": fields[4], "bridged": bool(fields[12])})
    return rows


def call_status(channel):
    if channel["state"] != "Up":
        return "ringing"  # the staff phone is ringing
    return "connected" if channel["bridged"] else "calling"  # customer answered / being dialled


def start_call(request):
    extension, destination = request["extension"], request["destination"]
    # Digits only: these values go into an Asterisk command.
    if not re.fullmatch(r"\d{2,8}", extension) or not re.fullmatch(r"\d{7,15}", destination):
        return False, "Refused: extension or number was not plain digits."
    # Only one channel per phone is ours to control, so never start a call on a busy phone.
    if extension_channels(extension):
        return False, "Your phone is already on a call."
    # Rings the staff phone itself (not the extension's dialplan, which could send an
    # unanswered call to voicemail and then dial the customer into it); when the phone
    # is answered, the dialplan dials the customer.
    asterisk(f"channel originate PJSIP/{extension} extension {DIAL_PREFIX}{destination}@{CONTEXT}")
    return True, ""


def recording_path(call):
    # FreePBX's own naming, so the website links the file to the call and contact.
    stamp = time.strftime("%Y%m%d-%H%M%S")
    return os.path.join(MONITOR_DIR, f"out-{call['destination']}-{call['extension']}-{stamp}-{time.time():.3f}.wav")


def apply_control(call, control):
    channel = call.get("channel")
    if not channel:
        return "The call has not started yet."
    if control == "hangup":
        asterisk(f"channel request hangup {channel}")
    elif control == "record":
        if not ALLOW_RECORDING:
            return "Recording from the website is turned off on the PBX agent."
        if not call["recording"]:
            asterisk(f"mixmonitor start {channel} {recording_path(call)}")
            call["recording"] = True
    elif control == "stop-record" and call["recording"]:
        asterisk(f"mixmonitor stop {channel}")
        call["recording"] = False
    return ""


def track_calls(active):
    """Report the state of calls started from the website and apply staff controls."""
    updates = []
    for call in list(active.values()):
        channels = extension_channels(call["extension"])
        if channels:
            call["channel"] = channels[0]["name"]
            status = call_status(channels[0])
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
            call["error"] = apply_control(call, control)
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
    log(f"pbx-agent started, watching {MONITOR_DIR}")
    while True:
        try:
            if active:
                track_calls(active)
            request = call_function({"action": "claim"}).get("request")
            if request:
                try:
                    ok, error = start_call(request)
                except subprocess.SubprocessError as failure:
                    ok, error = False, str(failure)
                log(f"call {request['id']}: {'started' if ok else 'failed: ' + error}")
                call_function({"action": "report", "id": request["id"], "ok": ok, "error": error})
                if ok:
                    active[request["id"]] = {**request, "started": time.time(), "recording": False}
                continue  # check for another queued call straight away
            if time.time() - last_scan >= SCAN_SECONDS:
                last_scan = time.time()
                scan_recordings(state)
        except (urllib.error.URLError, OSError, ValueError, subprocess.SubprocessError) as error:
            log(f"error: {error}")
        time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(0)
