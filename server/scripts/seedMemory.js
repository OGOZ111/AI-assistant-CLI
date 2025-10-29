import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import OpenAI from "openai";
import { initSupabase, getSupabase } from "../config/connectDB.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function readJson(rel) {
  const p = path.resolve(__dirname, "..", rel);
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function toChunks(memory, langTag = "en") {
  const items = [];
  const push = (text) => {
    const t = String(text || "").trim();
    if (t) items.push(`[${langTag}] ` + t);
  };
  push(`${memory.name} — ${memory.role} — Based in ${memory.based_in}`);
  push(`Skills: ${memory.skills?.join(", ")}`);
  (memory.projects || []).forEach((p) => {
    push(`Project: ${p.name}. ${p.description}`);
  });
  (memory.experience || []).forEach((e) => push(`Experience: ${e}`));
  (memory.features || []).forEach((f) => push(`Feature: ${f}`));
  (memory.tips || []).forEach((t) => push(`Tip: ${t}`));
  (memory.educationList || []).forEach((e) => push(`Education: ${e}`));
  (memory.technologiesList || []).forEach((t) => push(`Tech: ${t}`));
  return items;
}

async function main() {
  const supabase = initSupabase();
  if (!supabase) {
    console.error(
      "Supabase env missing. Set SUPABASE_URL and SUPABASE_API_KEY."
    );
    process.exit(1);
  }
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    console.error("OPENAI_API_KEY missing.");
    process.exit(1);
  }
  const openai = new OpenAI({ apiKey: openaiKey });

  const en = readJson("memory.json");
  let fi = null;
  try {
    fi = readJson("memory.fi.json");
  } catch {}
  const texts = [...toChunks(en, "en"), ...(fi ? toChunks(fi, "fi") : [])];
  console.log(`Preparing ${texts.length} chunks for embedding…`);

  const batchSize = 64;
  const table = process.env.RAG_TABLE || "documents";
  let inserted = 0;
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const emb = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: batch,
    });
    const rows = batch.map((content, idx) => ({
      content,
      embedding: emb.data[idx].embedding,
    }));
    const { error, count } = await getSupabase()
      .from(table)
      .insert(rows, { count: "exact" });
    if (error) {
      console.error("Insert error:", error.message);
      process.exit(1);
    }
    inserted += rows.length;
    console.log(`Inserted ${inserted}/${texts.length} into ${table}…`);
  }
  console.log(`Done. Inserted ${inserted} rows into ${table}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
