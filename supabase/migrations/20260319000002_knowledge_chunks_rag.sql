-- ============================================================
-- iOPEX AI FrontDoor — RAG Knowledge Repository
-- Enables pgvector, creates knowledge_chunks table,
-- and exposes match_knowledge_chunks RPC for similarity search.
-- Every resolved employee workflow is ingested here.
-- ============================================================

-- ── EXTENSION ────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS vector;

-- ── KNOWLEDGE CHUNKS TABLE ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.knowledge_chunks (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    text        NOT NULL DEFAULT 'demo',
  domain       text        NOT NULL,
  source       text        NOT NULL,
  source_type  text        NOT NULL
    CHECK (source_type IN ('system_doc', 'resolved_workflow', 'escalation', 'seed')),
  content      text        NOT NULL,
  embedding    vector(768),           -- Gemini text-embedding-004 (768-dim)
  metadata     jsonb       NOT NULL DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Vector similarity index (IVFFlat — fast ANN for large corpora)
CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_idx
  ON public.knowledge_chunks USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Tenant + domain filter index (pre-filter before vector search)
CREATE INDEX IF NOT EXISTS knowledge_chunks_tenant_domain_idx
  ON public.knowledge_chunks (tenant_id, domain);

-- ── ROW LEVEL SECURITY ───────────────────────────────────────
ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "knowledge_chunks_select"
  ON public.knowledge_chunks FOR SELECT
  USING (true);

CREATE POLICY "knowledge_chunks_insert"
  ON public.knowledge_chunks FOR INSERT
  WITH CHECK (true);

CREATE POLICY "knowledge_chunks_delete"
  ON public.knowledge_chunks FOR DELETE
  USING (true);

-- ── VECTOR SIMILARITY SEARCH RPC ─────────────────────────────
-- Called by query-knowledge-base edge function.
-- Pre-filters by tenant_id + domain before running ANN search.
-- Returns top-K chunks ranked by cosine similarity.
CREATE OR REPLACE FUNCTION public.match_knowledge_chunks(
  query_embedding vector(768),
  match_domain    text,
  match_tenant    text,
  match_count     int DEFAULT 5
)
RETURNS TABLE (
  id          uuid,
  domain      text,
  source      text,
  source_type text,
  content     text,
  metadata    jsonb,
  similarity  float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    id,
    domain,
    source,
    source_type,
    content,
    metadata,
    1 - (embedding <=> query_embedding) AS similarity
  FROM public.knowledge_chunks
  WHERE tenant_id = match_tenant
    AND (match_domain = 'all' OR domain = match_domain)
    AND embedding IS NOT NULL
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;

-- ── GRANT RPC ACCESS ─────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.match_knowledge_chunks TO anon, authenticated, service_role;
