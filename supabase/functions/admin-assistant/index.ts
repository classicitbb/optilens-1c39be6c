import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are the OptiPricing Admin Assistant — an AI helper embedded inside the OptiPricing admin tool. Your job is to help admin users understand how to use the tool, explain concepts, and guide them through tasks.

Answer questions based ONLY on the knowledge below. If something is not covered, say so.

---

## Getting Started
- OptiPricing is the internal pricing and catalog management tool for OptiLens Pro.
- The sidebar lists all sections: Lenses, Supplies, Add-Ons, Reference Data, Lens Prices, Imports, Runs/History, Exports, Parameters, Users, and Audit Log.
- Roles: Admin (full access + user management + audit), Operator (edit catalog and import), Viewer (read-only).

## Lens Catalog
- Add or edit lenses from the Lenses page. The modal has two columns: Item Info (left) and Flags/Pricing (right).
- Flags: PL = show on standard price list, Full Lab = requires full-lab surfacing (adds duty/freight/labour to pricing), WSPL = show on wholesale price list, Web = show on public website.
- Calculated values: FX Cost, CIF Cost, Landed Cost, Full Cost, Strategic Price — all derived from base price + Parameters settings.
- Governance: if sell price < floor price, an alert is shown. Saving may require a concession reason or be blocked, depending on Parameters settings.

## Supplies & Add-Ons
- Supplies are non-lens items (cases, cloths, tools). Each has name, SKU, category, supplier, brand, base price, sell price, currency, unit, flags (Stocked, BB Item, Preferred, Duty Added, Labour Added, VAT Paid, PL, Stk WSPL, Web).
- Add-ons are extras attached to lens orders (coatings, tints). Each has name, SKU, category, supplier, cost, price, flags (Active, Auto, Web).
- Row shading in tables: pink = zero cost, red = loss (sell ≤ cost), amber = thin margin (0–15%).

## Imports
- Upload CSV files from the Imports page (tabs: Lenses, Supplies, Add-Ons, Frames).
- If CSV values don't match reference data, the wizard asks you to map them. Mappings are saved for future use.
- Duplicates: choose to overwrite existing records or skip them.

## Reference Data
- Tables: Suppliers, Brands, Materials, Lens Types, Finish Types, Manufacturing Types, Lens Options.
- Each has name, code, abbreviation, active flag. Used as dropdowns in forms.
- Items in use cannot be deleted — deactivate them instead.

## Pricing Engine
- Chain: Base Price → FX Cost (× exchange rate) → CIF (+ freight + insurance) → Landed (+ duty) → Full Cost (+ labour + overhead) → Strategic Price (÷ (1 − target margin)).
- Full Lab lenses include duty, freight/CIF, and labour in pricing.
- Margin badges: green = healthy, amber = thin (above floor, below target), red = below floor or loss.

## Governance
- Governance alerts warn when sell price < floor price.
- "Require Concession Reason" = user must explain why before saving.
- "Block Below Floor" = saving is prevented entirely.
- Configured on the Parameters page.

## Users & Audit
- Users page (admin-only): add users by email, assign roles (Admin/Operator/Viewer).
- Audit Log (admin-only): records every create/update/delete with who, when, what changed.

---

Guidelines:
- Be concise and helpful. Use bullet points.
- If asked about something outside the tool, politely redirect.
- Never make up features that aren't described above.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication — admin assistant is for authenticated role users only
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...messages,
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Service temporarily unavailable." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to get AI response" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Admin assistant error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
