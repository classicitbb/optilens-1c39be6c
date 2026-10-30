-- Help system phase 1 content pilot: page articles and how-tos for People and Payroll.
-- Inserted as status 'draft' for review; drafts show only to editors in the help panel,
-- marked Draft, until published from Atlas. ON CONFLICT DO NOTHING so re-running never
-- overwrites edits made after review.

INSERT INTO public.help_articles (id, title, summary, content, page_slug, content_type, visibility, status, space, sort_order, is_active)
VALUES
(
  '6b1f3a52-8c1e-4d0a-9f21-0a7d3c5e1001',
  'People: employee records',
  'What the People list and an employee record hold, and who can see them.',
  '## What this page is for

People holds one record per employee: personal and job details, pay, recurring pay items, ID and bank details, and HR notes. Payroll reads its figures from these records.

Only administrators and the office administrator can open People and Payroll.

## The People list

- **Search** matches first, last and preferred name, job title, employee number and email.
- **Status** shows active employees by default. Choose *All statuses* to include people on leave and former staff.
- **Department** lists the departments typed on employee records.
- Click a row to open the employee record.

## The employee record

| Tab | What it holds |
| --- | --- |
| Profile | Personal details, job title, department, manager, employment type, status, hire and termination dates, tax code and the R&R levy exemption. Press **Save profile** to keep changes. |
| Compensation | The current salary and yearly PAYE allowances, plus a history of every pay change. |
| Pay items | Recurring earnings and deductions (for example health insurance or a staff loan) and how net pay is split across bank accounts. |
| IDs & bank | National registration, NIS and TAMIS numbers and bank details. Hidden until you press **Show details**; every reveal is written to the audit log. |
| Notes | Dated notes by category: general, check-in, commendation or disciplinary. |

## Good to know

- Setting the status to **Terminated** keeps the record but leaves the person out of new payroll runs. People **On leave** are still paid.
- A pay change takes effect on its **Effective from** date; the previous pay record is closed the day before automatically.
- The **R&R levy exempt** box removes the 0.25% Resilience & Regeneration levy from that employee''s payslips.',
  'finance/people', 'wiki', 'internal', 'draft', 'wiki', 10, true
),
(
  '6b1f3a52-8c1e-4d0a-9f21-0a7d3c5e1002',
  'Payroll: how monthly payroll works',
  'How payroll runs are calculated, what each status means and when deductions are due.',
  '## What this page is for

Payroll works out each employee''s monthly payslip from their record in People: base salary, recurring pay items, one-off items for the month, NIS, PAYE and the R&R levy. Each month has one payroll run.

## Who is included

Every employee who is not terminated and has a **monthly salary** in effect for the month. Anyone else is listed at the top of the run as *Not in this run* (hourly and non-monthly pay are not supported yet).

## How the deductions are worked out

- **NIS (employee share):** 11% of gross pay, on earnings up to the monthly ceiling of $5,360.
- **PAYE:** taxable pay for the month, less one twelfth of the employee''s yearly allowances, taxed at the lower rate up to one twelfth of the $50,000 annual band and the upper rate above it. From April 2026 the rates are 11.5% and 27.5% (12.5% and 28.5% for January to March 2026).
- **R&R levy:** 0.25% of gross pay, unless the employee is marked exempt.
- **Other deductions:** recurring and one-off deductions. A staff loan instalment is capped at the remaining loan balance.

Each payslip shows which set of rates it used.

## Run statuses

| Status | Meaning |
| --- | --- |
| Draft | Figures can still change. Recalculate after changing anyone''s pay setup; add one-off items from a payslip. |
| Approved | Locked. Loan balances have been reduced by this month''s repayments. |
| Paid | The money has gone out. |

## Deadlines

NIS, PAYE and the R&R levy for a month are due to the authorities by the 15th of the following month. The due date is shown under the run''s title.',
  'finance/payroll', 'wiki', 'internal', 'draft', 'wiki', 10, true
),
(
  '6b1f3a52-8c1e-4d0a-9f21-0a7d3c5e1003',
  'Add an employee',
  'Create a new employee record and get them ready for payroll.',
  '## Steps

1. Open **Finance → People** and press **Add employee**.
2. Enter the first and last name. Job title, department, email and hire date are optional here and can be added later.
3. Press **Add employee**. The new record opens.
4. On **Profile**, fill in the remaining job details (employment type, manager, tax code) and press **Save profile**.
5. On **Compensation**, under *Change pay*, choose **Salary** and **Monthly**, enter the base amount, the **Effective from** date and any yearly allowances, then press **Save pay change**.
6. On **Pay items**, add any recurring deductions or earnings, and set up the net pay split if their pay goes to more than one account (leave the amount blank on one split so it takes the remainder).
7. On **IDs & bank**, press **Show details**, enter their national registration, NIS, TAMIS and bank details, and press **Save details**.

## Check

The employee now appears in the People list as Active, and will be included in the next payroll run for any month on or after their pay''s effective date.',
  'finance/people', 'howto', 'internal', 'draft', 'wiki', 20, true
),
(
  '6b1f3a52-8c1e-4d0a-9f21-0a7d3c5e1004',
  'Run monthly payroll',
  'Create, check, approve and pay a monthly payroll run.',
  '## Before you start

Make sure pay changes, new recurring items and new starters for the month are already entered in **People**.

## Steps

1. Open **Finance → Payroll** and press **New payroll run**.
2. Check the **Month** (it defaults to the month after the latest run), set the **Pay date**, and press **Calculate payroll**. The run opens as a Draft.
3. Read the *Not in this run* line, if shown. Anyone listed has no monthly salary for the month: set up their pay in People, come back and press **Recalculate**.
4. Check the totals and each employee''s line. A warning icon next to a name means something needs a look, such as a loan capped at its balance or a net pay split that could not be paid in full.
5. To add a bonus, overtime or a one-time deduction, click the employee''s name, enter it under *One-off items this month* and press **Add**. The payslip recalculates straight away.
6. When the figures are right, press **Approve** and confirm. The run is locked and loan balances are reduced.
7. Once the bank transfers are made, press **Mark paid**.

## After the run

Pay NIS, PAYE and the R&R levy totals to the authorities by the 15th of the following month (the due date is shown on the run).

## If something is wrong

A Draft run can be recalculated or deleted with **Delete draft**. An approved run cannot be changed.',
  'finance/payroll', 'howto', 'internal', 'draft', 'wiki', 20, true
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.help_article_contexts (article_id, context_slug)
VALUES
  ('6b1f3a52-8c1e-4d0a-9f21-0a7d3c5e1001', 'finance/people'),
  ('6b1f3a52-8c1e-4d0a-9f21-0a7d3c5e1002', 'finance/payroll'),
  ('6b1f3a52-8c1e-4d0a-9f21-0a7d3c5e1003', 'finance/people'),
  ('6b1f3a52-8c1e-4d0a-9f21-0a7d3c5e1004', 'finance/payroll')
ON CONFLICT (article_id, context_slug) DO NOTHING;
