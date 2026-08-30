# Warehouse Wizard Copilot composer reference

## Purpose

This is a behaviour-level reference for the public Classic Visions **Ask anything** composer. It is intended to help implement an equivalent Warehouse Wizard Copilot with Lovable AI as the server-side generation engine. It describes what the control actually does today, not a claim that the warehouse has the same data sources or permissions.

## What a user can do in the field

The field is a one-line-starting, auto-growing text area. Its placeholder is **Ask anything** and it supports the following interaction contract:

| Capability | Current behaviour | Warehouse Wizard recommendation |
| --- | --- | --- |
| Type a question | Text is controlled by application state; the field grows up to 144px, then scrolls. | Keep this exact keyboard-first pattern. Do not make the field read-only while idle. |
| Send | Press **Enter** or select the paper-plane button. **Shift+Enter** adds a line break. Empty text cannot send. The control is disabled while a request is running. | Preserve Enter/Shift+Enter and prevent duplicate concurrent sends. |
| Voice | The microphone starts an explicit recording; the user selects **Done** to stop and transcribe. The transcript is inserted into the field for review, rather than silently sent. The UI shows Starting, Listening, and Transcribing states. | Reuse only if the Warehouse Wizard has a safe transcription route. Keep review-before-send. |
| Paste an image | Pasting image files creates up to four visual attachments, each at most 8 MB. Users can remove an attachment before sending. | Do not represent this as image understanding until the backend receives image bytes or a secure uploaded file reference. The current public implementation forwards attachment names only, not image content, to the model. |
| Read answers aloud | Text-to-speech controls appear on responses when supported by the browser. | Optional; it is independent from the sending path. |
| Give feedback | Every substantive assistant response can receive one Helpful or Not helpful vote. | Store one vote per response and use negative votes as a gap signal, never as permission to reveal more data. |

The composer does not rely on clipboard access for ordinary text entry. Its only paste interception is for image files; normal typed text remains standard browser input. This matters for floor devices and locked-down browsers.

## Conversation behaviour around the field

- A submitted message is immediately added to the visible conversation and the compose box is cleared.
- The assistant first creates a deterministic, grounded result and then replaces it with the Lovable-generated wording when the server response arrives. The UI marks the interim result as being enhanced.
- It carries the latest five prior text turns into the generation request; the server retains at most the latest six turns when forming the prompt.
- If a user negatively rates an answer and asks a closely related follow-up, it asks a short disambiguating question with direct next actions instead of repeating the same route.
- Anonymous users can chat. Saving a chat prompts them to sign in and resumes saving after authentication. Signed-in users can save, browse, and restore their chats. Starting **New chat** clears the transient conversation, current draft, form state, temporary audience choice, and pop-out snapshot; it does not delete saved chats.
- The assistant can be launched from a floating button, after a contextual nudge, from selected contact links, or in a separate `/assistant/window` pop-out. It hides its launcher while the site cookie-consent banner is active.

## Grounding and AI pipeline

```text
typed / transcribed question
        |
        v
client policy and deterministic retrieval
  - audience + intent inference
  - local site, product, retailer, and knowledge matches
  - account-specific route for signed-in private questions
        |
        v
companion-assistant Edge Function
  - same-origin CORS gate
  - per-IP limits: 6/minute and 60/hour
  - authenticated visibility filtering for server retrieval
  - Lovable AI Gateway rewrite using supplied evidence
        |
        v
answer, source citations, direct actions, optional explicit handoff
```

The public assistant uses a bounded audience model: `visitor`, `patient`, `dispenser`, `customer`, and `staff`. It asks an anonymous user to choose patient, dispenser, or browsing only when the query and route do not establish an audience. It adapts wording but does not use the model to decide authorization.

Source precedence is website content, approved knowledge, controlled external information only when needed, then human support. The server prompt requires answers to use supplied evidence, cite only relevant sources, avoid invented facts or pricing, avoid medical diagnosis, ask one concise clarifier when needed, and hand off when confidence is inadequate.

For the Warehouse Wizard, replace those sources with warehouse-scoped, permission-checked facts: the active warehouse, operator role, current task, location, pallet/item, quantity state, and approved SOPs. Never send an entire operational database, unfiltered customer data, credential, or unrestricted task history to Lovable AI.

## Privacy, authorization, and safe actions

The field has a deliberate policy fork before AI generation:

- Questions that imply private account data require sign-in. The current question remains available after sign-in.
- Signed-in answers are taken from a specific customer command-center adapter. Missing source data produces an explicit “I will not invent it” response.
- Patient/job-number/LabLink lookups are explicitly declined because that data feed is not connected.
- Responses can link to a safe screen or open a request form, but submitting a quote, support request, or public inquiry requires a review-and-confirm step.
- A support form shows request area, requester/account, request type, editable title/details, and a **Confirm & send** button. Cancel removes its generated form transcript and no request is sent.
- Support handoffs attach route, audience, selected account context, task context, and the last grounded result to the request so a human does not start blind.

Apply the same separation in the Warehouse Wizard: chat may explain, find, and prepare; an operation that changes inventory, location, a pallet, a print job, or a cycle-count/freeze must become a structured proposed action with its evidence and an explicit operator approval. Critical operations should use the Wizard's existing server-side authorization and audit seams, not a model decision.

## Persistence, feedback, and telemetry

- The browser assigns an anonymous session ID in `sessionStorage`; it supports rate/analytics correlation without requiring an account.
- A temporary local copy of feedback is kept in `localStorage` for resilience, while the authoritative feedback row is upserted server-side using a user ID or anonymous-session ID plus message ID.
- Saved conversations and messages are persisted only for authenticated users and are loaded on demand in the Saved chats view.
- An unresolved support-handoff result creates an editorial-gap signal with a hashed anonymous session identifier, audience, normalized route, and topic key.

For Warehouse Wizard, use a task/session correlation ID and operator ID only where authorization permits it. Retain the action proposal, approval/rejection, source facts, and final server operation result in the warehouse audit trail. Do not treat browser storage as an audit system.

## Recommended Lovable AI request contract for Warehouse Wizard

Send a compact, server-built request. The browser should never hold `LOVABLE_API_KEY` or warehouse credentials.

```ts
type WarehouseCopilotRequest = {
  message: string;
  conversation: Array<{ role: "user" | "assistant"; text: string }>; // last 6 max
  actor: { userId: string; role: string; warehouseId: string };
  screen: { route: string; workflow: string; taskId?: string };
  evidence: Array<{
    source: string;
    retrievedAt: string;
    facts: Record<string, unknown>;
  }>;
  allowedActions: Array<{
    type: string;
    requiresApproval: boolean;
    schema: Record<string, unknown>;
  }>;
};
```

The server should validate every field, retrieve only evidence the operator may view, apply a warehouse/role rate limit, call Lovable AI, and validate the response against a narrow schema such as `answer`, `citations`, `clarifyingQuestion`, and `proposedAction`. The server—not the model—must verify the proposed action, require confirmation, execute it, and write the audit record.

## Acceptance checks for the Warehouse implementation

1. In an external Chrome or Edge session, click the composer and type a message using real keystrokes. Confirm it is editable, focused, and unobstructed; do not use clipboard-dependent automation as the proof.
2. Confirm Enter sends, Shift+Enter creates a newline, send disables while pending, and a second send cannot race the first.
3. Confirm a user without sufficient role or warehouse scope receives a safe access-required response before AI sees restricted facts.
4. Confirm a low-confidence answer asks one focused clarifying question or prepares a human/exception workflow; it must not fabricate stock, quantities, locations, or task completion.
5. Confirm any inventory-changing proposal displays source facts and requires explicit approval; test an approve and a reject path and inspect the server audit record.
6. If voice or image attachments are enabled, test that a transcript is editable before send and that files are securely uploaded and virus/content-scanned before model access. Otherwise omit the feature rather than implying it works.
7. Confirm Helpful/Not helpful is idempotent and does not expose a prior user's conversation or task data.

## Source implementation map

| Concern | Current source |
| --- | --- |
| Composer UI, Enter behavior, voice, attachment selection, save/new controls | `src/components/assistant/CompanionAssistant.tsx` |
| Client policy forks, message state, private-data handling, persistence, feedback, and explicit handoff | `src/features/assistant/CompanionAssistantContext.tsx` |
| Audience, intent, answer modes, deterministic retrieval | `src/features/assistant/companionAssistantEngine.ts` |
| Client-to-server generation payload | `src/features/assistant/assistantGeneration.ts` |
| Lovable Gateway call, server retrieval, CORS/rate limits, citation filtering | `supabase/functions/companion-assistant/index.ts` |
| Product-level architecture constraints | `docs/ai-knowledge-assistant-architecture.md` |

