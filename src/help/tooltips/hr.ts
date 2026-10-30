// Field and button help for the HR pages (People, employee record, Payroll, Leave, Income tax).
// Keep each tip to one or two plain sentences: what the field is for and anything surprising about it.
export const hrTooltips = {
  // People list
  "hr.people.search": "Searches first, last and preferred name, job title, employee number and email.",
  "hr.people.status": "Shows active employees by default. Pick All statuses to include people on leave and former staff.",
  "hr.people.department": "Departments come from what is typed on each employee's Job section.",
  "hr.people.add": "Creates the employee record and opens it, so you can set up pay, pay items and bank details next.",

  // Employee record: profile
  "hr.employee.preferredName": "Shown in lists and page headings instead of the first name when filled in.",
  "hr.employee.employeeNo": "Your own staff number. Optional, and shown next to the name in the People list.",
  "hr.employee.manager": "Who this person reports to. Only used for the People list for now.",
  "hr.employee.employmentType": "Full time, part time, contract or casual. Payroll only runs for monthly salaries so far.",
  "hr.employee.status": "Terminated employees are left out of new payroll runs. On leave alone does not change pay: record the leave on the Leave page.",
  "hr.employee.taxCode": "Your reference for the employee's tax treatment. It does not change the PAYE calculation.",
  "hr.employee.rrLevyExempt": "Tick only if the employee is exempt from the Resilience & Regeneration levy. Payroll then skips the 0.25% levy.",
  "hr.employee.terminationDate": "Set together with the status Terminated. The record and its history are kept.",

  // Compensation
  "hr.compensation.baseAmount": "Gross pay per pay period before any deductions.",
  "hr.compensation.effectiveFrom": "The first day the new pay applies. The current record is closed the day before.",
  "hr.compensation.personalAllowance": "Yearly PAYE allowance. Payroll spreads it over 12 months before working out tax.",
  "hr.compensation.childAllowance": "Yearly child allowance claimed for PAYE, spread over 12 months.",
  "hr.compensation.otherAllowance": "Any other yearly PAYE allowance you claim for this employee, spread over 12 months.",

  // Pay items
  "hr.payItems.amount": "Taken off (deduction) or added (earning) every month until the item is deactivated.",
  "hr.payItems.loanPrincipal": "For a staff loan, enter the amount owed. Each approved payroll run reduces it, and the last instalment is capped at what is left.",
  "hr.payItems.taxable": "Taxable earnings count toward PAYE. NIS and the R&R levy apply to all earnings either way.",
  "hr.payItems.splitAmount": "A fixed amount sent to this account each pay. Leave blank on one split to send it whatever is left.",

  // IDs & bank
  "hr.identity.reveal": "National registration, NIS, TAMIS and bank details stay hidden until you ask. Each reveal is written to the audit log.",

  // Notes
  "hr.notes.category": "Check-ins, commendations and disciplinary notes are kept apart so they are easy to find later.",
  "hr.notes.visibility": "HR only notes are for HR. Mark a note Shared when the employee has seen it or may see it.",

  // Payroll runs
  "hr.payroll.newRun": "Works out every active employee's payslip for the month. Nothing is final until you approve the run.",
  "hr.payroll.month": "The month being paid. Defaults to the month after the latest run.",
  "hr.payroll.payDate": "The day staff are paid. Shown on the run; it does not change the figures.",

  // One payroll run
  "hr.payrollRun.recalculate": "Rebuilds every payslip from the current pay setup and approved leave. Use it after changing pay, pay items, allowances or leave. One-off items and amounts you edited are kept.",
  "hr.payrollRun.approve": "Locks the run, reduces loan balances by this month's repayments and saves the archive pack. It cannot be edited afterwards.",
  "hr.payrollRun.markPaid": "Record that the money has gone out. Do this once the bank transfers are made.",
  "hr.payrollRun.deleteDraft": "Removes this draft and its payslips. Approved runs cannot be deleted.",
  "hr.payrollRun.totals": "NIS, PAYE and the R&R levy here are what you pay to the authorities by the 15th of next month.",
  "hr.payrollRun.oneOff": "Bonuses, overtime or one-time deductions for this month only. They do not carry into next month.",
  "hr.payrollRun.deductions": "NIS, PAYE and the R&R levy are rounded to the nearest dollar. Use the pencil to type a different amount; the calculated figure stays beside it so you can reset.",
  "hr.payrollRun.archive": "A zip of the register, payslips, and statutory and bank schedules, saved when the run is approved. It can't be changed or deleted; keep it for your records.",

  // Leave
  "hr.leave.record": "Records leave for an employee. Leave it ticked as approved when it is already agreed; untick to put it in Awaiting approval.",
  "hr.leave.workingDays": "Worked out from the dates and your working days. Change it for public holidays or half days.",
  "hr.leave.recordApproved": "Ticked, the leave counts straight away against the balance and in payroll. Unticked, it waits under Awaiting approval.",
  "hr.leave.balances": "Vacation shows days available today; other types show days taken this year. Open an employee to see the detail or add an opening balance.",
  "hr.leave.adjustDays": "Positive adds days, negative takes them off. Use it for opening balances and corrections.",
  "hr.leave.basis": "Earned each year of service builds a balance; per occurrence (such as maternity) applies to each case; no fixed entitlement just counts days taken.",
  "hr.leave.payEffect": "Paid leave changes nothing in payroll. Unpaid and NIS-benefit days come off base pay in that month's payroll run.",
  "hr.leave.tiers": "Days a year by length of service, as years:days pairs. 1:15, 5:20 means 15 days after one year and 20 after five.",
  "hr.leave.carryOver": "The most unused days that roll into the next year. Leave blank to carry everything over.",
  "hr.leave.certificate": "How many days of this leave can be taken before a medical certificate is needed. A note for whoever approves leave; the app does not enforce it.",
  "hr.leave.trackingFrom": "Balances are counted from this date. Add an opening balance on each employee for days earned before it.",

  // Income tax
  "hr.tax.year": "The tax year to estimate. Past months use payslips; the rest of the year is projected from current pay.",
  "hr.tax.refund": "Tax for the year minus PAYE withheld. A positive figure is a likely refund; owes means PAYE fell short.",
  "hr.tax.relief": "The claim that would save this employee the most tax this year, if they made it on their return.",
  "hr.tax.openingMonths": "For the year the app started: months paid before the first payroll run here. Enter their pay and PAYE from your old records.",
} as const satisfies Record<`hr.${string}`, string>;
