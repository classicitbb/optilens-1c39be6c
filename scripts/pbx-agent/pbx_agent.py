#!/usr/bin/env python3
"""FreePBX LAN agent for the Classic Visions CRM.

Runs on the FreePBX server (or any machine on the office LAN that has the
`asterisk` CLI). It only makes outbound HTTPS calls, so no ports are opened.

  1. Polls the `pbx-agent` edge function for click-to-call requests made on the
     website and starts them: the staff extension rings first, then the customer.
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


def start_call(request):
    extension, destination = request["extension"], request["destination"]
    # Digits only: these values go into an Asterisk command.
    if not re.fullmatch(r"\d{2,8}", extension) or not re.fullmatch(r"\d{7,15}", destination):
        return False, "Refused: extension or number was not plain digits."
    # Rings the extension; when it answers, the dialplan dials the customer.
    command = f"channel originate Local/{extension}@{CONTEXT} extension {DIAL_PREFIX}{destination}@{CONTEXT}"
    result = subprocess.run(["asterisk", "-rx", command], capture_output=True, text=True, timeout=15)
    if result.returncode != 0:
        return False, (result.stderr or result.stdout or "asterisk command failed").strip()[:300]
    return True, ""


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
    log(f"pbx-agent started, watching {MONITOR_DIR}")
    while True:
        try:
            request = call_function({"action": "claim"}).get("request")
            if request:
                ok, error = start_call(request)
                log(f"call {request['id']}: {'started' if ok else 'failed: ' + error}")
                call_function({"action": "report", "id": request["id"], "ok": ok, "error": error})
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
