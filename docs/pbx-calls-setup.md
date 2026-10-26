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

- **Click-to-call:** `pbx-calls` queues a row in `call_requests` for the signed-in staff member's extension (`staff_extensions`). The agent claims it and runs an Asterisk `channel originate`: the staff phone rings first, then the customer is dialled. Audio never goes through the browser. Requests older than 2 minutes are expired, not dialled.
- **Recording:** only calls staff choose to record. Set every staff extension to **On Demand** (or Never) in FreePBX, never Always; staff press the on-demand recording code during a call. The agent uploads new files from the monitor directory to the private `call-recordings` bucket. On first start it only uploads files created after it started, never the backlog.
- **After upload:** `pbx-agent` links the recording to a contact (the website click if there was one, otherwise the phone number, and only if exactly one contact has it), transcribes and summarises it, and, if a contact was found, adds a completed Call activity to the CRM timeline. Unmatched recordings are kept, with no contact link and no activity.
- **Playback:** the Calls tab opens a 5-minute signed link; every playback is written to the security audit log. Recordings and transcripts are visible to admin and operator roles only.

Transcription and summaries go through the same AI gateway as `voice-transcribe`, so call audio and text are processed by that provider. Include that in the privacy notice.

## One-time setup

1. Apply `supabase/migrations/20261024120000_pbx_calls.sql` (Lovable SQL editor).
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

## To confirm against the real PBX (not yet known)

- The dialplan context and outside-line prefix: defaults are `from-internal` and none (`PBX_DIAL_CONTEXT`, `PBX_DIAL_PREFIX`). Check with `asterisk -rx "dialplan show from-internal"` and the outbound routes.
- Recording file names: the parser assumes FreePBX's default `out-<dialed>-<ext>-YYYYMMDD-HHMMSS-<uniqueid>.wav` and `in-<did>-<callerid>-…`. If yours differ, recordings are still stored but not linked to a contact; adjust `parseRecordingName` in `supabase/functions/_shared/pbx/calls.ts`.
- Whether outbound calls from the Local channel are recorded under the on-demand setting you use.
- Barbados numbers are dialled as `1246…`. Overseas routing depends on the PBX outbound routes and the Telnyx trunk, which this change does not configure.

## Before recording customers

- Play or say a "this call is being recorded" notice whenever recording starts; many overseas jurisdictions need every party's consent. Have counsel confirm Barbados and the countries you call.
- Add a retention period and a deletion process (none is implemented here).
- Never record while taking card details.
