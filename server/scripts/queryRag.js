import dotenv from "dotenv";
import OpenAI from "openai";
import { initSupabase } from "../config/connectDB.js";

dotenv.config();

function parseArg(name, def = undefined) {
  const i = process.argv.indexOf(name);
  if (i !== -1 && i + 1 < process.argv.length) return process.argv[i + 1];
  return def;
}

async function main() {
  const q = parseArg("--q", "What did Luke build with React and Express?");
  const matchCount = Number(parseArg("--k", 4));
  const minSim = Number(parseArg("--min", 0.3));

  const supabase = initSupabase();
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!supabase) throw new Error("Supabase not configured");
  if (!openaiKey) throw new Error("OPENAI_API_KEY missing");
  const openai = new OpenAI({ apiKey: openaiKey });

  console.log(`Query: ${q}`);
  const emb = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: q,
  });
  const queryEmbedding = emb.data[0].embedding;
  let rpc = await supabase.rpc("match_documents", {
    query_embedding: queryEmbedding,
    match_count: matchCount,
    min_similarity: minSim,
  });
  if (rpc.error) {
    rpc = await supabase.rpc("match_kb_chunks", {
      query_embedding: queryEmbedding,
      match_count: matchCount,
      min_similarity: minSim,
    });
  }
  if (rpc.error) throw new Error(rpc.error.message);
  const results = rpc.data || [];
  console.log(`Results (${results.length}):`);
  results.forEach((r, i) => {
    const snippet = String(r.content || "")
      .replace(/\s+/g, " ")
      .slice(0, 120);
    console.log(` ${i + 1}. sim=${(r.similarity ?? 0).toFixed(3)}  ${snippet}`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
