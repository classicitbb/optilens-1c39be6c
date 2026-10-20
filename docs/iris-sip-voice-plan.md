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

0. Telnyx is already chosen: confirm how calls reach the assistant (a Telnyx number forwarded, or a FreePBX SIP trunk to Telnyx) and whether FreePBX needs a failover route.
1. Voice stack: managed (e.g. Telnyx AI/voice, which also gives SIP) versus our own bridge
   with a speech-to-text/text-to-speech provider. Managed is faster to ship; own bridge keeps
   audio and logic in our control. Neither has been priced or checked here.
2. Should Iris answer inbound calls, place outbound calls, or both? Outbound needs the
   approval step and compliance review (recording and AI-disclosure notices).
3. Which numbers/extensions, and which hours (after-hours only, or overflow when busy)?
4. Language/accent: the existing transcription path uses `en-BB`/`en-US`/`en-GB`.

## From the PBX (please run and paste; contains no passwords)

```
fwconsole --version
asterisk -rx "core show version"
asterisk -rx "pjsip show endpoints" | head -40
asterisk -rx "pjsip show registrations"
```

## Proposed first build once decided

1. Migration: `call_sessions` and `call_turns` (staff-only RLS, linked to `contacts`/`customers`).
2. `iris-voice` edge function with tests, public-audience only.
3. Voice bridge service plus FreePBX extension setup notes under `docs/`.
4. Admin view of call transcripts, with Iris's AI disclosure logged per call.
