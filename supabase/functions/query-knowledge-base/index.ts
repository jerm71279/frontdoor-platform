/**
 * iOPEX AI FrontDoor — query-knowledge-base
 *
 * RAG query pipeline:
 *   1. Embed the employee's question (Gemini text-embedding-004)
 *   2. Retrieve top-K similar chunks from knowledge_chunks (pgvector)
 *   3. Synthesize a grounded answer via Gemini 2.5 Flash
 *   4. Return answer + source citations
 *
 * Env vars required:
 *   GEMINI_API_KEY       — Google AI Studio key (for embeddings)
 *   LOVABLE_API_KEY      — Lovable AI gateway key (for chat completions)
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
    const { question, domain, tenant_id = "demo" } = await req.json();

    if (!question || !domain) {
      return new Response(
        JSON.stringify({ error: "question and domain are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GEMINI_API_KEY  = Deno.env.get("GEMINI_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const supabaseUrl     = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey     = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // ── 1. EMBED THE QUESTION ─────────────────────────────────
    let queryVector: number[] | null = null;

    if (GEMINI_API_KEY) {
      const embeddingRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "models/text-embedding-004",
            content: { parts: [{ text: question }] },
          }),
        }
      );

      if (embeddingRes.ok) {
        const embeddingData = await embeddingRes.json();
        queryVector = embeddingData.embedding?.values ?? null;
      }
    }

    // ── 2. RETRIEVE RELEVANT CHUNKS ───────────────────────────
    let chunks: any[] = [];

    if (queryVector) {
      // Full vector similarity search
      const { data, error } = await supabase.rpc("match_knowledge_chunks", {
        query_embedding: queryVector,
        match_domain: domain,
        match_tenant: tenant_id,
        match_count: 5,
      });

      if (!error && data) chunks = data;
    } else {
      // Fallback: keyword search when GEMINI_API_KEY is not set
      const keywords = question.split(/\s+/).slice(0, 4).join("%");
      const { data } = await supabase
        .from("knowledge_chunks")
        .select("id, domain, source, source_type, content, metadata")
        .eq("tenant_id", tenant_id)
        .eq("domain", domain)
        .ilike("content", `%${keywords}%`)
        .limit(5);

      chunks = data ?? [];
    }

    // ── 3. SYNTHESIZE ANSWER WITH GEMINI ─────────────────────
    let answer = "";
    const sources: { doc: string; excerpt: string }[] = [];

    if (chunks.length > 0 && LOVABLE_API_KEY) {
      const context = chunks
        .map((c: any, i: number) => `[${i + 1}] Source: ${c.source}\n${c.content}`)
        .join("\n\n---\n\n");

      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content:
                `You are an enterprise knowledge assistant for the ${domain} domain at Acme Corp. ` +
                `Answer the employee's question concisely and accurately using ONLY the provided knowledge base context. ` +
                `Be direct and actionable. Include specific details (URLs, names, numbers, deadlines) from the context. ` +
                `If the context comes from a resolved ticket, say so. ` +
                `If the answer is not fully covered, state what you know and note what's missing. ` +
                `Do not make up information.`,
            },
            {
              role: "user",
              content: `Question: ${question}\n\nKnowledge Base Context:\n${context}`,
            },
          ],
          temperature: 0.2,
          max_tokens: 450,
        }),
      });

      if (aiRes.ok) {
        const aiData = await aiRes.json();
        answer = aiData.choices?.[0]?.message?.content ?? "";
      }

      // Build citations from top 3 chunks
      for (const chunk of chunks.slice(0, 3)) {
        sources.push({
          doc: chunk.source,
          excerpt: chunk.content.slice(0, 130) + (chunk.content.length > 130 ? "…" : ""),
        });
      }
    } else if (chunks.length > 0) {
      // No LLM key — return the best chunk verbatim
      answer = chunks[0].content;
      sources.push({
        doc: chunks[0].source,
        excerpt: chunks[0].content.slice(0, 130) + "…",
      });
    }

    return new Response(
      JSON.stringify({
        answer,
        sources,
        domain,
        chunks_retrieved: chunks.length,
        grounded: chunks.length > 0,
        vector_search: !!queryVector,
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
