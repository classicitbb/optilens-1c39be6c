const DEFAULT_REQUIRED_FIELDS = ["name", "email"];

export function buildMappedContact(externalRecord, mappings, options = {}) {
  const requiredFields = options.requiredFields ?? DEFAULT_REQUIRED_FIELDS;
  const mapped = {};

  for (const mapping of mappings) {
    const rawValue = externalRecord?.[mapping.externalField];
    if (rawValue === undefined) continue;

    if (mapping.transform === "invert_boolean") {
      mapped[mapping.localField] = !Boolean(rawValue);
      continue;
    }

    mapped[mapping.localField] = rawValue;
  }

  const missingRequired = requiredFields.filter((field) => {
    const value = mapped[field];
    return value === null || value === undefined || value === "";
  });

  return {
    mapped,
    isValid: missingRequired.length === 0,
    missingRequired,
  };
}

export function resolveContactConflict({ localRecord, externalRecord, policy, override }) {
  if (override && override.winner) {
    return {
      winner: override.winner,
      reason: "manual_override",
      merged: override.winner === "external" ? { ...localRecord, ...externalRecord } : { ...externalRecord, ...localRecord },
    };
  }

  if (policy === "prefer_odoo") {
    return {
      winner: "external",
      reason: "policy_prefer_odoo",
      merged: { ...localRecord, ...externalRecord },
    };
  }

  if (policy === "prefer_optilens") {
    return {
      winner: "local",
      reason: "policy_prefer_optilens",
      merged: { ...externalRecord, ...localRecord },
    };
  }

  return {
    winner: "manual_review",
    reason: "policy_manual_review",
    merged: { ...localRecord },
  };
}

const SENSITIVE_KEY_PATTERN = /(password|secret|token|credential|authorization|api[_-]?key|ssn|tax_id|vat|email|phone)/i;

export function redactSensitivePayload(value) {
  if (Array.isArray(value)) {
    return value.map((item) => redactSensitivePayload(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => {
        if (SENSITIVE_KEY_PATTERN.test(key)) {
          return [key, "[REDACTED]"];
        }
        return [key, redactSensitivePayload(nestedValue)];
      }),
    );
  }

  return value;
}
