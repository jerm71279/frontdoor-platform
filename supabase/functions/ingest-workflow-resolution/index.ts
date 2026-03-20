/**
 * iOPEX AI FrontDoor — ingest-workflow-resolution
 *
 * Called automatically when any employee workflow reaches "completed" status.
 * Chunks the resolution, embeds it (Gemini text-embedding-004),
 * and upserts into knowledge_chunks so future RAG queries benefit from it.
 *
 * Over time: every resolved ticket becomes a cited knowledge source.
 *
 * Env vars required:
 *   GEMINI_API_KEY             — Google AI Studio key (for embeddings)
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      workflow_id,
      domain,
      title,
      resolution,
      steps = [],
      tenant_id = "demo",
      source_type = "resolved_workflow",
    } = await req.json();

    if (!domain || !title) {
      return new Response(
        JSON.stringify({ error: "domain and title are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const supabaseUrl    = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey    = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // ── BUILD CHUNK TEXT ──────────────────────────────────────
    // Format the completed workflow as a natural-language chunk
    // that embeds well and retrieves well for similar future questions.
    const stepText = (steps as any[])
      .filter((s) => s.done)
      .map((s) => `  • ${s.label}${s.time ? ` (${s.time})` : ""}`)
      .join("\n");

    const chunkText = [
      `Request: ${title}`,
      `Domain: ${domain}`,
      resolution ? `Resolution: ${resolution}` : null,
      stepText ? `Steps completed:\n${stepText}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const source = `${workflow_id ?? "REQ-auto"} · resolved ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

    // ── EMBED ─────────────────────────────────────────────────
    let embedding: number[] | null = null;

    if (GEMINI_API_KEY) {
      const embeddingRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "models/text-embedding-004",
            content: { parts: [{ text: chunkText }] },
          }),
        }
      );

      if (embeddingRes.ok) {
        const data = await embeddingRes.json();
        embedding = data.embedding?.values ?? null;
      }
    }

    // ── UPSERT INTO knowledge_chunks ─────────────────────────
    // If this workflow_id was already ingested, delete and re-insert
    // (handles re-runs / corrections).
    if (workflow_id) {
      await supabase
        .from("knowledge_chunks")
        .delete()
        .eq("tenant_id", tenant_id)
        .eq("metadata->>workflow_id", workflow_id);
    }

    const { error } = await supabase.from("knowledge_chunks").insert({
      tenant_id,
      domain,
      source,
      source_type,
      content:   chunkText,
      embedding,
      metadata:  { workflow_id, title },
    });

    if (error) throw error;

    return new Response(
      JSON.stringify({
        ingested: true,
        source,
        domain,
        embedded: !!embedding,
        chunk_length: chunkText.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
