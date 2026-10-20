# Iris over SIP: answering and placing calls (plan)

Update 2026-10-20: Iris already runs as a **Telnyx voice assistant** (it has a take-message
webhook tool, `iris-take-message`, prepared separately and not part of this doc). The bridge
below is therefore the fallback; the preferred path is to connect Telnyx to FreePBX over a SIP
trunk and add more assistant tools.

Status: proposal only. No code, migration, PBX change or provider contact has been made.
Continues the FreePBX-hub design from the "Website VoIP integration proposal" session
(branch `claude/vibrant-lovelace-9nzfbi`), which was never built. This plan covers only
the Iris voice leg; click-to-call, recording upload and the CRM call panel are separate.

## Constraints from existing contracts

- `docs/iris-data-access-contract.md`: Iris acts for an authenticated principal. A phone
  caller is **anonymous** (a "public visitor") unless they pass a verification step, so
  an unverified call gets public knowledge and support intake only. Caller ID is a hint,
  never authentication.
- `docs/ai-assistant-identity.md`: Iris must say she is an AI at the start of every call.
- Outbound calls by Iris must be staff-initiated or approval-gated (customer-facing effect).
- Spend must go through `recordAiSpend`. Audio stays in private storage.
- The PBX (`192.168.254.52`) is not reachable from the cloud, and none of the PBX details
  asked for earlier (versions, trunks, endpoints) have been supplied.

## Shape

```
 Caller / customer ──► Carrier or Telnyx trunk ──► FreePBX
                                                    │ PJSIP trunk/extension "iris" (SIP over TLS or LAN only)
                                                    ▼
                                   Voice bridge (small service, outbound-only to the cloud)
                                     SIP/RTP <-> speech-to-text <-> iris-voice edge function <-> text-to-speech
                                                    │
                                                    ▼
                                   Supabase: call_sessions, call_turns (private, staff RLS)
```

1. **FreePBX side:** one dedicated PJSIP extension (or trunk) for Iris, with its own
   credential, an inbound route/IVR option ("press 9 for Iris" or after-hours routing),
   no outbound dialling rights except through a click-to-call request, and a call-length cap.
2. **Voice bridge:** the one new component. It registers to FreePBX as that extension,
   streams caller audio to speech-to-text, sends each turn to a new `iris-voice` edge
   function, and plays the reply through text-to-speech. It runs on the office LAN (or a
   small host beside the PBX) so the PBX needs no inbound internet exposure.
3. **`iris-voice` edge function:** reuses the `companion-assistant` retrieval and identity,
   fixed to the public audience; server-resolved principal; transcripts and spend recorded.
   It can hand off: create a support ticket or CRM task, or transfer to a human extension.
4. **Verification (optional, phase 2):** a spoken one-time code sent to the customer's
   registered email/portal before any account-specific answers.

## Decisions needed before building

0. RESOLVED 2026-10-20: the assistant is on +1 312 883 6807 (no SIP URI); FreePBX dials it via the Telnyx trunk, inbound recording and web calls off. Earlier text: Telnyx is already chosen: confirm how calls reach the assistant (a Telnyx number forwarded, or a FreePBX SIP trunk to Telnyx) and whether FreePBX needs a failover route.
1. Voice stack: managed (e.g. Telnyx AI/voice, which also gives SIP) versus our own bridge
   with a speech-to-text/text-to-speech provider. Managed is faster to ship; own bridge keeps
   audio and logic in our control. Neither has been priced or checked here.
2. Should Iris answer inbound calls, place outbound calls, or both? Outbound needs the
   approval step and compliance review (recording and AI-disclosure notices).
3. DECIDED: Iris answers after-hours and overflow calls. Still needed: business hours/holidays and ring time before overflow.
4. Language/accent: the existing transcription path uses `en-BB`/`en-US`/`en-GB`.

## PBX findings (2026-10-20, pasted by the user; not independently verified)

- FreePBX 16.0.50, Asterisk 16.30.0 (Asterisk 16 is end-of-life upstream; plan an upgrade separately).
- 17 PJSIP endpoints: extensions 2221-2228, 2230, 2231, 2248, 2249, 2252, 2253, 2260 plus trunks.
  2231, 2252, 2253, 2260 have no phone registered. 2230 registers from an outside address
  (a remote phone), so the PBX is reachable from the internet on SIP: confirm firewall and
  fail2ban rules and that strong secrets are set.
- Trunks `FlowSIP` (10.251.0.241, the local carrier) and `Telnyx` (sip.telnyx.com) are both registered and available.
  Telnyx identifies 64.16.250.10 and 192.76.120.10 as inbound sources.
- A stale IAX2 peer (2234) and an ARI connection error exist; neither affects calls.

## Next steps

1. Decide the path to the assistant (open question 0). Because the Telnyx trunk is already
   registered, the simplest route is a FreePBX inbound route or IVR option that sends calls
   out the Telnyx trunk to the number or SIP URI the assistant is attached to. Needs: the
   assistant's number in Telnyx and whether it accepts calls from this trunk's credentials.
2. Add a failover so calls still ring a human extension if Telnyx is down.
3. Check the Telnyx assistant's tools (take-message is built; others need the same `X-Iris-Secret`-style auth).
4. Do not build the own-bridge fallback unless Telnyx's assistant proves inadequate.

## Proposed first build once decided

1. Migration: `call_sessions` and `call_turns` (staff-only RLS, linked to `contacts`/`customers`).
2. `iris-voice` edge function with tests, public-audience only.
3. Voice bridge service plus FreePBX extension setup notes under `docs/`.
4. Admin view of call transcripts, with Iris's AI disclosure logged per call.
