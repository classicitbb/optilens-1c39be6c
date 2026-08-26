/// <reference types="node" />
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const contactsSource = readFileSync(
  resolve(process.cwd(), "src/pages/admin/erp/ContactsPage.tsx"),
  "utf8",
);

describe("Contacts dictation lifecycle", () => {
  it("stops the mounted recorder through the push-to-talk instance", () => {
    expect(contactsSource).toContain("const stopDictation = dictation.stop;");
    expect(contactsSource).toContain("}, [stopDictation]);");
  });
});
