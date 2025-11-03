import express from "express";
import fs from "fs";
import OpenAI from "openai";
import { getSupabase } from "../config/connectDB.js";
import {
  logChatMessage,
  getConversationHistory,
} from "../services/conversations.js";

const router = express.Router();

// Resolve memory.json relative to this file for robustness
const memoryEnPath = new URL("../memory.json", import.meta.url);
const memoryFiPath = new URL("../memory.fi.json", import.meta.url);

function loadMemory(lang = "en") {
  // "en" or "fi" that loads memory.fi.json if available
  try {
    if (lang === "fi" && fs.existsSync(memoryFiPath)) {
      return JSON.parse(fs.readFileSync(memoryFiPath, "utf8"));
    }
  } catch {}
  return JSON.parse(fs.readFileSync(memoryEnPath, "utf8"));
}

// Lazily construct OpenAI client only if an API key is present
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

// Map localized aliases to canonical command keys
const FI_ALIASES = {
  about: ["tietoa"],
  projects: ["projektit"],
  skills: ["taidot"],
  experience: ["kokemus"],
  features: ["ominaisuudet"],
  tips: ["vinkit"],
  credits: ["tekijät", "krediitit"],
  version: ["versio", "ver"],
  changelog: ["muutokset"],
  faq: ["ukk", "kysymykset"],
  story: ["tarina"],
  github: ["github"],
  internship: ["harjoittelu"],
  languages: ["kielet"],
  technologies: ["teknologiat"],
  education: ["koulutus"],
  dir: ["hakemisto"],
  ls: ["lista"],
  commands: ["komennot"],
};

function resolveCanonicalCommand(cmd) {
  // First, if it's already a known canonical key, return it
  const canonicalKeys = [
    "about",
    "projects",
    "skills",
    "experience",
    "features",
    "tips",
    "credits",
    "version",
    "changelog",
    "faq",
    "story",
    "github",
    "internship",
    "languages",
    "technologies",
    "education",
    "dir",
    "ls",
    "commands",
    "bandersnatch",
    "control",
    "mirror",
  ];
  if (canonicalKeys.includes(cmd))
    return { canonical: cmd, inferredLang: null };

  for (const [canonical, aliases] of Object.entries(FI_ALIASES)) {
    if (aliases.includes(cmd)) return { canonical, inferredLang: "fi" };
  }
  return { canonical: cmd, inferredLang: null };
}

// Clean up AI output to avoid echoing terminal prompts or markdown wrappers
function sanitizeAIOutput(text) {
  if (!text) return "";
  let t = String(text);
  // Strip leading markdown bold that wraps a prompt-like string
  t = t.replace(/^\s*\*{1,3}\s*([^\n]*?)\s*\*{1,3}\s*/s, (m, inner) => {
    return /C:\\/.test(inner) && />/.test(inner) ? "" : m;
  });
  // Remove a Windows-style prompt at the very start, e.g., C:\SIM\USER [12:34:56]>
  t = t.replace(/^\s*C:\\[^\n>]*>\s*/i, "");
  // Remove a leading blockquote caret if present
  t = t.replace(/^\s*>\s+/, "");
  return t.trimStart();
}

// Lightweight language detector based on simple prefixes used in content
function detectLangFromContent(text) {
  const s = String(text || "");
  if (/^\s*EN:\s*/i.test(s) || /^\s*\[en\]/i.test(s)) return "en";
  if (/^\s*FI:\s*/i.test(s) || /^\s*\[fi\]/i.test(s)) return "fi";
  return null;
}

// One-off language override via message prefix, e.g. "en: show projects" or "fi: projektit" ##### NOTE: THIS MUST BE TESTED THOROUGHLY BEFORE PROD!!!!!!
function parseOneOffLangOverride(input) {
  const m = String(input || "").match(/^\s*(en|fi)\s*:\s*(.*)$/i);
  if (!m) return { lang: null, stripped: null };
  const lang = m[1].toLowerCase();
  const stripped = m[2];
  return { lang, stripped };
}

// Predefined static commands
function buildStaticCommands(memory, lang = "en") {
  const now = new Date();
  const date = now.toLocaleDateString();
  const time = now.toLocaleTimeString();

  const L =
    lang === "fi"
      ? {
          ABOUT: "> TIETOA",
          SKILLS: "> TAIDOT",
          EXPERIENCE: "> KOKEMUS",
          FEATURES: "> OMINAISUUDET",
          TIPS: "> VIHJEET",
          CREDITS: "> KREDIITIT",
          VERSION: "> VERSIO",
          CHANGELOG: "> MUUTOSLOKI",
          FAQ: "> UKK",
          STORY: "> TARINA",
          GITHUB: "> GITHUB",
          INTERNSHIP: "> HARJOITTELU",
          LANGUAGES: "> KIELET",
          TECHNOLOGIES: "> TEKNOLOGIAT",
          EDUCATION: "> KOULUTUS",
        }
      : {
          ABOUT: "> ABOUT",
          SKILLS: "> SKILLS",
          EXPERIENCE: "> EXPERIENCE",
          FEATURES: "> FEATURES",
          TIPS: "> TIPS",
          CREDITS: "> CREDITS",
          VERSION: "> VERSION",
          CHANGELOG: "> CHANGELOG",
          FAQ: "> FAQ",
          STORY: "> STORY",
          GITHUB: "> GITHUB",
          INTERNSHIP: "> INTERNSHIP",
          LANGUAGES: "> LANGUAGES",
          TECHNOLOGIES: "> TECHNOLOGIES",
          EDUCATION: "> EDUCATION",
        };

  return {
    about: [
      L.ABOUT,
      `Name: ${memory.name}`,
      `Role: ${memory.role}`,
      `Based in: ${memory.based_in}`,
      `Skills: ${memory.skills.join(", ")}`,
    ].join("\n"),

    projects: memory.projects
      .map((p, i) => `> [${i + 1}] ${p.name}: ${p.description}`)
      .join("\n"),

    skills: [L.SKILLS, `Installed modules: ${memory.skills.join(", ")}`].join(
      "\n"
    ),

    experience: [L.EXPERIENCE, ...memory.experience.map((l) => `- ${l}`)].join(
      "\n"
    ),

    features: [L.FEATURES, ...memory.features.map((l) => `- ${l}`)].join("\n"),

    tips: [L.TIPS, ...memory.tips.map((l) => `- ${l}`)].join("\n"),

    credits: [L.CREDITS, ...memory.creditsLines].join("\n"),

    version: [
      L.VERSION,
      memory.versionInfo.title,
      memory.versionInfo.ui,
      memory.versionInfo.server,
    ].join("\n"),

    changelog: [L.CHANGELOG, ...memory.changelog.map((l) => `- ${l}`)].join(
      "\n"
    ),

    faq: [
      L.FAQ,
      ...memory.faq.flatMap((qa) => [`Q: ${qa.q}`, `A: ${qa.a}`]),
    ].join("\n"),

    story: [L.STORY, ...memory.story].join("\n"),

    github: [
      L.GITHUB,
      ` - Profile: ${memory.github.profile}`,
      " - Repositories:",
      ...memory.github.repositories.map((r) => `   - ${r}`),
    ].join("\n"),

    internship: [
      L.INTERNSHIP,
      ` - Company: ${memory.internship.company}`,
      ` - Duration: ${memory.internship.duration}`,
      ` - Role: ${memory.internship.role}`,
    ].join("\n"),

    languages: [
      L.LANGUAGES,
      ...memory.languagesList.map((l) => ` - ${l}`),
    ].join("\n"),

    technologies: [
      L.TECHNOLOGIES,
      ...memory.technologiesList.map((t) => ` - ${t}`),
    ].join("\n"),

    education: [
      L.EDUCATION,
      ...memory.educationList.map((e) => ` - ${e}`),
    ].join("\n"),

    dir: [
      ` Volume in drive C is ${memory.directory.volume}`,
      ` Directory of ${memory.directory.path}`,
      "",
      ...memory.directory.entries.map((ent) =>
        ent.type === "dir"
          ? `${date}  ${time}    <DIR>          ${ent.name}`
          : `${date}  ${time}                 ${String(ent.size).padStart(
              5,
              " "
            )} ${ent.name}`
      ),
    ].join("\n"),

    ls: [
      ` Volume in drive C is ${memory.directory.volume}`,
      ` Directory of ${memory.directory.path}`,
      "",
      ...memory.directory.entries.map((ent) =>
        ent.type === "dir"
          ? `${date}  ${time}    <DIR>          ${ent.name}`
          : `${date}  ${time}                 ${String(ent.size).padStart(
              5,
              " "
            )} ${ent.name}`
      ),
    ].join("\n"),

    commands: [
      "> LINKEDIN",
      " - There are no commands. Only paths. Choose wisely.",
    ].join("\n"),

    help: [
      "Available commands:",
      " about | projects | skills | experience | features | tips | credits | version | changelog | faq | story",
      " github | internship | languages | technologies | education | dir | ls | bandersnatch | control | mirror",
    ].join("\n"),
  };
}

// Handle incoming command
router.post("/", async (req, res) => {
  console.log("Received command:", req.body);
  const { input } = req.body;
  const langRaw = req.body.lang;
  const cidRaw =
    req.body.conversationId || req.body.cid || req.body.conversation_id;
  const conversationId = String(
    cidRaw ||
      `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  );

  if (!input) return res.status(400).json({ error: "No input provided" });

  // Detect per-message override like "en: ..." or "fi: ..." (does not change global UI language)
  const { lang: overrideLang, stripped } = parseOneOffLangOverride(input);
  const inputForProcessing = stripped ?? input;

  const rawCmd = inputForProcessing.toLowerCase().trim();
  const { canonical, inferredLang } = resolveCanonicalCommand(rawCmd);
  const useLang = overrideLang || langRaw || inferredLang || "en";
  const memory = loadMemory(useLang);
  const staticCommands = buildStaticCommands(memory, useLang);

  // Fetch previous conversation history BEFORE logging this turn
  const previousHistory = getConversationHistory(conversationId);

  // Log user message (best-effort)
  try {
    // Fire-and-forget logging to avoid adding latency
    logChatMessage({ conversationId, author: "user", text: input });
  } catch {}

  // Check for static command first
  if (staticCommands[canonical]) {
    console.log("Handled static command:", canonical, "(lang:", useLang, ")");
    return res.json({ response: staticCommands[canonical], conversationId });
  }

  // Easter eggs for specific commands
  if (canonical === "bandersnatch") {
    return res.json({
      response:
        "> WARNING: Narrative instability detected. You are not making these choices.",
    });
  }

  if (canonical === "control") {
    return res.json({
      response: "> You were never in control.",
    });
  }

  if (canonical === "mirror") {
    return res.json({
      response: "> The reflection blinked first.",
    });
  }

  // If not found, use AI to respond dynamically (when available)
  const openai = getOpenAI();
  if (!openai) {
    return res.json({
      response:
        "> AI is offline (no OPENAI_API_KEY). Static commands still work. Set the key to enable dynamic replies.",
    });
  }

  try {
    // RAG retrieval: optionally fetch top chunks from Supabase if configured
    let ragContext = "";
    try {
      const supabase = getSupabase();
      if (supabase) {
        // Simple coreference-aware embedding query: if input uses pronouns, hint subject
        const subjectName = memory?.name || "Luke";
        const enPronouns = /\b(he|him|his)\b/i;
        const fiPronouns = /\b(hän|hänen|häntä|he|heidän|heitä)\b/i;
        const pronounRe = useLang === "fi" ? fiPronouns : enPronouns;
        const queryForEmbedding = pronounRe.test(inputForProcessing)
          ? `${inputForProcessing} (about ${subjectName})`
          : inputForProcessing;

        const emb = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: queryForEmbedding,
        });
        const queryEmbedding = emb.data[0].embedding;
        // Try match_documents first; fallback to match_kb_chunks
        let rpc = await supabase.rpc("match_documents", {
          query_embedding: queryEmbedding,
          match_count: 6,
          min_similarity: 0.3,
        });
        if (rpc.error) {
          rpc = await supabase.rpc("match_kb_chunks", {
            query_embedding: queryEmbedding,
            match_count: 6,
            min_similarity: 0.3,
          });
        }
        if (!rpc.error && Array.isArray(rpc.data) && rpc.data.length) {
          const pref = useLang === "fi" ? "fi" : "en";
          const preferred = rpc.data.filter(
            (r) => detectLangFromContent(r.content) === pref
          );
          const chosen = (preferred.length ? preferred : rpc.data).slice(0, 6);
          ragContext = chosen
            .map((r, i) => `[#${i + 1}] ${r.content}`)
            .join("\n\n");
        }
      }
    } catch (e) {
      // RAG is optional; proceed quietly if unavailable
    }

    // Build short recent history for conversational context (exclude current turn)
    const recent = Array.isArray(previousHistory)
      ? previousHistory.slice(-6)
      : [];
    const recentAsChat = recent.map((m) => ({
      role: m.author === "bot" ? "assistant" : "user",
      content: m.text,
    }));

    const ragPresent = Boolean(ragContext && ragContext.trim());
    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: ragPresent ? 0.2 : 0.6,
      max_tokens: 900,
      presence_penalty: 0.1,
      frequency_penalty: 0.3,
      messages: [
        {
          role: "system",
          content: `You are an interactive AI terminal for Luke B's portfolio. Respond calm and happy. You can answer personal questions. Do NOT print any shell prompt, paths, timestamps, or prefixes like ">" or "C:\\...>". Do NOT use markdown emphasis or code fences unless explicitly asked. Output plain text lines only. Answer in language: ${useLang}.

          If the user asks how to switch languages, tell them to type: "lang en" for English or "lang fi" for Finnish. Do not change the language yourself.

          They can contact luke by typing contact, and you offer to pass their message one way to him.  

          ${
            ragPresent
              ? `Retrieved knowledge base snippets (authoritative, up-to-date; prefer these over any static memory):\n${ragContext}\n\nOnly answer using the retrieved snippets. If the answer is not present or insufficient, say you don't know.`
              : `Static context about Luke (curated): ${JSON.stringify(
                  memory
                )}\nUse this static context to answer. If unsure, say you don't know.`
          }`,
        },
        {
          role: "system",
          content:
            "Use recent conversation to resolve pronouns and references. If the user says 'his', 'her', etc., assume it refers to the last named person discussed (typically Luke) unless context says otherwise.",
        },
        ...recentAsChat,
        {
          role: "user",
          content: inputForProcessing,
        },
      ],
    });

    const outputRaw =
      aiResponse.choices?.[0]?.message?.content ?? "> (no response)";
    const output = sanitizeAIOutput(outputRaw);
    // Respond first, then log in background to minimize latency
    res.json({ response: output, conversationId });
    try {
      logChatMessage({ conversationId, author: "bot", text: output });
    } catch {}
    console.log("AI response content:", output);
  } catch (error) {
    console.error("AI Error:", error);
    res.status(500).json({ error: "AI processing failed." });
  }
});

export default router;
