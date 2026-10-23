# Iris as switchboard operator: brief for a Cowork session

Paste this whole file (or point Cowork at it) to start. Written 2026-10-23 from a cloud Claude Code
session that could not reach the office network, the router or the Telnyx portal. Everything under
"Known" was reported by the owner or read from docs; nothing was tested.

## Goal

Iris, the Telnyx voice assistant, becomes the switchboard operator and message taker for Classic
Visions, reachable as her own extension on the on-premise FreePBX:

1. Answers calls, says she is an AI, and gives helpful public information when asked.
2. Routes a caller to a person or department by transferring to an extension.
3. Puts the caller on hold while a transfer rings (the PBX's music on hold).
4. If a transferred call is not answered, it returns to Iris, who rings **all handsets**.
5. If nobody answers that either, Iris takes a message. The existing webhook
   `iris-take-message` creates a `phone` helpdesk ticket and emails the feedback address.
6. Works during business hours, after hours, weekends and public holidays.

## Known

- FreePBX 16.0.50, Asterisk 16.30.0, PBX LAN address 192.168.254.52 (private, behind NAT).
- Extensions 2221-2228, 2230 (remote phone, registers from an outside address), 2231, 2248, 2249,
  2252, 2253, 2260. Trunks `FlowSIP` (local carrier) and `Telnyx` (sip.telnyx.com), both registered.
- Iris is a Telnyx AI Assistant attached to one number, +1 312 883 6807 (Chicago). HD Voice and
  inbound recording are off. "Support Unauthenticated Web Calls" is off; leave it off.
- Today the PBX can reach Iris by dialing that number through the `Telnyx` trunk (PSTN leg, small cost).
- `iris-take-message` (Supabase Edge Function, deployed, working per the owner): POST, header
  `X-Iris-Secret`, body `caller_name`, `callback_number`, `reason` (required), `business_name`,
  `caller_number` (optional). Never put the secret in chat, git or a screenshot.
- Hours: Monday-Friday 8:00-17:00 Barbados time open; weekends and public holidays closed.
  Open hours: staff ring immediately and Iris answers after 4 rings (about 22 s ring time).
  Closed: Iris answers immediately.
- Telnyx documents a "UAC connection" (SIP Attach): Telnyx registers to the PBX as an extension and
  calls to it go to the assistant at `<ext>@assistant-<uuid>.sip.telnyx.com`
  (developers.telnyx.com/docs/voice/uac-connections). This needs the PBX reachable from Telnyx.

## Not yet known (find out first, do not guess)

1. Does the router give the PBX a real public IP (router WAN IP equals `curl ifconfig.me`; not
   `100.64.x.x`), and are UDP/TCP 5060 and the RTP range forwarded to 192.168.254.52?
2. Does the Telnyx portal offer a SIP URI, FQDN or credential connection for the assistant, so the PBX
   can dial out and nothing has to be exposed? (Telnyx AI Assistants, Voice > SIP connections.)
3. Does the assistant's transfer tool support: transferring to a SIP URI or extension, hold music
   or a hold message, and a "no answer, come back" behavior? Check the Telnyx docs and portal.
4. Can the PBX pass the original caller's number to the assistant (caller ID, SIP headers)?
5. Which handsets exist as a ring group for "all handsets" (extensions currently in use).

## Design (decide after the unknowns)

- Give Iris a dedicated PJSIP extension or trunk; the PBX sends calls to her by time condition.
- Transfers go from Iris to a PBX destination (a ring group or an extension) over SIP, not the PSTN.
- "No answer, back to Iris" is safest done in the PBX: the no-answer destination of the ring group
  or extension is a second Iris entry (a separate extension or number, so she knows it is a returned
  call), and she then rings the all-handsets ring group, and finally takes a message. Do not rely on
  the assistant to detect no-answer unless Telnyx documents it.
- Keep the PSTN route to +1 312 883 6807 as a failover until the SIP path is tested.
- If Telnyx or the SIP path is down, the PBX falls back to voicemail, never dead air.
- Helpful information: phase 2. Needs a public-audience answers source (for example a new
  Edge Function using the existing public assistant corpus). Iris must never give account, price,
  credit, discount or delivery details to an unverified caller (docs/iris-data-access-contract.md).

## What Cowork can do, and what it must hand to the owner

Cowork may use its browser to read the router, FreePBX and Telnyx pages and prepare changes.
The owner signs in personally; never ask for or type passwords, API keys or the webhook secret
into chat. Before any change that opens the PBX to the internet, edits a live inbound route, or
creates a Telnyx connection, show the exact change and wait for explicit approval. Take a
FreePBX backup (Admin > Backup & Restore) first. Make changes outside business hours, note
the previous value of every setting, and keep rollback steps ready.

## Order of work

1. Answer the "not yet known" questions above; write results to `docs/iris-freepbx-routing.md`.
2. Pick the SIP route: Telnyx UAC (needs a public PBX) or PBX dials out (needs a Telnyx SIP URI).
3. Create the Iris extension or trunk, and the "back to Iris" entry, on the PBX.
4. Configure the Telnyx assistant: instructions (AI disclosure, routing, message taking), a transfer
   tool to the PBX destination, and the take-message tool pointing at
   `https://xstmeirxhfbiyayrrsob.supabase.co/functions/v1/iris-take-message` with `X-Iris-Secret`.
5. Time condition (Monday-Friday 8:00-17:00, holidays closed) and ring group (4 rings, about 22 s).
6. Test table in `docs/iris-freepbx-routing.md` section 5, plus: transfer answered, transfer
   unanswered then all handsets, all handsets unanswered then message ticket, trunk disabled.
7. Update `STATUS.md` and `docs/agent/HANDOFF.md`, commit on a branch and open a PR only if asked.

## Safety rules

- Do not expose the PBX to the internet beyond Telnyx's source addresses; no open SIP to the world.
- Do not change the live main inbound route without approval, a backup and a rollback.
- Do not turn on unauthenticated web calls, call recording or HD Voice without asking.
- Say what was not tested. A step is done only when a real call proves it.
