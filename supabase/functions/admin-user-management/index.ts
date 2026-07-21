import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { createCorsPolicy, getCorsHeaders, handleCorsPreflight, rejectDisallowedOrigin } from "../_shared/http/cors.ts";
import { requirePrivilegedAccess } from "../_shared/http/auth.ts";

/**
 * Fires the customer-onboarding function for a newly created user.
 * This assigns the default template pricelist and sends the welcome email.
 * Failures are logged but do NOT block the primary create/invite response.
 */
async function triggerCustomerOnboarding(
  req: Request,
  userId: string,
  email: string,
  displayName?: string,
): Promise<void> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return;

  // Build the internal function URL from the project URL
  const onboardingUrl = `${supabaseUrl}/functions/v1/customer-onboarding`;

  try {
    const resp = await fetch(onboardingUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Forward the caller's auth token so requirePrivilegedAccess passes
        "Authorization": req.headers.get("Authorization") ?? "",
        "x-admin-auth-token": req.headers.get("x-admin-auth-token") ?? "",
        "Origin": req.headers.get("Origin") ?? "",
      },
      body: JSON.stringify({ userId, email, displayName }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.warn("customer-onboarding: non-OK response", { status: resp.status, body: text });
    } else {
      const result = await resp.json();
      console.log("customer-onboarding: completed", result);
    }
  } catch (err) {
    console.error("customer-onboarding: fetch failed", err instanceof Error ? err.message : err);
  }
}

const corsPolicy = createCorsPolicy({
  allowHeaders: "authorization, x-admin-auth-token, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  allowMethods: "POST, OPTIONS",
});

const DEFAULT_PASSWORD_REDIRECT_ORIGIN = "https://classicvisions.lovable.app";

const jsonResponse = (req: Request, status: number, payload: unknown) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...getCorsHeaders(req, corsPolicy), "Content-Type": "application/json" },
  });

const getPasswordRedirectTo = (req: Request) => {
  const requestOrigin = req.headers.get("origin")?.trim();
  const origin = requestOrigin && corsPolicy.allowedOrigins.has(requestOrigin)
    ? requestOrigin
    : DEFAULT_PASSWORD_REDIRECT_ORIGIN;

  return `${origin}/reset-password`;
};

async function linkCustomerPortalAccount(
  adminClient: ReturnType<typeof createClient>,
  userId: string,
  customerId: number | undefined,
  displayName?: string,
  contactId?: string,
) {
  if (!customerId) return;

  const { data: customer, error: customerError } = await (adminClient.from("customers") as any)
    .select("id,contact_id,innovations_customer_id")
    .eq("id", customerId)
    .maybeSingle();
  if (customerError) throw customerError;
  if (!customer) throw new Error("The selected ERP customer no longer exists.");

  let resolvedContactId = customer.contact_id ?? null;
  if (contactId) {
    const { data: contact, error: contactError } = await (adminClient.from("contacts") as any)
      .select("id,parent_id,is_company,linked_customer_id,innovations_parent_customer_id")
      .eq("id", contactId)
      .maybeSingle();
    if (contactError) throw contactError;
    if (!contact) throw new Error("The selected contact no longer exists.");

    const belongsDirectly =
      contact.id === customer.contact_id ||
      contact.parent_id === customer.contact_id ||
      contact.linked_customer_id === customer.id ||
      (customer.innovations_customer_id && contact.innovations_parent_customer_id === customer.innovations_customer_id);

    const contactUpdates: Record<string, unknown> = {};
    if (contact.is_company) {
      if (!belongsDirectly) {
        throw new Error("The selected company contact is not linked to this ERP customer.");
      }
    } else {
      contactUpdates.linked_customer_id = customer.id;
      if (customer.innovations_customer_id) {
        contactUpdates.innovations_parent_customer_id = customer.innovations_customer_id;
      }
      if (customer.contact_id && contact.parent_id !== customer.contact_id && customer.contact_id !== contact.id) {
        const { data: companyContact, error: companyContactError } = await (adminClient.from("contacts") as any)
          .select("id,is_company")
          .eq("id", customer.contact_id)
          .maybeSingle();
        if (companyContactError) throw companyContactError;
        if (!companyContact?.is_company) {
          throw new Error("The selected ERP customer is not linked to a company contact.");
        }
        contactUpdates.parent_id = customer.contact_id;
      }
    }

    if (Object.keys(contactUpdates).length > 0) {
      const { error: contactUpdateError } = await (adminClient.from("contacts") as any)
        .update(contactUpdates)
        .eq("id", contact.id);
      if (contactUpdateError) throw contactUpdateError;
    }

    resolvedContactId = contact.id;
  }

  const { data: existingRole, error: roleLookupError } = await (adminClient.from("user_roles") as any)
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (roleLookupError) throw roleLookupError;

  const roleWrite = existingRole
    ? (adminClient.from("user_roles") as any).update({ role: "customer" }).eq("id", existingRole.id)
    : (adminClient.from("user_roles") as any).insert({ user_id: userId, role: "customer" });
  const { error: roleError } = await roleWrite;
  if (roleError) throw roleError;

  const profilePayload: Record<string, unknown> = {
    user_id: userId,
    crm_customer_id: customer.id,
    crm_contact_id: resolvedContactId,
  };
  if (displayName?.trim()) profilePayload.full_name = displayName.trim();
  const { error: profileError } = await (adminClient.from("profiles") as any)
    .upsert(profilePayload, { onConflict: "user_id" });
  if (profileError) throw profileError;
}

const allowedActions = new Set([
  "list-users",
  "reset-password",
  "set-password",
  "invite-user",
  "create-user",
  "link-customer-portal-account",
]);

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req, corsPolicy);
  if (preflight) return preflight;

  const corsHeaders = getCorsHeaders(req, corsPolicy);
  const originBlocked = rejectDisallowedOrigin(req, corsPolicy);
  if (originBlocked) return originBlocked;

  if (req.method !== "POST") {
    return jsonResponse(req, 405, { error: "Method not allowed" });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authContext = await requirePrivilegedAccess(req, corsHeaders, {
      allowedRoles: ["admin"],
      sourceFunction: "admin-user-management",
    });
    if (authContext instanceof Response) {
      return authContext;
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const body = await req.json();
    const { action } = body;
    if (!allowedActions.has(action)) {
      return jsonResponse(req, 400, { error: "Unknown action" });
    }

    if (action === "list-users") {
      const {
        data: { users },
        error,
      } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
      if (error) throw error;
      const result = users.map((u) => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        email_confirmed_at: u.email_confirmed_at,
      }));
      return jsonResponse(req, 200, result);
    }

    if (action === "reset-password") {
      const { email } = body;
      if (!email) {
        return jsonResponse(req, 400, { error: "Email is required" });
      }

      const { error } = await adminClient.auth.admin.generateLink({
        type: "recovery",
        email,
        options: {
          redirectTo: getPasswordRedirectTo(req),
        },
      });
      if (error) throw error;
      return jsonResponse(req, 200, { success: true });
    }

    if (action === "set-password") {
      const { userId, password } = body;
      if (!userId || !password) {
        return jsonResponse(req, 400, { error: "userId and password are required" });
      }
      if (password.length < 8) {
        return jsonResponse(req, 400, { error: "Password must be at least 8 characters" });
      }
      const { error } = await adminClient.auth.admin.updateUserById(userId, {
        password,
      });
      if (error) {
        const msg = error.message ?? "";
        if (/weak|pwned|compromised|easy to guess/i.test(msg)) {
          return jsonResponse(req, 400, { error: msg || "Password is too weak. Please choose a stronger password." });
        }
        throw error;
      }
      return jsonResponse(req, 200, { success: true });
    }

    if (action === "invite-user") {
      const { email, customerId, displayName, contactId } = body;
      if (!email) {
        return jsonResponse(req, 400, { error: "Email is required" });
      }
      if (customerId !== undefined && (!Number.isInteger(customerId) || customerId <= 0)) {
        return jsonResponse(req, 400, { error: "customerId must be a positive integer" });
      }
      if (customerId) {
        const { data: customer, error: customerError } = await (adminClient.from("customers") as any)
          .select("id")
          .eq("id", customerId)
          .maybeSingle();
        if (customerError) throw customerError;
        if (!customer) return jsonResponse(req, 404, { error: "The selected ERP customer no longer exists" });
      }
      const { data: inviteData, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
        redirectTo: getPasswordRedirectTo(req),
      });
      if (error) {
        const msg = error.message ?? "";
        if (/already been registered|already registered|already exists/i.test(msg)) {
          // User already exists — link them to the customer (if provided) and send a recovery email
          const { data: list } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
          const existing = list?.users?.find((u) => u.email?.toLowerCase() === String(email).toLowerCase());
          if (!existing) {
            return jsonResponse(req, 409, { error: "A user with this email already exists." });
          }
          await linkCustomerPortalAccount(adminClient, existing.id, customerId, displayName, contactId);
          await adminClient.auth.admin.generateLink({
            type: "recovery",
            email,
            options: { redirectTo: getPasswordRedirectTo(req) },
          });
          return jsonResponse(req, 200, { success: true, alreadyExisted: true, userId: existing.id });
        }
        throw error;
      }

      if (inviteData?.user?.id) {
        await linkCustomerPortalAccount(adminClient, inviteData.user.id, customerId, displayName, contactId);
      }

      // Trigger onboarding: assign default pricelist + send welcome email
      if (inviteData?.user?.id) {
        await triggerCustomerOnboarding(req, inviteData.user.id, email, displayName);
      }

      return jsonResponse(req, 200, { success: true, userId: inviteData?.user?.id });
    }

    if (action === "create-user") {
      const { email, password, displayName, customerId, contactId } = body;
      if (!email || !password) {
        return jsonResponse(req, 400, { error: "Email and password are required" });
      }
      if (password.length < 8) {
        return jsonResponse(req, 400, { error: "Password must be at least 8 characters" });
      }
      if (customerId !== undefined && (!Number.isInteger(customerId) || customerId <= 0)) {
        return jsonResponse(req, 400, { error: "customerId must be a positive integer" });
      }
      if (customerId) {
        const { data: customer, error: customerError } = await (adminClient.from("customers") as any)
          .select("id")
          .eq("id", customerId)
          .maybeSingle();
        if (customerError) throw customerError;
        if (!customer) return jsonResponse(req, 404, { error: "The selected ERP customer no longer exists" });
      }
      const { data: newUser, error } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (error) {
        const msg = error.message ?? "";
        if (/already been registered|already registered|already exists/i.test(msg)) {
          // User already exists — link them to the customer instead of failing.
          const { data: list } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
          const existing = list?.users?.find((u) => u.email?.toLowerCase() === String(email).toLowerCase());
          if (existing) {
            await linkCustomerPortalAccount(adminClient, existing.id, customerId, displayName, contactId);
            return jsonResponse(req, 200, { success: true, alreadyExisted: true, userId: existing.id });
          }
          return jsonResponse(req, 409, { error: "A user with this email already exists." });
        }
        if (/weak|pwned|compromised|easy to guess/i.test(msg)) {
          return jsonResponse(req, 400, { error: msg || "Password is too weak. Please choose a stronger password." });
        }
        throw error;
      }
      if (newUser?.user) {
        await linkCustomerPortalAccount(adminClient, newUser.user.id, customerId, displayName, contactId);
        if (displayName) {
          await (adminClient.from("profiles") as any)
            .update({ display_name: displayName })
            .eq("user_id", newUser.user.id);
        }
      }

      // Trigger onboarding: assign default pricelist + send welcome email
      if (newUser?.user?.id) {
        await triggerCustomerOnboarding(req, newUser.user.id, email, displayName);
      }

      return jsonResponse(req, 200, { success: true, userId: newUser?.user?.id });
    }

    if (action === "link-customer-portal-account") {
      const { userId, customerId, contactId, displayName } = body;
      if (!userId || !Number.isInteger(customerId) || customerId <= 0) {
        return jsonResponse(req, 400, { error: "userId and a valid customerId are required" });
      }
      const { data: existing, error: lookupError } = await adminClient.auth.admin.getUserById(userId);
      if (lookupError) throw lookupError;
      if (!existing?.user) return jsonResponse(req, 404, { error: "The selected login no longer exists" });
      await linkCustomerPortalAccount(adminClient, userId, customerId, displayName, contactId);
      return jsonResponse(req, 200, { success: true });
    }

    return jsonResponse(req, 400, { error: "Unhandled action" });
  } catch (err: unknown) {
    console.error("admin-user-management: unhandled error", err);
    const message = err instanceof Error
      ? err.message
      : typeof err === "string"
      ? err
      : (() => { try { return JSON.stringify(err); } catch { return "Internal error"; } })();
    return jsonResponse(req, 500, { error: message || "Internal error" });
  }
});
