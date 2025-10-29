import express from "express";
import OpenAI from "openai";
import { getSupabase } from "../config/connectDB.js";

const router = express.Router();

function getOpenAI() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  try {
    return new OpenAI({ apiKey: key });
  } catch (e) {
    console.error("OpenAI init error:", e?.message || e);
    return null;
  }
}

// POST /api/rag/ingest
// { items: [{ id?, content: string, metadata?: object }] }
router.post("/ingest", async (req, res) => {
  // Admin guard via static token
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken) {
    return res.status(500).json({
      error: "ADMIN_TOKEN not configured on server",
    });
  }
  const provided = req.header("x-admin-token") || req.query.token;
  if (provided !== adminToken) {
    return res.status(403).json({ error: "Forbidden" });
  }
  const supabase = getSupabase();
  if (!supabase)
    return res.status(500).json({ error: "Supabase not configured" });
  const openai = getOpenAI();
  if (!openai)
    return res
      .status(500)
      .json({ error: "OPENAI_API_KEY missing for embeddings" });

  const { items } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "items[] required" });
  }
  try {
    const texts = items.map((it) => String(it.content ?? ""));
    const embedRes = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: texts,
    });
    const rows = items.map((it, idx) => ({
      content: String(it.content ?? ""),
      embedding: embedRes.data[idx].embedding,
    }));
    const table = process.env.RAG_TABLE || "documents";
    const { data, error } = await supabase.from(table).insert(rows).select();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ inserted: data?.length ?? rows.length, table });
  } catch (e) {
    console.error("RAG ingest error:", e);
    return res.status(500).json({ error: "RAG ingest failed" });
  }
});

// POST /api/rag/query
// { query: string, matchCount?: number, minSimilarity?: number }
router.post("/query", async (req, res) => {
  const supabase = getSupabase();
  if (!supabase)
    return res.status(500).json({ error: "Supabase not configured" });
  const openai = getOpenAI();
  if (!openai)
    return res
      .status(500)
      .json({ error: "OPENAI_API_KEY missing for embeddings" });

  const { query, matchCount = 4, minSimilarity = 0.5 } = req.body || {};
  if (!query) return res.status(400).json({ error: "query required" });
  try {
    const emb = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
    });
    const queryEmbedding = emb.data[0].embedding;
    // Prefer 'match_documents'; fallback to 'match_kb_chunks' if present
    let rpcName = "match_documents";
    let rpc = await supabase.rpc(rpcName, {
      query_embedding: queryEmbedding,
      match_count: matchCount,
      min_similarity: minSimilarity,
    });
    if (rpc.error) {
      rpcName = "match_kb_chunks";
      rpc = await supabase.rpc(rpcName, {
        query_embedding: queryEmbedding,
        match_count: matchCount,
        min_similarity: minSimilarity,
      });
    }
    if (rpc.error) return res.status(500).json({ error: rpc.error.message });
    return res.json({ results: rpc.data || [], rpc: rpcName });
  } catch (e) {
    console.error("RAG query error:", e);
    return res.status(500).json({ error: "RAG query failed" });
  }
});

export default router;
