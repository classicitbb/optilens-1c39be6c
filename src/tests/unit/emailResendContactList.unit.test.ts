import { describe, expect, it } from "vitest";
import { parseEmailList, replaceEmailInList } from "../../../supabase/functions/_shared/email/contactEmailList";

describe("replaceEmailInList", () => {
  it("replaces the wrong address in place, keeping the primary position", () => {
    expect(replaceEmailInList("wrong@x.com, other@x.com", "wrong@x.com", "right@x.com")).toBe("right@x.com, other@x.com");
    expect(replaceEmailInList("other@x.com; wrong@x.com", "WRONG@x.com", "right@x.com")).toBe("other@x.com, right@x.com");
  });
  it("does not duplicate an address the contact already has", () => {
    expect(replaceEmailInList("wrong@x.com, Right@x.com", "wrong@x.com", "right@x.com")).toBe("right@x.com");
  });
  it("returns null when the contact does not hold the address", () => {
    expect(replaceEmailInList("other@x.com", "wrong@x.com", "right@x.com")).toBeNull();
    expect(replaceEmailInList(null, "wrong@x.com", "right@x.com")).toBeNull();
    expect(replaceEmailInList("notwrong@x.com", "wrong@x.com", "right@x.com")).toBeNull();
  });
  it("parses the same separators as the CRM editor", () => {
    expect(parseEmailList("a@x.com:b@x.com\nc@x.com")).toEqual(["a@x.com", "b@x.com", "c@x.com"]);
  });
});
