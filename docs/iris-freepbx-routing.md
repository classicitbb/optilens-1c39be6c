# Iris after-hours and overflow routing on FreePBX 16 (to apply by hand)

Scope: Iris, the Telnyx voice assistant, answers calls **after hours** and **when staff don't answer**.
Not covered: outbound calls by Iris, or any PBX change made from this repo. Written from the PBX
output pasted on 2026-10-20 (FreePBX 16.0.50, Asterisk 16.30.0, trunks `Telnyx` and `FlowSIP`
registered). Menu names are from memory of FreePBX 16; check each against the GUI.

Placeholder: `IRIS_TARGET` = the number (or SIP URI) the assistant is attached to in Telnyx.
This is still unknown. Do not guess it.

## 1. Outbound path to Iris

1. Connectivity > Outbound Routes: add route `to-iris`, trunk = `Telnyx` only, with a dial
   pattern that matches **only** `IRIS_TARGET` (no other numbers), placed above routes that
   could match it.
2. Admin > Custom Destinations: add `Iris` with target `from-internal,IRIS_TARGET,1`
   (Return = No). If `IRIS_TARGET` is a SIP URI, use Telnyx's SIP URI dialling instead;
   confirm what Telnyx accepts from the registered trunk.
3. Loop guard: `IRIS_TARGET` must not be a number that Telnyx sends back into this PBX as an
   inbound DID. If it is, calls will bounce between the two.

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
| Caller ID | Shown in the ticket under "Called from" |

## 6. Rollback

Set the time condition and ring-group destinations back to their previous values and
Apply Config. Nothing else changes, because the outbound route only matches `IRIS_TARGET`.

## Risks

- The PBX accepts SIP from the internet (extension 2230 registers remotely). Confirm firewall and
  fail2ban before adding more routes.
- Asterisk 16 is end-of-life; schedule an upgrade independently.
- Telnyx per-minute cost applies to every overflow call; consider a ring time that avoids sending
  calls that staff would have answered a few seconds later.
