import express, { Request, Response } from "express";
import {
  EmbeddingsResponse,
  ChatCompletionResponse,
  EmbeddingsCreateParams,
  ChatCompletionCreateParams,
} from "../types/openai";
import { getSupabase, callSupabaseRpc } from "../config/connectDB";

const router = express.Router();

type OpenAIClientLike = {
  embeddings: {
    create: (opts: EmbeddingsCreateParams) => Promise<EmbeddingsResponse>;
  };
  chat: {
    completions: {
      create: (
        opts: ChatCompletionCreateParams
      ) => Promise<ChatCompletionResponse>;
    };
  };
};

function getOpenAI(): OpenAIClientLike | null {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;

  const fetchFn = (globalThis as unknown as { fetch?: typeof fetch }).fetch;
  if (!fetchFn) return null;

  const baseHeaders = {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };

  const client: OpenAIClientLike = {
    embeddings: {
      async create(opts: EmbeddingsCreateParams): Promise<EmbeddingsResponse> {
        const res = await fetchFn("https://api.openai.com/v1/embeddings", {
          method: "POST",
          headers: baseHeaders,
          body: JSON.stringify(opts),
        });
        const json = (await res.json()) as EmbeddingsResponse;
        return json;
      },
    },
    chat: {
      completions: {
        async create(
          opts: ChatCompletionCreateParams
        ): Promise<ChatCompletionResponse> {
          const res = await fetchFn(
            "https://api.openai.com/v1/chat/completions",
            {
              method: "POST",
              headers: baseHeaders,
              body: JSON.stringify(opts),
            }
          );
          const json = (await res.json()) as ChatCompletionResponse;
          return json;
        },
      },
    },
  };

  return client;
}

function detectLangFromContent(text: unknown): string | null {
  const s = String(text || "");
  if (/^\s*EN:\s*/i.test(s) || /^\s*\[en\]/i.test(s)) return "en";
  if (/^\s*FI:\s*/i.test(s) || /^\s*\[fi\]/i.test(s)) return "fi";
  return null;
}

type SupabaseMatchRow = {
  id?: string;
  score?: number;
  metadata?: Record<string, unknown> | null;
  content?: string;
};

// POST /api/rag/ingest
// { items: [{ id?, content: string, metadata?: object }] }
router.post("/ingest", async (req: Request, res: Response) => {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken) {
    return res
      .status(500)
      .json({ error: "ADMIN_TOKEN not configured on server" });
  }
  const provided =
    req.header("x-admin-token") ||
    ((req.query as Record<string, unknown>).token as string | undefined);
  if (provided !== adminToken)
    return res.status(403).json({ error: "Forbidden" });

  const supabase = getSupabase();
  if (!supabase)
    return res.status(500).json({ error: "Supabase not configured" });
  const openai = getOpenAI();
  if (!openai)
    return res
      .status(500)
      .json({ error: "OPENAI_API_KEY missing for embeddings" });

  const { items } =
    (req.body as
      | {
          items?: Array<{
            id?: string;
            content?: string;
            metadata?: Record<string, unknown>;
          }>;
        }
      | undefined) || {};
  if (!Array.isArray(items) || items.length === 0)
    return res.status(400).json({ error: "items[] required" });
  try {
    const texts = items.map((it) => String(it.content ?? ""));
    const embedRes = (await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: texts,
    })) as EmbeddingsResponse;
    const rows = items.map((it, idx) => ({
      content: String(it.content ?? ""),
      embedding: embedRes.data[idx].embedding,
    }));
    const table = process.env.RAG_TABLE || "documents";
    const { data, error } = await supabase.from(table).insert(rows).select();
    if (error)
      return res.status(500).json({
        error: (error as { message?: string })?.message ?? String(error),
      });
    return res.json({ inserted: data?.length ?? rows.length, table });
  } catch (e) {
    console.error("RAG ingest error:", e);
    return res.status(500).json({ error: "RAG ingest failed" });
  }
});

// POST /api/rag/query
// { query: string, matchCount?: number, minSimilarity?: number }
router.post("/query", async (req: Request, res: Response) => {
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
  } = (req.body as
    | {
        query?: string;
        matchCount?: number;
        minSimilarity?: number;
        prefer_lang?: string | null;
        exact_lang?: boolean;
      }
    | undefined) || {};
  if (!query) return res.status(400).json({ error: "query required" });
  try {
    const emb = (await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
    })) as EmbeddingsResponse;
    const queryEmbedding = emb.data[0].embedding;
    let rpcName = "match_documents";
    let rpc = await callSupabaseRpc<SupabaseMatchRow[]>(rpcName, {
      query_embedding: queryEmbedding,
      match_count: matchCount,
      min_similarity: minSimilarity,
    });
    if (rpc.error) {
      rpcName = "match_kb_chunks";
      rpc = await callSupabaseRpc<SupabaseMatchRow[]>(rpcName, {
        query_embedding: queryEmbedding,
        match_count: matchCount,
        min_similarity: minSimilarity,
      });
    }
    if (rpc.error) return res.status(500).json({ error: rpc.error.message });

    let results = Array.isArray(rpc.data)
      ? (rpc.data.slice() as SupabaseMatchRow[])
      : [];
    if (prefer_lang) {
      const pref = String(prefer_lang).toLowerCase() === "fi" ? "fi" : "en";
      if (exact_lang) {
        results = results.filter(
          (r) => detectLangFromContent(r.content) === pref
        );
      } else {
        results = results
          .map((r, idx) => ({ r, idx }))
          .sort((a, b) => {
            const la = detectLangFromContent(a.r.content) === pref ? 0 : 1;
            const lb = detectLangFromContent(b.r.content) === pref ? 0 : 1;
            if (la !== lb) return la - lb;
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
router.post("/bilingual-ingest", async (req: Request, res: Response) => {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken)
    return res
      .status(500)
      .json({ error: "ADMIN_TOKEN not configured on server" });
  const provided =
    req.header("x-admin-token") ||
    ((req.query as Record<string, unknown>).token as string | undefined);
  if (provided !== adminToken)
    return res.status(403).json({ error: "Forbidden" });

  const supabase = getSupabase();
  if (!supabase)
    return res.status(500).json({ error: "Supabase not configured" });
  const openai = getOpenAI();
  if (!openai)
    return res
      .status(500)
      .json({ error: "OPENAI_API_KEY missing for translation/embeddings" });

  const { text, sourceLang = "en" } =
    (req.body as { text?: string; sourceLang?: string } | undefined) || {};
  const raw = String(text || "").trim();
  if (!raw) return res.status(400).json({ error: "text required" });

  const src = sourceLang === "fi" ? "fi" : "en";
  const tgt = src === "en" ? "fi" : "en";
  try {
    const prompt = `Translate the following text to ${
      tgt === "fi" ? "Finnish" : "English"
    }. Output ONLY the translation, no quotes, no commentary.`;
    const tr = (await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      max_tokens: 300,
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: raw },
      ],
    })) as ChatCompletionResponse;
    const translated = (tr.choices?.[0]?.message?.content || "").trim();
    if (!translated)
      return res.status(500).json({ error: "translation failed" });

    const enText = src === "en" ? raw : translated;
    const fiText = src === "fi" ? raw : translated;
    const items = [{ content: `EN: ${enText}` }, { content: `FI: ${fiText}` }];

    const emb = (await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: items.map((i) => i.content),
    })) as EmbeddingsResponse;
    const rows = items.map((it, idx) => ({
      content: it.content,
      embedding: emb.data[idx].embedding,
    }));
    const table = process.env.RAG_TABLE || "documents";
    const { error, data } = await supabase.from(table).insert(rows).select();
    if (error)
      return res.status(500).json({
        error: (error as { message?: string })?.message ?? String(error),
      });
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
