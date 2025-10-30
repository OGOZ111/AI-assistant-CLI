import express from "express";
import OpenAI from "openai";
import { getSupabase } from "../config/connectDB.js";

const router = express.Router();

// Helper to init OpenAI client
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

// Simple language detection using our lightweight prefixes
function detectLangFromContent(text) {
  const s = String(text || "");
  if (/^\s*EN:\s*/i.test(s) || /^\s*\[en\]/i.test(s)) return "en";
  if (/^\s*FI:\s*/i.test(s) || /^\s*\[fi\]/i.test(s)) return "fi";
  return null;
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

  const {
    query,
    matchCount = 4,
    minSimilarity = 0.5,
    prefer_lang = null,
    exact_lang = false,
  } = req.body || {};
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

    let results = Array.isArray(rpc.data) ? rpc.data.slice() : [];
    if (prefer_lang) {
      const pref = String(prefer_lang).toLowerCase() === "fi" ? "fi" : "en";
      if (exact_lang) {
        results = results.filter(
          (r) => detectLangFromContent(r.content) === pref
        );
      } else {
        // Soft preference: stable re-order so preferred language comes first
        results = results
          .map((r, idx) => ({ r, idx }))
          .sort((a, b) => {
            const la = detectLangFromContent(a.r.content) === pref ? 0 : 1;
            const lb = detectLangFromContent(b.r.content) === pref ? 0 : 1;
            if (la !== lb) return la - lb;
            // Preserve original order from the RPC (already ranked by similarity)
            return a.idx - b.idx;
          })
          .map((x) => x.r);
      }
    }
    if (results.length > matchCount) results = results.slice(0, matchCount);
    return res.json({ results, rpc: rpcName });
  } catch (e) {
    console.error("RAG query error:", e);
    return res.status(500).json({ error: "RAG query failed" });
  }
});

// POST /api/rag/bilingual-ingest
// { text: string, sourceLang?: 'en' | 'fi' }
router.post("/bilingual-ingest", async (req, res) => {
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
      .json({ error: "OPENAI_API_KEY missing for translation/embeddings" });

  const { text, sourceLang = "en" } = req.body || {};
  const raw = String(text || "").trim();
  if (!raw) return res.status(400).json({ error: "text required" });

  const src = sourceLang === "fi" ? "fi" : "en";
  const tgt = src === "en" ? "fi" : "en";
  try {
    // Translate raw -> target language using chat completion
    const prompt = `Translate the following text to ${
      tgt === "fi" ? "Finnish" : "English"
    }. Output ONLY the translation, no quotes, no commentary.`;
    const tr = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      max_tokens: 300,
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: raw },
      ],
    });
    const translated = (tr.choices?.[0]?.message?.content || "").trim();
    if (!translated)
      return res.status(500).json({ error: "translation failed" });

    // Prepare bilingual items with light language tags
    const enText = src === "en" ? raw : translated;
    const fiText = src === "fi" ? raw : translated;
    const items = [{ content: `EN: ${enText}` }, { content: `FI: ${fiText}` }];

    // Embed and insert
    const emb = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: items.map((i) => i.content),
    });
    const rows = items.map((it, idx) => ({
      content: it.content,
      embedding: emb.data[idx].embedding,
    }));
    const table = process.env.RAG_TABLE || "documents";
    const { error, data } = await supabase.from(table).insert(rows).select();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({
      inserted: data?.length ?? rows.length,
      table,
      langs: ["en", "fi"],
    });
  } catch (e) {
    console.error("RAG bilingual-ingest error:", e);
    return res.status(500).json({ error: "bilingual ingest failed" });
  }
});

export default router;
