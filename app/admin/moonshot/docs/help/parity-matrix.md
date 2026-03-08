# Moonshot Help Content Parity Matrix

Use this matrix to track Bloom-to-Moonshot help content parity and publishing progress.

## Column Definitions

| Column | Description |
| --- | --- |
| Bloom resource/article title | Original Bloom article title or canonical topic name. |
| Bloom URL slug (or identifier) | Bloom URL slug, article ID, or other stable identifier. |
| Moonshot module + route | Moonshot module name and target route. |
| Article type | One of: `overview`, `how-to`, `faq`, `troubleshooting`, `glossary`. |
| Priority | One of: `P0`, `P1`, `P2`. |
| Status | One of: `not-started`, `draft`, `reviewed`, `published`. |

---

## Dashboard

| Bloom resource/article title | Bloom URL slug (or identifier) | Moonshot module + route | Article type | Priority | Status |
| --- | --- | --- | --- | --- | --- |
| Dashboard Overview | dashboard-overview | Dashboard — `/admin/moonshot/dashboard` | overview | P0 | not-started |
| Reading Dashboard KPIs | dashboard-kpi-walkthrough | Dashboard — `/admin/moonshot/dashboard` | how-to | P0 | not-started |
| Dashboard Metrics FAQ | dashboard-metrics-faq | Dashboard — `/admin/moonshot/dashboard` | faq | P1 | not-started |

## Workspace

| Bloom resource/article title | Bloom URL slug (or identifier) | Moonshot module + route | Article type | Priority | Status |
| --- | --- | --- | --- | --- | --- |
| Workspace Overview | workspace-overview | Workspace — `/admin/moonshot/workspace` | overview | P0 | not-started |
| Managing Workspace Cards | workspace-manage-cards | Workspace — `/admin/moonshot/workspace` | how-to | P1 | not-started |
| Workspace Terminology | workspace-glossary | Workspace — `/admin/moonshot/workspace` | glossary | P2 | not-started |

## Meetings

| Bloom resource/article title | Bloom URL slug (or identifier) | Moonshot module + route | Article type | Priority | Status |
| --- | --- | --- | --- | --- | --- |
| Meetings Overview | meetings-overview | Meetings — `/admin/moonshot/meetings` | overview | P0 | not-started |
| Create a Meeting Agenda | meetings-create-agenda | Meetings — `/admin/moonshot/meetings/new` | how-to | P0 | not-started |
| Fix Meeting Follow-up Gaps | meetings-followup-troubleshooting | Meetings — `/admin/moonshot/meetings/[meetingId]` | troubleshooting | P1 | not-started |

## Scorecards

| Bloom resource/article title | Bloom URL slug (or identifier) | Moonshot module + route | Article type | Priority | Status |
| --- | --- | --- | --- | --- | --- |
| Scorecards Overview | scorecards-overview | Scorecards — `/admin/moonshot/scorecards` | overview | P0 | not-started |
| Configure Weekly Scorecards | scorecards-weekly-setup | Scorecards — `/admin/moonshot/scorecards` | how-to | P0 | not-started |
| Scorecard Data Issues FAQ | scorecards-data-faq | Scorecards — `/admin/moonshot/scorecards` | faq | P1 | not-started |

## Rocks

| Bloom resource/article title | Bloom URL slug (or identifier) | Moonshot module + route | Article type | Priority | Status |
| --- | --- | --- | --- | --- | --- |
| Rocks Overview | rocks-overview | Rocks — `/admin/moonshot/rocks` | overview | P0 | not-started |
| Add and Assign Rocks | rocks-add-assign | Rocks — `/admin/moonshot/rocks` | how-to | P0 | not-started |
| Rocks Completion Troubleshooting | rocks-completion-troubleshooting | Rocks — `/admin/moonshot/rocks` | troubleshooting | P1 | not-started |

## Todos

| Bloom resource/article title | Bloom URL slug (or identifier) | Moonshot module + route | Article type | Priority | Status |
| --- | --- | --- | --- | --- | --- |
| Todos Overview | todos-overview | Todos — `/admin/moonshot/todos` | overview | P0 | not-started |
| Create and Delegate Todos | todos-create-delegate | Todos — `/admin/moonshot/todos` | how-to | P0 | not-started |
| Todo Status FAQ | todos-status-faq | Todos — `/admin/moonshot/todos` | faq | P1 | not-started |

## Issues

| Bloom resource/article title | Bloom URL slug (or identifier) | Moonshot module + route | Article type | Priority | Status |
| --- | --- | --- | --- | --- | --- |
| Issues Overview | issues-overview | Issues — `/admin/moonshot/issues` | overview | P0 | not-started |
| IDS Workflow in Issues | issues-ids-workflow | Issues — `/admin/moonshot/issues` | how-to | P0 | not-started |
| Escalation Troubleshooting | issues-escalation-troubleshooting | Issues — `/admin/moonshot/issues` | troubleshooting | P1 | not-started |

## Business Plan

| Bloom resource/article title | Bloom URL slug (or identifier) | Moonshot module + route | Article type | Priority | Status |
| --- | --- | --- | --- | --- | --- |
| Business Plan Overview | business-plan-overview | Business Plan — `/admin/moonshot/business-plan` | overview | P0 | not-started |
| Build a Quarterly Plan | business-plan-quarterly-howto | Business Plan — `/admin/moonshot/business-plan` | how-to | P0 | not-started |
| Business Plan Terms | business-plan-glossary | Business Plan — `/admin/moonshot/business-plan` | glossary | P1 | not-started |

## Tools

| Bloom resource/article title | Bloom URL slug (or identifier) | Moonshot module + route | Article type | Priority | Status |
| --- | --- | --- | --- | --- | --- |
| Tools Hub Overview | tools-overview | Tools — `/admin/moonshot/tools` | overview | P1 | not-started |
| Run a One-on-One | tools-one-on-ones-howto | Tools — `/admin/moonshot/tools/one-on-ones` | how-to | P1 | not-started |
| Right Person Right Seat FAQ | tools-rprs-faq | Tools — `/admin/moonshot/tools/right-person-right-seat` | faq | P2 | not-started |

## Users

| Bloom resource/article title | Bloom URL slug (or identifier) | Moonshot module + route | Article type | Priority | Status |
| --- | --- | --- | --- | --- | --- |
| Users Overview | users-overview | Users — `/admin/moonshot/Users` | overview | P1 | not-started |
| Add and Manage User Access | users-manage-access | Users — `/admin/moonshot/Users` | how-to | P1 | not-started |
| User Permission Errors | users-permission-troubleshooting | Users — `/admin/moonshot/Users` | troubleshooting | P1 | not-started |

## Settings / Resources

| Bloom resource/article title | Bloom URL slug (or identifier) | Moonshot module + route | Article type | Priority | Status |
| --- | --- | --- | --- | --- | --- |
| Settings Overview | settings-overview | Settings — `/admin/moonshot/settings` | overview | P1 | not-started |
| Resource Library Overview | resources-overview | Resources — `/admin/moonshot/resources` | overview | P1 | not-started |
| Configure Team Settings | settings-configure-team-howto | Settings — `/admin/moonshot/settings` | how-to | P1 | not-started |

---

## Required-Field Completion Checklist

An article **cannot** be considered complete (`reviewed` or `published`) unless all required fields are present:

- [ ] Preconditions
- [ ] Step-by-step instructions
- [ ] Expected outcome
- [ ] Common mistakes
- [ ] Related links
