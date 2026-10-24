# AI spend and credit monitoring

Status: first source implementation complete; migration, Edge functions, and
frontend are not deployed. Provider billing feeds remain unconnected.

## Owner view

Add **Settings > Integrations > AI spend** for administrators. Show one row per
billable provider, with the source and last refresh beside every figure:

| Figure | Meaning |
| --- | --- |
| Spend today / 7 days / billing period | Provider-reported charge where available; otherwise a clearly marked estimate |
| Requests and average request cost | Successful and failed billable calls, plus spend divided by billable calls |
| Average per day | Last 30 complete calendar days, including zero-use days |
| Remaining credit and fill bar | Only a provider-reported balance or an administrator-entered balance with a timestamp |
| Top-up forecast | Remaining balance divided by the 30-day daily spend; hide if either value is unknown or average is zero |
| Action threshold | A configurable minimum balance or days remaining, with an admin warning |

Use USD for provider charges and explicitly label any converted BBD amount with
its exchange-rate source and date. A subscription credit, promotional grant,
monthly quota, and prepaid API balance must be separate buckets. Do not turn
an API rate limit into a money balance. Show `Unknown` rather than a full bar or
zero when a provider has no reliable balance source.

## Provider inventory and source of truth

| Provider | Current use in this repository | Spend source | Credit source |
| --- | --- | --- | --- |
| Anthropic | `portal-copilot` calls Messages directly, including tool iterations | Anthropic Admin cost report, scoped to the relevant workspace/key; response usage can provide immediate per-call estimates | Provider billing balance if available, otherwise timestamped manual reconciliation |
| Lovable AI gateway | `companion-assistant`, `companion-web-search`, `lead-intelligence`, `crm-draft-outreach`, and `voice-transcribe` | Lovable workspace Cloud/AI billing data if an approved read interface exists; otherwise logged calls and an explicitly labelled estimate | Lovable workspace billing screen or manual entry; the currently connected workspace API read does not expose a balance |
| Google Document AI | Shipment OCR source exists but is disabled pending credentials/deployment | Google Cloud Billing by project and Document AI SKU, or an estimate from processed pages and processor pricing | Cloud billing budget/credits if available; otherwise unknown |
| Higgsfield | Local server-only Seedance example, outside hosted website runtime | Higgsfield billing or local run ledger | Provider billing screen/manual reconciliation |
| OpenAI, xAI/Grok, Copilot | Key storage slots only; no active request path found | No website spend until a call path is enabled | Unknown; show as inactive, not zero balance |

Lovable's Plans & credit usage page now separates Build from Run usage while
some workspaces have a shared credit wallet. The dashboard keeps usage
categories separate; if the workspace has one balance, enter it on only one
Lovable row so it is not presented twice. The actual billing page is
`https://lovable.dev/settings/billing`.

## Data contract

An admin-only provider ledger should hold provider, product, billing period,
currency, provider charge, source (`provider_api`, `response_estimate`, or
`manual`), observed time, and reconciliation time. A separate event aggregate
should hold function name, model, request count, billable count, failures,
input/output tokens or processed pages where returned, and date. Store no
prompts, completions, audio, documents, API keys, or customer identifiers.

Each Edge call should record usage from its response where available, including
every Anthropic tool iteration. Writing telemetry must never change the AI
response or retry a billable call. Reconcile estimates against provider costs
without double counting. Nightly provider pulls must be idempotent and use
server-side credentials only. The UI reads admin-authorized aggregates, never
provider credentials. An integration that is configured but unused remains
`No recorded requests`, while a failed collector is `Data stale`.

## Rollout sequence and gates

1. Deploy `20260926193102_ai_spend_monitoring.sql` after release approval;
   verify admin and non-admin reads/writes. The source migration uses admin RLS,
   a security-invoker daily view, and service-role-only event inserts. Owner
   approval for the source authorization change was given in this chat.
2. Deploy the changed Edge functions and frontend after release approval, then
   run `npm run qa:edge-smoke`. Anthropic, Lovable gateway, and Document AI call
   sites now emit content-free usage events, but no live requests were made for
   testing. The dashboard is an accordion under Settings > Integrations > AI
   spend. Manual billing snapshots drive balance, fill, and top-up projections.
3. Connect supported provider cost reports with read-only billing credentials
   approved for the purpose. Credential/permission changes require owner approval.
4. Reconcile the first complete billing period. The current forecast is shown
   only when an administrator enters a balance and 30-day usage within seven
   days; its source and freshness are visible. Provider cost per request is
   unavailable until a charge is entered or reported.

Existing historical spend cannot be reconstructed from the website: the
repository has no AI usage ledger. The initial 30-day average must therefore
come from a provider's historical cost report, or remain unknown until enough
days have been observed. A Lovable workspace connector read currently returns
plan and project metadata but no credit balance.
