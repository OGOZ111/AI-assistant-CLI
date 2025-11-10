-- Enable pgvector (one-time)
create extension if not exists vector;

-- Documents table exists per user
-- create table documents (
--   id bigserial primary key,
--   content text,
--   embedding vector(1536)
-- );

-- Similarity search function for documents
create or replace function match_documents(
  query_embedding vector(1536),
  match_count int,
  min_similarity float
) returns table (
  id bigint,
  content text,
  similarity float
) language sql stable as $$
  select
    d.id,
    d.content,
    1 - (d.embedding <=> query_embedding) as similarity
  from documents d
  where 1 - (d.embedding <=> query_embedding) >= min_similarity
  order by d.embedding <=> query_embedding
  limit match_count
$$;

-- Optional IVFFLAT index for speed (requires ANALYZE after creating)
create index if not exists documents_embedding_ivfflat
  on documents using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

analyze documents;
