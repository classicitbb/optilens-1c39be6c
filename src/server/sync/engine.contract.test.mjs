import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import { buildMappedContact, redactSensitivePayload, resolveContactConflict } from "./engine.mjs";

const odooContact = JSON.parse(fs.readFileSync(new URL("./fixtures/odoo-contact.json", import.meta.url), "utf-8"));
const localContact = JSON.parse(fs.readFileSync(new URL("./fixtures/local-contact.json", import.meta.url), "utf-8"));

const mappingFixture = [
  { externalField: "name", localField: "name" },
  { externalField: "email", localField: "email" },
  { externalField: "phone", localField: "phone" },
  { externalField: "active", localField: "is_archived", transform: "invert_boolean" },
];

test("contract: odoo partner mapping preserves required fields and transforms active flag", () => {
  const result = buildMappedContact(odooContact, mappingFixture);
  assert.equal(result.isValid, true);
  assert.deepEqual(result.missingRequired, []);
  assert.equal(result.mapped.name, "Acme Optical");
  assert.equal(result.mapped.email, "ops@acme.test");
  assert.equal(result.mapped.is_archived, false);
});

test("contract: manual review policy returns manual_review winner", () => {
  const resolution = resolveContactConflict({
    localRecord: localContact,
    externalRecord: odooContact,
    policy: "manual_review",
  });

  assert.equal(resolution.winner, "manual_review");
  assert.equal(resolution.reason, "policy_manual_review");
  assert.equal(resolution.merged.name, "Acme Optical (Local)");
});

test("contract: explicit override wins regardless of baseline conflict policy", () => {
  const resolution = resolveContactConflict({
    localRecord: localContact,
    externalRecord: odooContact,
    policy: "prefer_odoo",
    override: {
      winner: "local",
      actorId: "b53f7e30-e18f-4d61-8f2d-ad35849f1d2a",
    },
  });

  assert.equal(resolution.winner, "local");
  assert.equal(resolution.reason, "manual_override");
  assert.equal(resolution.merged.name, "Acme Optical (Local)");
});

test("contract: pii-safe logging redacts sensitive fields recursively", () => {
  const payload = {
    credential_value: "super-secret",
    nested: {
      apiKey: "abc",
      sync_cursor: "2026-03-01T00:00:00Z",
      contacts: [{ email: "ops@acme.test" }],
    },
    status: "queued",
  };

  const sanitized = redactSensitivePayload(payload);

  assert.equal(sanitized.credential_value, "[REDACTED]");
  assert.equal(sanitized.nested.apiKey, "[REDACTED]");
  assert.equal(sanitized.nested.contacts[0].email, "[REDACTED]");
  assert.equal(sanitized.nested.sync_cursor, "2026-03-01T00:00:00Z");
  assert.equal(sanitized.status, "queued");
});
