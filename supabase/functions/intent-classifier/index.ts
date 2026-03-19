// iOPEX AI FrontDoor — Signal Engine: Intent Classifier
// Classifies free-text employee input into domain + intent + catalog match
// Logs every decision to ai_routing_log (TrustCore audit)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { input, userId, customerId } = await req.json();

    if (!input?.trim()) {
      return new Response(
        JSON.stringify({ error: "Input is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 1. Resolve customer context ──────────────────────────────────
    let resolvedCustomerId = customerId;
    if (!resolvedCustomerId && userId) {
      const { data: customer } = await supabase
        .from("customers")
        .select("id")
        .eq("user_id", userId)
        .single();
      resolvedCustomerId = customer?.id;
    }

    // ── 2. Load catalog for this tenant (for matching) ───────────────
    let catalogContext = "";
    if (resolvedCustomerId) {
      const { data: items } = await supabase
        .from("catalog_items")
        .select("id, name, description, intent_keywords, catalog_id")
        .eq("customer_id", resolvedCustomerId)
        .eq("is_active", true);

      if (items?.length) {
        catalogContext = `\n\nAvailable service catalog items (id | name | keywords):\n` +
          items.map(i =>
            `${i.id} | ${i.name} | ${(i.intent_keywords || []).join(", ")}`
          ).join("\n");
      }
    }

    // ── 3. Call Gemini for classification ────────────────────────────
    const systemPrompt = `You are the Signal Engine for an enterprise AI Digital Front Door.
Your job is to classify employee requests and route them to the right service.

Classify the input into:
- domain: one of "IT", "HR", "Finance", "Operations", "Unknown"
- intent: a short 2-5 word description of what the employee needs
- confidence: 0.0 to 1.0 (how confident you are in the classification)
- catalogMatchId: the catalog item ID that best matches (or null if none)
- escalateToHuman: true if confidence < 0.70 or request is ambiguous/sensitive
- responseText: a friendly 1-2 sentence response to show the employee

Rules:
- Be concise and friendly in responseText — speak to the employee, not about them
- If confidence >= 0.70 and a catalog match exists, tell them their request is being routed
- If confidence < 0.70, ask for clarification
- Never expose technical terms like "workflow", "tenant", "customer_id" to the employee
- If the request involves sensitive HR matters (termination, harassment, medical), set escalateToHuman=true
${catalogContext}

Respond with valid JSON only, no markdown, no explanation.`;

    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const geminiRes = await fetch(`${GEMINI_API_URL}?key=${geminiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: systemPrompt }] },
          { role: "model", parts: [{ text: '{"domain":"' }] },
          { role: "user", parts: [{ text: `Employee request: "${input}"` }] },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 512,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!geminiRes.ok) {
      throw new Error(`Gemini API error: ${geminiRes.status}`);
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
    const promptTokens = geminiData.usageMetadata?.promptTokenCount ?? 0;
    const completionTokens = geminiData.usageMetadata?.candidatesTokenCount ?? 0;

    let classification: {
      domain: string;
      intent: string;
      confidence: number;
      catalogMatchId: string | null;
      escalateToHuman: boolean;
      responseText: string;
    };

    try {
      classification = JSON.parse(rawText);
    } catch {
      // Fallback if JSON parse fails
      classification = {
        domain: "Unknown",
        intent: input.slice(0, 60),
        confidence: 0.5,
        catalogMatchId: null,
        escalateToHuman: true,
        responseText: "I want to make sure I route this correctly. Could you give me a bit more detail about what you need?",
      };
    }

    const latencyMs = Date.now() - startTime;

    // ── 4. Look up catalog match details ─────────────────────────────
    let catalogMatch = null;
    if (classification.catalogMatchId) {
      const { data: matchedItem } = await supabase
        .from("catalog_items")
        .select("id, name, description, icon, estimated_sla_hours, target_system")
        .eq("id", classification.catalogMatchId)
        .single();
      catalogMatch = matchedItem;
    }

    // ── 5. Create employee request if confident ───────────────────────
    let employeeRequest = null;
    if (
      userId &&
      resolvedCustomerId &&
      !classification.escalateToHuman &&
      classification.confidence >= 0.70
    ) {
      const slaHours = catalogMatch?.estimated_sla_hours ?? 48;
      const slaDueAt = new Date(Date.now() + slaHours * 60 * 60 * 1000).toISOString();

      const { data: req } = await supabase
        .from("employee_requests")
        .insert({
          customer_id: resolvedCustomerId,
          submitted_by: userId,
          title: `${classification.intent}`,
          description: input,
          catalog_item_id: catalogMatch?.id ?? null,
          domain: classification.domain,
          status: "submitted",
          sla_due_at: slaDueAt,
          external_system: catalogMatch?.target_system ?? null,
        })
        .select()
        .single();
      employeeRequest = req;
    }

    // ── 6. Log to ai_routing_log (TrustCore audit) ───────────────────
    await supabase.from("ai_routing_log").insert({
      customer_id: resolvedCustomerId,
      user_id: userId ?? null,
      raw_input: input,
      classified_domain: classification.domain,
      classified_intent: classification.intent,
      confidence_score: classification.confidence,
      routing_target: catalogMatch?.id ?? (classification.escalateToHuman ? "human_review" : null),
      model_used: "gemini-2.0-flash",
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      latency_ms: latencyMs,
      escalated_to_human: classification.escalateToHuman,
      escalation_reason: classification.escalateToHuman ? "Low confidence or sensitive request" : null,
      employee_request_id: employeeRequest?.id ?? null,
    });

    // ── 7. Return to client ──────────────────────────────────────────
    return new Response(
      JSON.stringify({
        domain: classification.domain,
        intent: classification.intent,
        confidence: classification.confidence,
        catalogMatch: catalogMatch
          ? { id: catalogMatch.id, name: catalogMatch.name, description: catalogMatch.description, icon: catalogMatch.icon }
          : null,
        escalatedToHuman: classification.escalateToHuman,
        responseText: classification.responseText,
        requestId: employeeRequest?.id ?? null,
        latencyMs,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Intent classifier error:", err);
    return new Response(
      JSON.stringify({
        error: "Classification failed",
        responseText: "Something went wrong. Please try again or browse the catalog.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
