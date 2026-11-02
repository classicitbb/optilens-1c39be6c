-- Help content for HR phase 3 (Leave, Income tax, payroll archive packs), and the
-- People and Payroll drafts brought up to date with it. New articles go in as
-- status 'draft' for review, like 20261030143000_seed_hr_help_drafts.sql.
-- The updates only touch rows still in draft whose text has not been edited
-- since, so nothing reviewed or published is overwritten.

UPDATE public.help_articles
SET content = replace(
      replace(content,
        '| IDs & bank | National registration',
        '| Leave | Balances for each leave type, leave taken and booked, and opening balances or corrections. |
| Tax | An estimate of the year''s income tax against PAYE withheld, claims that would lower it, and pay from before the app. |
| IDs & bank | National registration'),
      'People **On leave** are still paid.',
      'The **On leave** status does not change pay by itself: record the leave on the **Leave** page, and unpaid days come off that month''s payroll run.'),
    updated_at = now()
WHERE id = '6b1f3a52-8c1e-4d0a-9f21-0a7d3c5e1001'
  AND status = 'draft'
  AND content LIKE '%People **On leave** are still paid.%';

UPDATE public.help_articles
SET content = replace(
      replace(
        replace(content,
          'Each payslip shows which set of rates it used.',
          '- **Unpaid leave:** approved leave of an unpaid or NIS-benefit type comes off base pay as a negative earning, at base pay per working day of the month, before tax.

NIS, PAYE and the R&R levy are rounded to the nearest dollar. Each payslip shows which set of rates it used.

On a draft run you can type a different amount for NIS, PAYE, the levy or a recurring deduction with the pencil next to it. The payslip then shows *edited* with the calculated figure, and the reset button puts it back. Edited amounts and one-off items survive **Recalculate**.'),
        '| Approved | Locked. Loan balances have been reduced by this month''s repayments. |',
        '| Approved | Locked. Loan balances have been reduced by this month''s repayments, and an archive pack has been saved. |'),
      'The due date is shown under the run''s title.',
      'The due date is shown under the run''s title.

## Archive pack

Approving a run saves a locked zip: the payroll register and payslips as PDF, the same figures with the NIS, PAYE and bank schedules as Excel, and a manifest with a checksum for each file. It cannot be changed or deleted. Download it from the run''s page.'),
    updated_at = now()
WHERE id = '6b1f3a52-8c1e-4d0a-9f21-0a7d3c5e1002'
  AND status = 'draft'
  AND content LIKE '%Each payslip shows which set of rates it used.%'
  AND content NOT LIKE '%## Archive pack%';

UPDATE public.help_articles
SET content = replace(content,
      '6. When the figures are right, press **Approve** and confirm. The run is locked and loan balances are reduced.',
      '6. When the figures are right, press **Approve** and confirm. The run is locked, loan balances are reduced and the archive pack is saved.'),
    updated_at = now()
WHERE id = '6b1f3a52-8c1e-4d0a-9f21-0a7d3c5e1004'
  AND status = 'draft'
  AND content LIKE '%The run is locked and loan balances are reduced.%';

INSERT INTO public.help_articles (id, title, summary, content, page_slug, content_type, visibility, status, space, sort_order, is_active)
VALUES
(
  '6b1f3a52-8c1e-4d0a-9f21-0a7d3c5e1005',
  'Leave: requests, balances and rules',
  'How leave is recorded, approved and counted, and how it affects pay.',
  '## What this page is for

Leave holds every employee''s vacation, sick, maternity, paternity and unpaid leave: what is waiting for approval, what is booked, and how many days each person has left.

## Tabs

| Tab | What it shows |
| --- | --- |
| Requests | Leave **awaiting approval**, then current and upcoming approved leave. |
| Balances | One row per employee. Vacation shows days available today; other types show days taken this year. |
| All leave | Every request, whatever its status. |
| Settings | When balances start, your working days, and the leave types. |

## Leave types

Each type sets:

- **Entitlement:** *earned each year of service* (vacation builds a balance), *per occurrence* (maternity and paternity apply to each case) or *no fixed entitlement* (days are only counted).
- **Days by years of service:** for example 1:15, 5:20 is 15 days after one year and 20 after five.
- **Carry over at most:** unused days that roll into the next year. Blank carries everything.
- **Pay during leave:** *paid by employer*, *unpaid (deducted)* or *unpaid; NIS benefit*.
- **Certificate after:** how many days before a medical certificate is needed. It is a note for whoever approves leave; the app does not enforce it.

The defaults follow Barbados law (Holidays with Pay Act; Family Leave Act, 2025). Change them to match contracts.

## Leave and payroll

Approved leave of an *unpaid* or *NIS benefit* type comes off base pay in that month''s payroll run, at base pay per working day of the month. Paid leave changes nothing. If leave is approved or cancelled after a draft run was calculated, press **Recalculate** on the run. An approved run is never changed.

## Opening balances

Balances count from **Track balances from** in Settings. For days earned before that date, open the employee, go to **Leave** and add a balance adjustment.',
  'finance/leave', 'wiki', 'internal', 'draft', 'wiki', 10, true
),
(
  '6b1f3a52-8c1e-4d0a-9f21-0a7d3c5e1006',
  'Record, approve or decline leave',
  'Book leave for an employee and decide requests waiting for approval.',
  '## Record leave

1. Open **Finance → Leave** and press **Record leave** (or open the employee and use **Leave → Record leave**).
2. Choose the employee and the leave type.
3. Enter the **First day** and **Last day**. **Working days** fills in from your working week; change it for public holidays or half days.
4. Add a reason if useful.
5. Leave **Record as approved** ticked when the leave is already agreed. Untick it to send it to *Awaiting approval*.
6. Press **Save leave**.

## Approve or decline

1. On **Finance → Leave**, the **Requests** tab lists leave *awaiting approval*.
2. Press **Approve** or **Decline** on the row, add a note if you like, and confirm.

Approved leave counts against the balance straight away. Unpaid days come off pay in that month''s payroll run (press **Recalculate** if the draft run already exists).

## Cancel approved leave

Press **Cancel** on the row and confirm. The days go back on the balance. A payroll run that is already approved is not changed.',
  'finance/leave', 'howto', 'internal', 'draft', 'wiki', 20, true
),
(
  '6b1f3a52-8c1e-4d0a-9f21-0a7d3c5e1007',
  'Income tax: yearly estimates',
  'How the yearly income tax estimate is worked out and what to do with it.',
  '## What this page is for

Income tax estimates each employee''s Barbados income tax for the year and compares it with the PAYE withheld, so you can spot refunds, shortfalls and claims they have not made. These are estimates to plan with, not tax returns: employees file their own return in TAMIS by 30 April.

## How it is worked out

- **Income:** payslips for months already paid (approved runs, plus drafts), pay entered from before the app, and the remaining months projected from current pay.
- **Allowances and deductions:** the personal allowance (or the pensioner allowance for a resident over 60 receiving a pension), the spouse allowance, and the claims entered on the employee''s **Tax** tab.
- **Tax:** the lower rate on taxable income up to the band and the upper rate above it, using the rules for that year. The source of the rules is shown on each employee''s Tax tab.

## Columns

| Column | Meaning |
| --- | --- |
| Taxable income | Income for the year after allowances and deductions. |
| Tax for year | Income tax on that taxable income. |
| PAYE withheld | PAYE taken through payroll, plus PAYE from before the app. |
| Refund / owed | PAYE minus tax. *owes* means PAYE fell short. |
| Best unclaimed relief | The claim that would save the most tax this year. |

A note under a name means the figures are incomplete: months before the app were not entered, or some months have no pay figures.

Click a name to open the employee''s Tax tab, with the full working and *Ways to pay less tax*.',
  'finance/tax', 'wiki', 'internal', 'draft', 'wiki', 10, true
),
(
  '6b1f3a52-8c1e-4d0a-9f21-0a7d3c5e1008',
  'Enter an employee''s tax details',
  'Add pay from before the app and the claims that lower an employee''s tax.',
  '## Steps

1. Open **Finance → Income tax**, choose the year and click the employee''s name. Their record opens on the **Tax** tab.
2. Under *Income, PAYE and claims*, for the year the app started, enter **Months paid before the app**, the **Taxable pay** and the **PAYE withheld** in those months from your old payroll records.
3. Enter any claims for the year: trade union dues, a medical examination (age 40 and over), gifts to registered charities, unreimbursed work travel and entertainment, a bonus taken as employer shares, and other taxable income.
4. Tick **Supports a spouse with no income** or **Over 60 and receiving a pension** where they apply.
5. Press **Save tax details**.

## Check

The cards at the top update: taxable income, tax for the year, PAYE withheld and the estimated refund or tax owed. *Ways to pay less tax* lists claims still open, with what each could save.',
  'finance/tax', 'howto', 'internal', 'draft', 'wiki', 20, true
),
(
  '6b1f3a52-8c1e-4d0a-9f21-0a7d3c5e1009',
  'Download a payroll archive pack',
  'Get the locked record of an approved payroll run for your files or the auditors.',
  '## Steps

1. Open **Finance → Payroll** and click an approved or paid run.
2. Find the **Archive pack** card under the totals.
3. Press **Download** on the latest version. A zip is saved to your computer.

## What is in the zip

- The payroll register and every payslip as PDF.
- The same figures in Excel, with the NIS, PAYE and bank schedules.
- A manifest listing each file with its checksum, so you can show nothing was changed.

## If there is no pack

Packs are saved when a run is approved. If that step failed, the card says *No archive pack for this run yet*: press **Create archive pack**. Packs cannot be changed or deleted.',
  'finance/payroll', 'howto', 'internal', 'draft', 'wiki', 30, true
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.help_article_contexts (article_id, context_slug)
VALUES
  ('6b1f3a52-8c1e-4d0a-9f21-0a7d3c5e1005', 'finance/leave'),
  ('6b1f3a52-8c1e-4d0a-9f21-0a7d3c5e1006', 'finance/leave'),
  ('6b1f3a52-8c1e-4d0a-9f21-0a7d3c5e1007', 'finance/tax'),
  ('6b1f3a52-8c1e-4d0a-9f21-0a7d3c5e1008', 'finance/tax'),
  ('6b1f3a52-8c1e-4d0a-9f21-0a7d3c5e1009', 'finance/payroll')
ON CONFLICT (article_id, context_slug) DO NOTHING;
