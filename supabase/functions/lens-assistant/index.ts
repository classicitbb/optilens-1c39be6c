import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createCorsPolicy, getCorsHeaders, handleCorsPreflight, rejectDisallowedOrigin } from "../_shared/http/cors.ts";
import { requireAuthenticatedUser } from "../_shared/http/auth.ts";

const corsPolicy = createCorsPolicy();

const SYSTEM_PROMPT = `You are Classic Visions' AI lens specialist assistant. You help customers choose the right prescription lenses and answer technical questions about optical products.

Your expertise includes:
- Single vision, bifocal, and progressive lenses
- Lens materials (CR-39, polycarbonate, high-index 1.67/1.74)
- Lens coatings (anti-reflective, scratch-resistant, blue light filtering, photochromic)
- Lens designs (spherical, aspheric, freeform digital)
- Prescription interpretation (SPH, CYL, AXIS, ADD, PD)
- UV protection and eye health

Available products in our catalog:
1. CR-39 Single Vision ($12.50) - Standard finished lens with 1.50 index, UV protection, scratch-resistant
2. Polycarbonate Single Vision ($18.00) - Impact-resistant, 1.59 index, UV protection
3. High-Index 1.67 SV ($45.00) - Thin and lightweight for higher prescriptions, aspheric design
4. Progressive Digital FreeForm ($85.00) - Premium digital progressive with wide reading zone, FreeForm technology
5. Bifocal FT-28 ($22.00) - Classic flat-top bifocal with 28mm segment
6. Photochromic SV ($55.00) - Light-adaptive polycarbonate lens

Guidelines:
- Be helpful, friendly, and professional
- Provide accurate technical information
- Recommend products based on customer needs
- If unsure about medical advice, recommend consulting an eye care professional
- Keep responses concise but informative
- Use bullet points for clarity when listing features or recommendations`;

serve(async (req) => {
  const preflight = handleCorsPreflight(req, corsPolicy);
  if (preflight) return preflight;

  const corsHeaders = getCorsHeaders(req, corsPolicy);
  const originBlocked = rejectDisallowedOrigin(req, corsPolicy);
  if (originBlocked) return originBlocked;

  try {
    const authContext = await requireAuthenticatedUser(req, corsHeaders);
    if (authContext instanceof Response) {
      return authContext;
    }

    const { messages } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Service temporarily unavailable." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Failed to get AI response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Lens assistant error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
