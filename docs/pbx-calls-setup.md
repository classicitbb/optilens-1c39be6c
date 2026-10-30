# FreePBX click-to-call and selective call recording

Status: source only (2026-10-24). Nothing is applied, deployed or installed. Not tested against a real FreePBX or a real Supabase project; the agent was exercised against a stub server and a fake `asterisk` command only.

## How it works

```
Website (contact > Calls tab)        FreePBX (office LAN)
  Call button                          extensions, trunks, on-demand recording
     │ pbx-calls (staff JWT)                ▲ asterisk -rx "channel originate …"
     ▼                                      │
  call_requests  ◄── claim/report ──  scripts/pbx-agent/pbx_agent.py
  call_recordings ◄─ upload-url/finish ─┘   (outbound HTTPS only, no open ports)
  activities (CRM timeline)
```

- **Click-to-call:** `pbx-calls` queues a row in `call_requests` for the signed-in staff member's extension (`staff_extensions`). The agent claims it and runs an Asterisk `channel originate PJSIP/<ext> extension <number>@<context>`: the staff phone itself rings first (not the extension's dialplan, so an unanswered call can't go to voicemail and then dial the customer into it), then the customer is dialled. The agent refuses to start a call on a phone that is already on one. Audio never goes through the browser. Requests older than 2 minutes are expired, not dialled.
- **Call panel (2026-10-30):** after Call, the Calls tab shows the call's progress (phone ringing, dialling the customer, connected with a timer, ended) and **Hang up**, **Record** and **Stop recording** buttons. The agent reports progress with the `sync` action every few seconds from `core show channels concise` and carries out the buttons with `channel request hangup`, `mixmonitor start` and `mixmonitor stop` on the staff phone's channel. Panel recordings use FreePBX's `out-<number>-<ext>-…` naming in the monitor folder, so they upload and link like any other. Record asks the staff member to confirm they told the customer. The agent ignores Record unless `PBX_ALLOW_RECORDING=1` (see "Before recording customers").
- **Recording:** only calls staff choose to record. Set every staff extension to **On Demand** (or Never) in FreePBX, never Always; staff press the on-demand recording code during a call. The agent uploads new files from the monitor directory to the private `call-recordings` bucket. On first start it only uploads files created after it started, never the backlog.
- **After upload:** `pbx-agent` links the recording to a contact (the website click if there was one, otherwise the phone number, and only if exactly one contact has it), transcribes and summarises it, and, if a contact was found, adds a completed Call activity to the CRM timeline. Unmatched recordings are kept, with no contact link and no activity.
- **Playback:** the Calls tab opens a 5-minute signed link; every playback is written to the security audit log. Recordings and transcripts are visible to admin and operator roles only.

Transcription and summaries go through the same AI gateway as `voice-transcribe`, so call audio and text are processed by that provider. Include that in the privacy notice.

## One-time setup

1. Apply `supabase/migrations/20261024120000_pbx_calls.sql`, then `20261030120000_pbx_call_controls.sql` (Lovable SQL editor).
2. Add the edge-function secret `PBX_AGENT_TOKEN` (a long random string; `openssl rand -hex 32`). `LOVABLE_API_KEY` is already used by `voice-transcribe`.
3. Deploy `pbx-calls` and `pbx-agent`, then run `npm run qa:edge-smoke`.
4. Give each of the 6 staff an extension: `insert into staff_extensions (user_id, extension) values ('<auth user id>', '2001');`
5. On the PBX, as root:
   ```
   mkdir -p /opt/pbx-agent && cp pbx_agent.py /opt/pbx-agent/
   cat > /etc/pbx-agent.env <<'EOF'
   PBX_AGENT_URL=https://xstmeirxhfbiyayrrsob.supabase.co/functions/v1/pbx-agent
   PBX_AGENT_TOKEN=<the same secret>
   PBX_DIAL_PREFIX=
   PBX_ALLOW_RECORDING=0
   EOF
   chmod 600 /etc/pbx-agent.env
   ```
   Run it as a service (`/etc/systemd/system/pbx-agent.service`):
   ```
   [Unit]
   Description=Classic Visions PBX agent
   After=network-online.target asterisk.service
   [Service]
   EnvironmentFile=/etc/pbx-agent.env
   ExecStart=/usr/bin/python3 /opt/pbx-agent/pbx_agent.py
   Restart=always
   User=asterisk
   [Install]
   WantedBy=multi-user.target
   ```
   Then `systemctl enable --now pbx-agent`. The `asterisk` user must be able to run `asterisk -rx` and read `/var/spool/asterisk/monitor`, and write `/var/lib/pbx-agent`.

## PBX findings (2026-10-30, Asterisk CLI output pasted by the user; read-only)

- Asterisk 16.30.0. The first migration (`20261024120000_pbx_calls.sql`) is already live: the three tables and the bucket exist, with no rows. `20261030120000_pbx_call_controls.sql` is not applied.
- Staff phones are PJSIP endpoints named by extension (2221-2228, 2248, 2249 online; 2230 remote; 2231, 2252, 2253, 2260, 2270, 2271 offline), context `from-internal`, so their calls are `PJSIP/<ext>-…` channels, as the agent expects. `webrtc` is `no` (2221 checked).
- Outbound routes, in order: `outrt-5` (not shown; presumably the Iris route), LandLine `_NXXXXXX` (caller-ID match 2226 only), Classic `_NXXXXXX` (everyone), both to trunk 1 with the office's 433 numbers as caller ID; OverseasCalls `_1NXXNXXXXXX` to trunk 2, **with a route password**. Trunk 1 is presumably FlowSIP and trunk 2 Telnyx (inferred from the caller IDs and route names). No prefix is used, so `PBX_DIAL_PREFIX` stays empty.
- So the website now dials Barbados numbers as 7 digits (local route) and other North American numbers as `1` + 10 digits. A `1246…` number would have gone out the overseas route and asked for its password. Other international numbers have no route (they reach `bad-number`), so the website does not dial them.
- Website calls to non-Barbados North American numbers will ask the staff member for the overseas route password after they pick up. That is the PBX's existing control; it is not bypassed.
- `mixmonitor start|stop` exists on the CLI. Endpoints have `one_touch_recording` on with `apprecord`, so phone-based on-demand recording also works.
- Staff for each extension: the website holds no extension data (HR employees are not linked to logins). Take the names from FreePBX Applications > Extensions. Known: 2221 = Elizabeth Ward (login liz@).

## Still to confirm on the real PBX

- Recording file names and folder layout (needs a shell): the parser assumes FreePBX's default `out-<dialed>-<ext>-YYYYMMDD-HHMMSS-<uniqueid>.wav` and `in-<did>-<callerid>-…`. If yours differ, recordings are still stored but not linked to a contact; adjust `parseRecordingName` in `supabase/functions/_shared/pbx/calls.ts`.
- Python 3 on the PBX and the user Asterisk runs as (needs a shell).
- Caller ID of a website call: `channel originate PJSIP/<ext>` from the CLI sets no caller ID on the staff leg, so FreePBX may not know which extension is calling. The Classic route still sets the office number, but the LandLine route's 2226 match would not apply. Check in the first test call.

## Before recording customers

- Play or say a "this call is being recorded" notice whenever recording starts; many overseas jurisdictions need every party's consent. Have counsel confirm Barbados and the countries you call.
- Add a retention period and a deletion process (none is implemented here).
- Never record while taking card details.
- Only then set `PBX_ALLOW_RECORDING=1` in `/etc/pbx-agent.env` and restart the agent; until then the website's Record button reports that recording is turned off.

## Next step: browser softphone (not built)

Staff talking through a headset in the browser instead of a desk phone (WebRTC). It needs PBX changes that need the office's approval first:

- Asterisk's secure WebSocket (port 8089) is closed today; it has to be enabled (Settings > Advanced Settings, TLS for the mini-HTTP server).
- The PBX certificate is self-signed (`freepbx.sangoma.local`); browsers refuse a secure WebSocket to it from the website. It needs a hostname with a trusted certificate (FreePBX Certificate Manager), resolvable on the office LAN.
- Each staff extension needs WebRTC turned on (or a separate WebRTC extension per person), which changes how its phone registers.
- It only works on the office LAN unless the WebSocket port is exposed to the internet, which is not recommended (the PBX already accepts SIP from outside for extension 2230).
