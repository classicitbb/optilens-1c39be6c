import { describe, expect, it } from "vitest";
import { fieldsMatch } from "@/lib/wildcardMatch";
import { CREATE_ACTIVITY_SEARCH_KEYWORDS, CREATE_TICKET_SEARCH_KEYWORDS } from "@/components/admin/globalSearchActions";

describe("global search creation actions", () => {
  it("matches activity creation with task keywords", () => {
    expect(CREATE_ACTIVITY_SEARCH_KEYWORDS).toEqual(["task", "todo", "note", "call"]);
    expect(fieldsMatch("todo", "Create Activity", "CRM", "Actions", ...CREATE_ACTIVITY_SEARCH_KEYWORDS)).toBe(true);
  });

  it("matches ticket creation with support keywords", () => {
    expect(CREATE_TICKET_SEARCH_KEYWORDS).toEqual(["support", "request", "help", "helpdesk", "ticket", "repair", "collection", "collect", "payment", "job", "note", "call", "task"]);
    expect(fieldsMatch("repair", "Create Ticket", "Helpdesk", "Actions", ...CREATE_TICKET_SEARCH_KEYWORDS)).toBe(true);
    expect(fieldsMatch("payment", "Create Ticket", "Helpdesk", "Actions", ...CREATE_TICKET_SEARCH_KEYWORDS)).toBe(true);
    expect(fieldsMatch("job", "Create Ticket", "Helpdesk", "Actions", ...CREATE_TICKET_SEARCH_KEYWORDS)).toBe(true);
  });
});
