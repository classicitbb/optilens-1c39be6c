import { OdooClient } from "./client.ts";
import { deadLetter, getConnectionSecret, loadConnection, supabaseAdmin, withBackoff } from "./runtime.ts";
import type { ConflictPolicy, OdooPartner } from "./types.ts";

type ContactRow = Record<string, unknown> & { id: string; updated_at: string };

function mapRemoteToLocal(partner: OdooPartner): Record<string, unknown> {
  return {
    name: partner.name ?? "Unnamed",
    is_company: partner.is_company ?? true,
    email: partner.email ?? "",
    phone: partner.phone ?? "",
    mobile: partner.mobile ?? "",
    website: partner.website ?? "",
    street: partner.street ?? "",
    street2: partner.street2 ?? "",
    city: partner.city ?? "",
    state: Array.isArray(partner.state_id) ? partner.state_id[1] : "",
    zip: partner.zip ?? "",
    country: Array.isArray(partner.country_id) ? partner.country_id[1] : "",
    tax_id: partner.vat ?? "",
    is_archived: partner.active === false,
  };
}

function mapLocalToRemote(contact: Record<string, unknown>): Record<string, unknown> {
  return {
    name: contact.name,
    is_company: contact.is_company,
    email: contact.email,
    phone: contact.phone,
    mobile: contact.mobile,
    website: contact.website,
    street: contact.street,
    street2: contact.street2,
    city: contact.city,
    zip: contact.zip,
    vat: contact.tax_id,
    active: !(contact.is_archived as boolean),
  };
}

function shouldApplyRemote(policy: ConflictPolicy, remoteWriteDate?: string, localUpdatedAt?: string): boolean {
  if (policy === "prefer_odoo") return true;
  if (policy === "prefer_optilens") return false;
  if (policy === "newest_write_date") {
    const remote = remoteWriteDate ? new Date(remoteWriteDate).getTime() : 0;
    const local = localUpdatedAt ? new Date(localUpdatedAt).getTime() : 0;
    return remote >= local;
  }
  return false;
}

export async function pullContacts(connectionId?: string, specificExternalIds?: number[]) {
  const connection = await loadConnection(connectionId);
  const secret = await getConnectionSecret(connection.id);
  const client = new OdooClient({
    baseUrl: connection.base_url,
    db: connection.database_name,
    username: connection.user_identifier ?? "",
    passwordOrToken: secret,
    rpcMode: "jsonrpc",
  });

  const partnerRecords = await withBackoff(() => client.searchReadPartners(connection.pull_cursor, connection.sync_batch_size));
  const partners = Array.isArray(specificExternalIds) && specificExternalIds.length > 0
    ? partnerRecords.filter((partner) => specificExternalIds.includes(Number(partner.id)))
    : partnerRecords;

  let processed = 0;
  let failures = 0;
  let latestCursor = connection.pull_cursor;

  for (const partner of partners) {
    try {
      const externalId = String(partner.id);
      const { data: existingLink } = await supabaseAdmin.from("contact_external_links")
        .select("id,local_contact_id")
        .eq("provider", "odoo")
        .eq("external_model", "res.partner")
        .eq("external_company_id", connection.tenant_key)
        .eq("external_id", externalId)
        .maybeSingle();

      const localPayload = mapRemoteToLocal(partner);
      let localContactId = (existingLink?.local_contact_id as string | undefined);

      if (localContactId) {
        const { data: localCurrent } = await supabaseAdmin.from("contacts").select("updated_at,*").eq("id", localContactId).single();
        if (connection.conflict_policy === "manual_review") {
          await supabaseAdmin.from("contact_sync_manual_review_queue").insert({
            integration_connection_id: connection.id,
            external_id: externalId,
            local_contact_id: localContactId,
            reason: "Conflict policy set to manual review for pull operation",
            remote_payload: partner,
            local_payload: localCurrent ?? {},
          });
        } else if (shouldApplyRemote(connection.conflict_policy, partner.write_date, (localCurrent?.updated_at as string | undefined))) {
          await supabaseAdmin.from("contacts").update(localPayload).eq("id", localContactId);
        }
      } else {
        const { data: created, error: createError } = await supabaseAdmin.from("contacts").insert(localPayload).select("id").single();
        if (createError) throw createError;
        localContactId = created.id as string;
      }

      if (!localContactId) throw new Error("Missing local contact id after pull upsert");

      await supabaseAdmin.from("contact_external_links").upsert({
        local_contact_id: localContactId,
        provider: "odoo",
        external_model: "res.partner",
        external_id: externalId,
        external_company_id: connection.tenant_key,
        external_payload: partner,
        last_pulled_at: new Date().toISOString(),
        last_remote_write_date: partner.write_date ?? null,
      }, { onConflict: "provider,external_model,external_id,external_company_id" });

      processed += 1;
      if (!latestCursor || (partner.write_date && new Date(partner.write_date) > new Date(latestCursor))) {
        latestCursor = partner.write_date ?? latestCursor;
      }
    } catch (error) {
      failures += 1;
      await deadLetter({
        connectionId: connection.id,
        direction: "pull",
        externalId: String(partner.id),
        error,
        sourcePayload: partner as Record<string, unknown>,
      });
    }
  }

  const cursorAdvanced = Boolean(latestCursor && latestCursor !== connection.pull_cursor);
  if (cursorAdvanced) {
    await supabaseAdmin.from("integration_connections").update({
      pull_cursor: latestCursor,
      last_sync_cursor_at: latestCursor,
      updated_at: new Date().toISOString(),
    }).eq("id", connection.id);
  }

  return { processed, failures, cursorAdvanced, latestCursor };
}

export async function pushContacts(connectionId?: string) {
  const connection = await loadConnection(connectionId);
  const secret = await getConnectionSecret(connection.id);
  const client = new OdooClient({
    baseUrl: connection.base_url,
    db: connection.database_name,
    username: connection.user_identifier ?? "",
    passwordOrToken: secret,
  });

  let query = supabaseAdmin.from("contacts").select("*").order("updated_at", { ascending: true }).limit(connection.sync_batch_size);
  if (connection.push_cursor) query = query.gt("updated_at", connection.push_cursor);
  const { data: contacts, error } = await query;
  if (error) throw error;

  let processed = 0;
  let failures = 0;
  let latestCursor = connection.push_cursor;

  for (const contact of (contacts ?? []) as ContactRow[]) {
    try {
      const { data: link } = await supabaseAdmin.from("contact_external_links")
        .select("external_id")
        .eq("provider", "odoo")
        .eq("external_model", "res.partner")
        .eq("external_company_id", connection.tenant_key)
        .eq("local_contact_id", contact.id)
        .maybeSingle();

      if (connection.conflict_policy === "manual_review") {
        await supabaseAdmin.from("contact_sync_manual_review_queue").insert({
          integration_connection_id: connection.id,
          external_id: (link?.external_id as string | null) ?? null,
          local_contact_id: contact.id,
          reason: "Conflict policy set to manual review for push operation",
          local_payload: contact,
        });
        continue;
      }

      if (connection.conflict_policy === "prefer_odoo" && link?.external_id) continue;

      const remotePayload = mapLocalToRemote(contact);
      const remoteId = link?.external_id
        ? Number(link.external_id as string)
        : await withBackoff(() => client.createPartner(remotePayload));

      if (link?.external_id) await withBackoff(() => client.writePartner(remoteId, remotePayload));

      await supabaseAdmin.from("contact_external_links").upsert({
        local_contact_id: contact.id,
        provider: "odoo",
        external_model: "res.partner",
        external_id: String(remoteId),
        external_company_id: connection.tenant_key,
        external_payload: remotePayload,
        last_pushed_at: new Date().toISOString(),
      }, { onConflict: "provider,external_model,external_id,external_company_id" });

      processed += 1;
      if (!latestCursor || new Date(contact.updated_at) > new Date(latestCursor)) latestCursor = contact.updated_at;
    } catch (pushError) {
      failures += 1;
      await deadLetter({
        connectionId: connection.id,
        direction: "push",
        localContactId: contact.id,
        error: pushError,
        sourcePayload: contact,
      });
    }
  }

  const cursorAdvanced = Boolean(latestCursor && latestCursor !== connection.push_cursor);
  if (cursorAdvanced) {
    await supabaseAdmin.from("integration_connections").update({ push_cursor: latestCursor, updated_at: new Date().toISOString() }).eq("id", connection.id);
  }

  return { processed, failures, cursorAdvanced, latestCursor };
}
