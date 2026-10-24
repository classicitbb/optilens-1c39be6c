/** A real ClickUp document shape (the Finance Manual doc's page tree), with two pages' Markdown. */
const SOP_TEMPLATE = [
  "Use this Doc to outline the steps of your process.",
  "",
  "## Roles & Responsibilities",
  "",
  "| **Role** | **Responsibilities** |",
  "| ---| --- |",
  "| \\[Role Name\\]<br>_@mention specific people_ | <br><br><br> |",
  "",
  "## Procedures",
  "1. Step description",
  "    1. 2. 3. ",
  "",
  "![](https://t14334697.p.clickup-attachments.com/t14334697/2a64e92c/idea-management-software.png)",
  "",
  "* * *",
  "",
  "## Approval",
  "",
  "| **Role** | **Name** | **Date** |",
  "| ---| ---| --- |",
  "|  | @mention |  |",
].join("\n");

const page = (id: string, name: string, parent: string | null, content?: string, pages?: unknown[]) => ({
  id,
  name,
  ...(parent ? { parent_page_id: parent } : {}),
  ...(content !== undefined ? { content } : {}),
  ...(pages ? { pages } : {}),
});

export const clickUpFinanceExport = {
  space: { name: "Business Manual" },
  docs: [
    {
      id: "8cmeguh-2354",
      name: "Finance Manual",
      folder: { name: "40000 Finance" },
      pages: [
        page("p694", "FINANCE PROCESS OVERVIEW", null, "Overview of finance.", [
          page("p714", "INCOMING FINANCIAL CONTROLS AR", "p694", "", [
            page("p774", "Importing Daily Invoices to QB", "p714", "Steps.", [page("p14094", "", "p774", "")]),
            page("p794", "Entering Credits not Uploaded", "p714", "Steps."),
          ]),
          page("p5234", "PRICING SYSTEM", "p694", "", [
            page("p5274", "Supplier Cost", "p5234", SOP_TEMPLATE),
            page("p5254", "Price Fixing and Allocation", "p5234", SOP_TEMPLATE),
            page("p12514", "Modifying Pricing", "p5234", "- [ ] Check cost\n- [x] Save"),
          ]),
        ]),
      ],
    },
    { id: "8cmeguh-3074", name: "Index", folder: { name: "10000 Leadership" }, pages: [page("p6734", "Index", null, "Welcome.")] },
    { id: "8cmeguh-9999", name: "Index", folder: { name: "10000 Leadership" }, pages: [page("p1", "Index", null, "Second index page.")] },
  ],
};
