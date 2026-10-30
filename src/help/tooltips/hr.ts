// Field and button help for the HR pages (People, employee record, Payroll).
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
  "hr.employee.status": "Terminated employees are left out of new payroll runs. On leave employees are still paid.",
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
  "hr.payrollRun.recalculate": "Rebuilds every payslip from the current pay setup. Use it after changing pay, pay items or allowances. One-off items are kept.",
  "hr.payrollRun.approve": "Locks the run and reduces loan balances by this month's repayments. It cannot be edited afterwards.",
  "hr.payrollRun.markPaid": "Record that the money has gone out. Do this once the bank transfers are made.",
  "hr.payrollRun.deleteDraft": "Removes this draft and its payslips. Approved runs cannot be deleted.",
  "hr.payrollRun.totals": "NIS, PAYE and the R&R levy here are what you pay to the authorities by the 15th of next month.",
  "hr.payrollRun.oneOff": "Bonuses, overtime or one-time deductions for this month only. They do not carry into next month.",
} as const satisfies Record<`hr.${string}`, string>;
