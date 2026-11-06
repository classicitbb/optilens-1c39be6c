# Guided CRM outreach

CRM opens on **Outreach workspace** at `/admin/crm/dashboard`. Existing reports remain under **CRM reports & other tasks**. Contacts, My Leads, Pipeline cards and Activities enter the same guided journey. Outbox can open a particular message.

## Work one lead from start to finish

1. **Choose contact.** Search by business, person or location. Existing customers and their linked people are hidden initially; use **Include existing customers** for retention. The list reads active contacts in pages and displays up to 40 matches. Choosing a contact changes no records.
2. **Plan outreach.** Write why the business is a fit, the facts you know, the offer and one useful ask. Choose yourself or a colleague as owner and set a next-action date. **Save plan & write email** creates or updates an ordinary CRM activity. Its owner can resume through Activities or the saved-work queue.
3. **Review & send.** Write or paste a subject and email. **Save draft** keeps unfinished work. Existing quality rules flag placeholders, missing asks and excessive length. **Approve email** saves the exact approved text. Editing it requires approval again. Choose one recipient from the contact's addresses.
4. **Send deliberately.** **Review in company email** opens the existing composer with mailbox selection, signature, attachments and final Send. A successful mail-bridge response records the actual edited subject/body and starts follow-up. Alternatively, **Open my email app** opens a composer without marking anything sent. After actually sending, choose **I sent it outside the CRM** and confirm. An external send and eventual recipient delivery cannot be verified by this browser flow.
5. **Wait & follow up.** Check the mailbox-backed conversation and keep a next-action reminder. Reminders never send email automatically. Unavailable history is shown explicitly. Reply detection, cadence enrolment and automatic sending are not added here.
6. **Move forward.** Record the reply or decision and concrete next action, then choose engaged, qualifying, presenting, trial, converting, customer or nurture. Saving records evidence and updates the existing activity's next action. **Customer** records a pipeline win and completes this outreach; it does not create an ERP customer, extend credit or grant portal access. Use the contact record for those processes. **Close outreach** requires a reason. **Write a follow-up email** prepares another reviewed message after a sent email.

## Delegate or ask for help

Assign a colleague in **Plan outreach**, save, and share the workspace link or **Copy handoff brief**. This assigns the ordinary task; it grants no new permissions and sends no notification email. **Ask Iris to help** saves a nonempty brief and unfinished email, then opens the existing admin-only Iris workspace with an editable request. It includes context, the email and a return link, asks for evidence/assumption separation, and requires review. It never submits itself. Paste any proposed email back into **Review & send**. Other assistants can use the copied brief.

## Repeatable practice

Select **Practice without sending** before choosing a contact. Practice has a separate ordinary activity (`Outreach practice`) and `generated_by = 'practice'` draft, so an existing real outreach is preserved. The route carries `practice=1`. Save a reusable brief and email, approve, and choose **Practise send & follow-up**. This changes only rehearsal state in the open wizard: no mailbox is opened and the outbox message is never marked sent. **Use a sample practice reply** fills an explicitly fictional response for editing. Saving a practice outcome or closing a rehearsal changes no customer stage and creates no outcome evidence. **Reset practice** returns to the briefing step while retaining the reusable saved draft. Outbox disables delivery and sent recording for practice drafts. Iris handoffs also identify practice-only work. To send a real email, start a separate normal outreach explicitly.

## Persistence and recovery

- `activities` owns the plan, owner, reminder, state and human-readable brief. `activity_type = 'Outreach plan'` identifies it. An anchored footer associates one exact outbox draft and its recipient. Outcome evidence is a completed ordinary note activity. Saving does not invoke activity automations.
- `outreach_outbox` owns each message and its approval/send status. Manual drafts use `generated_by = 'human'`. The plan links the current message; earlier messages remain in Outbox. Contact stages reuse `useClassifyContact` and retain distinct customer/account links.
- Existing roles/RLS and mailbox access remain authoritative. No new schema, service, credential, environment variable, route, authorization rule or background job.
- Saves are explicit. Leaving through the wizard's contact selector or reloading a dirty draft warns about unsaved edits. Other app navigation can discard unsaved edits; save before leaving.
- A saved draft id survives a failed plan-link save so retry updates that draft. After a confirmed send, the current wizard retains its receipt and offers **Retry CRM recording only**, preventing another send there. Keep the page open until recovery completes.
- Plan writes compare the read `updated_at` to reject overwriting a colleague's edit. There is no new transaction spanning outcome notes, contact stages and tasks; a later failure can leave an earlier step saved. The UI reports the failure. First-time concurrent plan creation in two sessions has no new uniqueness constraint; coordinate ownership before starting the same lead in two sessions.

## Verification

Use mocked UI tests for writes and mail-bridge outcomes. Browser review uses authenticated reads and unsaved fields only. Real sends, production data writes and deployment require separate authorization under repository rules. A successful bridge send does not prove recipient delivery.
