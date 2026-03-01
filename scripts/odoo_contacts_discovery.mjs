#!/usr/bin/env node

const config = {
  baseUrl: process.env.ODOO_BASE_URL,
  db: process.env.ODOO_DB,
  login: process.env.ODOO_LOGIN,
  password: process.env.ODOO_PASSWORD,
  limit: Number(process.env.ODOO_PREVIEW_LIMIT ?? 25),
};

const ODOO_FIELDS = [
  "id",
  "name",
  "is_company",
  "parent_id",
  "type",
  "email",
  "phone",
  "mobile",
  "street",
  "street2",
  "city",
  "state_id",
  "zip",
  "country_id",
  "vat",
  "website",
  "industry_id",
  "comment",
  "active",
  "create_date",
  "write_date",
];

const LOCAL_MAPPING = {
  id: "external_id",
  name: "name",
  is_company: "is_company",
  parent_id: "parent_id",
  type: "type",
  email: "email",
  phone: "phone",
  street: "street",
  street2: "street2",
  city: "city",
  zip: "zip",
  vat: "tax_id",
  website: "website",
  industry_id: "industry_id",
  comment: "notes",
  active: "is_archived (inverted)",
  create_date: "created_at (derived)",
  write_date: "updated_at (derived)",
  state_id: "state (derived label)",
  country_id: "country / country_code (derived label/code)",
};

async function callJsonRpc(baseUrl, body, sessionId) {
  const response = await fetch(`${baseUrl}/jsonrpc`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(sessionId ? { Cookie: `session_id=${sessionId}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} from ${baseUrl}/jsonrpc`);
  }

  const parsed = await response.json();
  if (parsed.error) {
    throw new Error(parsed.error?.data?.message || parsed.error?.message || "Unknown Odoo RPC error");
  }

  return { data: parsed.result, sessionId: response.headers.get("set-cookie") };
}

function ensureConfig() {
  const missing = Object.entries(config)
    .filter(([key, value]) => (key === "limit" ? false : !value))
    .map(([key]) => key);

  if (missing.length) {
    throw new Error(`Missing required env vars: ${missing.join(", ")}\nSet ODOO_BASE_URL, ODOO_DB, ODOO_LOGIN, ODOO_PASSWORD.`);
  }
}

async function main() {
  ensureConfig();

  const authResponse = await callJsonRpc(config.baseUrl, {
    jsonrpc: "2.0",
    method: "call",
    params: {
      service: "common",
      method: "login",
      args: [config.db, config.login, config.password],
    },
    id: Date.now(),
  });

  const uid = authResponse.data;
  if (!uid) {
    throw new Error("Authentication failed: invalid login/password or access denied.");
  }

  const contactsResponse = await callJsonRpc(config.baseUrl, {
    jsonrpc: "2.0",
    method: "call",
    params: {
      service: "object",
      method: "execute_kw",
      args: [
        config.db,
        uid,
        config.password,
        "res.partner",
        "search_read",
        [["|", ["active", "=", true], ["active", "=", false]]],
        {
          fields: ODOO_FIELDS,
          limit: config.limit,
          order: "write_date desc",
        },
      ],
    },
    id: Date.now() + 1,
  });

  const contacts = contactsResponse.data ?? [];
  const mappedFields = Object.keys(LOCAL_MAPPING);
  const unmapped = ODOO_FIELDS.filter((field) => !mappedFields.includes(field));

  console.log("✅ Odoo connection successful");
  console.log(`✅ Loaded ${contacts.length} contact(s) from res.partner (limit=${config.limit})`);
  console.log(`✅ Mapping coverage: ${mappedFields.length}/${ODOO_FIELDS.length} fields mapped`);

  if (unmapped.length > 0) {
    console.log(`⚠️ Unmapped fields: ${unmapped.join(", ")}`);
  }

  const sample = contacts.slice(0, 5).map((contact) => ({
    id: contact.id,
    name: contact.name,
    is_company: contact.is_company,
    parent_id: Array.isArray(contact.parent_id) ? contact.parent_id[0] : contact.parent_id,
    email: contact.email,
    phone: contact.phone,
    country_id: Array.isArray(contact.country_id) ? contact.country_id[1] : contact.country_id,
    write_date: contact.write_date,
  }));

  console.log("\nPreview (first 5 records):");
  console.log(JSON.stringify(sample, null, 2));

  console.log("\nLocal field mapping:");
  for (const field of ODOO_FIELDS) {
    console.log(`- ${field} -> ${LOCAL_MAPPING[field] ?? "(not mapped)"}`);
  }
}

main().catch((error) => {
  console.error("❌ Odoo discovery failed");
  console.error(error instanceof Error ? `${error.message}${error.cause ? ` | cause: ${error.cause}` : ""}` : String(error));
  process.exit(1);
});
