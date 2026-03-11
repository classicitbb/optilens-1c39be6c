# Moonshot tools parity (Org Chart, One-on-Ones, Right Person Right Seat)

This update aligns capability depth across the three Moonshot tools and connects each tool with cross-navigation and help entry points.

## Org Chart (`/admin/moonshot/tools/org-chart`)

Implemented:
- Multi-level hierarchy editing with recursive child seat support.
- Zoom controls, orientation toggle (vertical/horizontal), and level-based collapsing.
- Seat assignment with explicit vacancy states (`filled`, `vacant`, `actively-hiring`, `planned`).
- Print/export workflow via browser print view.

Cross-links:
- Link to One-on-Ones.
- Link to Right Person Right Seat.
- Link to Moonshot Resources help area.

## One-on-Ones (`/admin/moonshot/tools/one-on-ones`)

Implemented:
- Recurring schedules with cadence + anchor date + scheduled time + timezone metadata.
- Talking points section for iterative discussion topics.
- Private notes and shared notes side by side.
- Follow-up todos using action items with ownership, due date, and completion state.

Cross-links:
- Link to Org Chart.
- Link to Right Person Right Seat.
- Link to Moonshot Resources help area.

## Right Person Right Seat (`/admin/moonshot/tools/right-person-right-seat`)

Implemented:
- Role expectations and competency rubric capture on each review.
- Fit scoring via three scored dimensions and computed average fit score.
- Review cadence tracking (`monthly`, `quarterly`, `biannual`).
- Historical snapshots listed chronologically for review history.

Cross-links:
- Link to Org Chart.
- Link to One-on-Ones.
- Link to Moonshot Resources help area.

## In-app help entry points

Help entry points were added in each tool as an "Open help resources" action that routes to `/admin/moonshot/resources`.

The resources page now includes dedicated slug support for:
- `moonshot/tools/org-chart`
- `moonshot/tools/one-on-ones`
- `moonshot/tools/right-person-right-seat`
