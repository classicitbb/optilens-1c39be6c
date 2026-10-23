# Iris after-hours and overflow routing on FreePBX 16 (to apply by hand)

Scope: Iris, the Telnyx voice assistant, answers calls **after hours** and **when staff don't answer**.
Not covered: outbound calls by Iris, or any PBX change made from this repo. Written from the PBX
output pasted on 2026-10-20 (FreePBX 16.0.50, Asterisk 16.30.0, trunks `Telnyx` and `FlowSIP`
registered). Menu names are from memory of FreePBX 16; check each against the GUI.

`IRIS_TARGET` = **+1 312 883 6807**, the only number assigned to the Iris assistant in Telnyx
(reported by the user from Telnyx > Calling > Assigned numbers on 2026-10-20: active local US
Chicago number, HD Voice off, inbound recording off, "Support Unauthenticated Web Calls" off).
No SIP URI is shown for the assistant, so the route dials this number through the `Telnyx` trunk.
Leave "Support Unauthenticated Web Calls" off: turning it on would let anyone on the internet start
Iris sessions that you pay for.

## Decided schedule (2026-10-21, from the user)

- Open: 8:00 AM to 5:00 PM (Barbados time), all public holidays treated as closed.
- Open hours: calls ring staff immediately. If nobody answers after **4 rings**, Iris answers.
  Set the ring group or queue ring time to about 22 seconds (a 2 s ring / 4 s pause cycle means
  the fourth ring ends near 20 s); adjust after timing a real call.
- Closed hours and public holidays: Iris answers immediately.
- Weekends are closed (confirmed 2026-10-23): Iris answers immediately on Saturday and Sunday.
- Time condition: time group Monday-Friday 8:00-17:00; holidays go in a Calendar or a dated time
  group and take precedence (closed). Any call outside that group goes to Iris.

## Preferred path: Telnyx SIP connection instead of the PSTN number (to verify)

Telnyx documents a "UAC connection" for connecting a PBX to an AI Assistant: Telnyx registers
**to your PBX** as an extension, and calls to that extension go to the assistant
(destination `<extension>@assistant-<uuid>.sip.telnyx.com`). Source: Telnyx SIP Attach docs
(developers.telnyx.com/docs/voice/uac-connections). Read from the docs only; not tried on this account.

On FreePBX:
1. Create a new PJSIP extension (e.g. `2299`, unused) with a strong random secret. This is
   the "Iris" extension.
2. In Telnyx, create a UAC connection: `external_uac_settings` proxy = the PBX's public
   address and SIP port, username = `2299`, the secret, transport; `internal_uac_settings.destination_uri`
   = `<ext>@assistant-<uuid>.sip.telnyx.com` for the Iris assistant. Check `registration_status` shows registered.
3. Replace the Custom Destination in section 1 with one that rings extension `2299`
   (Misc Destination or Extension destination), so calls never leave the PBX as PSTN.

Costs and risks to confirm before switching:
- This needs the PBX reachable from Telnyx on its SIP port (public address plus port forward
  to 192.168.254.52, restricted to Telnyx's source addresses). The PBX is already reachable
  from the internet for extension 2230; tighten the firewall, do not widen it.
- No PSTN leg, so no per-call outbound charge to the Chicago number (assistant minutes still apply).
- Caller ID: SIP may carry the original caller's number to the assistant; verify with a test call.
- Keep the +1 312 883 6807 route as a failover until the SIP path has been tested.
- The Telnyx doc does not confirm other ways to give an assistant a SIP URI (for example a
  credential or FQDN trunk). If the portal offers one, the PBX could dial it with an outbound
  trunk and no inbound exposure; check the portal first.

## 1. Outbound path to Iris

1. Connectivity > Outbound Routes: add route `to-iris`, trunk = `Telnyx` only, with a dial
   pattern that matches **only** `IRIS_TARGET` (no other numbers), placed above routes that
   could match it.
2. Admin > Custom Destinations: add `Iris` with target `from-internal,13128836807,1`
   (Return = No). The dial pattern must match whatever form you dial (`13128836807`; if the
   route adds a prefix, adjust the pattern, and confirm Telnyx expects E.164 `+1...`).
3. Loop guard: +1 312 883 6807 is assigned to the assistant, not to this PBX, so it should not
   come back as an inbound DID. Confirm no Telnyx inbound route or forwarding sends it here.
4. Caller ID: the assistant will see the caller ID the trunk presents. Telnyx normally only
   accepts caller IDs you own or have verified, so the original caller's number may be replaced
   by the trunk's. If so, the ticket's "Called from" shows the wrong number. Options: pass the
   original number in a SIP header (Telnyx assistant dynamic variables, to be checked), or have
   `iris-take-message` rely on the callback number the caller speaks. Test with a real call.

## 2. After hours

1. Applications > Time Conditions: business hours (days, times, Barbados time zone) and holidays
   as a separate Calendar or time group if wanted.
2. Point the main inbound route's destination at that time condition: **match** = existing
   reception destination, **no match** = Custom Destination `Iris`.

## 3. Overflow (no answer or busy)

Use whichever the office already uses to ring staff:

- **Ring group**: "Destination if no answer" = `Iris`. Set ring time to a value staff accept (e.g. 20 s).
- **Queue**: set max wait time, and "Fail over destination" = `Iris`.
- Individual extensions: their no-answer/busy destinations stay voicemail unless the owner wants Iris.

Ring groups may not fire the no-answer destination when every member is busy or in DND in
some setups. Test busy and DND explicitly.

## 4. Failover if Iris or Telnyx is down

Set the Custom Destination's failure path (or place a Misc/Voicemail destination after it in an
IVR or time condition) so a failed Telnyx dial ends at voicemail, not silence. Test by
disabling the `Telnyx` trunk temporarily during a quiet period.

## 5. Tests (before relying on it)

| Case | Expected |
| --- | --- |
| Call during hours, someone answers | Rings staff only; Iris never involved |
| Call during hours, nobody answers | After ring time, Iris answers and says she is an AI |
| Call after hours | Iris answers immediately |
| Telnyx trunk disabled | Voicemail, not dead air |
| Caller leaves a message | `phone` helpdesk ticket and email (needs `iris-take-message` deployed and `IRIS_WEBHOOK_SECRET` set) |
| Caller ID | Check what appears under "Called from"; it may be the trunk's number (see 1.4) |

## 6. Rollback

Set the time condition and ring-group destinations back to their previous values and
Apply Config. Nothing else changes, because the outbound route only matches `IRIS_TARGET`.

## Risks

- The PBX accepts SIP from the internet (extension 2230 registers remotely). Confirm firewall and
  fail2ban before adding more routes.
- Asterisk 16 is end-of-life; schedule an upgrade independently.
- Each overflow call is an outbound call to a US number plus assistant minutes; neither rate was checked here.
- Telnyx per-minute cost applies to every overflow call; consider a ring time that avoids sending
  calls that staff would have answered a few seconds later.
