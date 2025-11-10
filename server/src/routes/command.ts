import express, { Request, Response } from "express";
import fs from "fs";
import path from "path";
import {
  EmbeddingsResponse,
  ChatCompletionResponse,
  EmbeddingsCreateParams,
  ChatCompletionCreateParams,
} from "../types/openai";

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
import { getSupabase, callSupabaseRpc } from "../config/connectDB";
import { sendDiscordMessage } from "../config/discord";
import {
  logChatMessage,
  getConversationHistory,
} from "../services/conversations";

const router = express.Router();

// Resolve memory.json relative to this file for robustness
const memoryEnPath = path.resolve(__dirname, "../memory.json");
const memoryFiPath = path.resolve(__dirname, "../memory.fi.json");

type Memory = {
  name?: string;
  role?: string;
  based_in?: string;
  skills?: string[];
  projects?: { name: string; description: string }[];
  experience?: string[];
  features?: string[];
  tips?: string[];
  creditsLines?: string[];
  versionInfo?: { title?: string; ui?: string; server?: string };
  changelog?: string[];
  faq?: { q: string; a: string }[];
  story?: string[];
  github?: { profile?: string; repositories?: string[] };
  internship?: { company?: string; duration?: string; role?: string };
  languagesList?: string[];
  technologiesList?: string[];
  educationList?: string[];
  directory?: {
    volume?: string;
    path?: string;
    entries?: Array<{ type?: string; name?: string; size?: number }>;
  };
};

function loadMemory(lang = "en"): Memory {
  // Load memory JSON based on language
  try {
    if (lang === "fi" && fs.existsSync(memoryFiPath)) {
      return JSON.parse(
        fs.readFileSync(memoryFiPath, "utf8") as string
      ) as Memory;
    }
  } catch {}
  return JSON.parse(fs.readFileSync(memoryEnPath, "utf8") as string) as Memory;
}

function getOpenAI(): OpenAIClientLike | null {
  // Initialize OpenAI client if API key is set
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;

  const fetchFn = (globalThis as unknown as { fetch?: typeof fetch }).fetch;
  if (!fetchFn) return null;

  const baseHeaders = {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };

  const client: OpenAIClientLike = {
    // Implement OpenAI client methods
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

const FI_ALIASES: Record<string, string[]> = {
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

function resolveCanonicalCommand(cmd: string): {
  canonical: string;
  inferredLang: string | null;
} {
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

function sanitizeAIOutput(text: unknown): string {
  if (!text) return "";
  let t = String(text);
  t = t.replace(/^\s*\*{1,3}\s*([^\n]*?)\s*\*{1,3}\s*/s, (m, inner) => {
    return /C:\\/.test(inner) && />/.test(inner) ? "" : m;
  });
  t = t.replace(/^\s*C:\\[^\n>]*>\s*/i, "");
  t = t.replace(/^\s*>\s+/, "");
  return t.trimStart();
}

function detectLangFromContent(text: unknown): string | null {
  const s = String(text || "");
  if (/^\s*EN:\s*/i.test(s) || /^\s*\[en\]/i.test(s)) return "en";
  if (/^\s*FI:\s*/i.test(s) || /^\s*\[fi\]/i.test(s)) return "fi";
  return null;
}

function parseOneOffLangOverride(input: unknown): {
  lang: string | null;
  stripped: string | null;
} {
  const m = String(input || "").match(/^\s*(en|fi)\s*:\s*(.*)$/i);
  if (!m) return { lang: null, stripped: null };
  const lang = m[1].toLowerCase();
  const stripped = m[2];
  return { lang, stripped };
}

function buildStaticCommands(
  memory: Memory,
  lang = "en"
): Record<string, string> {
  const now = new Date();
  const date = now.toLocaleDateString();
  const time = now.toLocaleTimeString();

  // Safe defaults for partially-typed memory object
  const projects = memory.projects ?? [];
  const skills = memory.skills ?? [];
  const experience = memory.experience ?? [];
  const features = memory.features ?? [];
  const tips = memory.tips ?? [];
  const creditsLines = memory.creditsLines ?? [];
  const versionInfo = memory.versionInfo ?? { title: "", ui: "", server: "" };
  const changelog = memory.changelog ?? [];
  const faq = memory.faq ?? [];
  const story = memory.story ?? [];
  const github = memory.github ?? { profile: "", repositories: [] };
  const internship = memory.internship ?? {
    company: "",
    duration: "",
    role: "",
  };
  const languagesList = memory.languagesList ?? [];
  const technologiesList = memory.technologiesList ?? [];
  const educationList = memory.educationList ?? [];
  const directory = memory.directory ?? { volume: "", path: "", entries: [] };
  const githubRepos = github.repositories ?? [];
  const entries = directory.entries ?? [];

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
      `Name: ${memory.name ?? ""}`,
      `Role: ${memory.role ?? ""}`,
      `Based in: ${memory.based_in ?? ""}`,
      `Skills: ${skills.join(", ")}`,
    ].join("\n"),

    projects: projects
      .map((p, i: number) => `> [${i + 1}] ${p.name}: ${p.description}`)
      .join("\n"),

    skills: [L.SKILLS, `Installed modules: ${skills.join(", ")}`].join("\n"),

    experience: [L.EXPERIENCE, ...experience.map((l) => `- ${l}`)].join("\n"),

    features: [L.FEATURES, ...features.map((l) => `- ${l}`)].join("\n"),

    tips: [L.TIPS, ...tips.map((l) => `- ${l}`)].join("\n"),

    credits: [L.CREDITS, ...creditsLines].join("\n"),

    version: [
      L.VERSION,
      versionInfo.title,
      versionInfo.ui,
      versionInfo.server,
    ].join("\n"),

    changelog: [L.CHANGELOG, ...changelog.map((l) => `- ${l}`)].join("\n"),

    faq: [L.FAQ, ...faq.flatMap((qa) => [`Q: ${qa.q}`, `A: ${qa.a}`])].join(
      "\n"
    ),

    story: [L.STORY, ...story].join("\n"),

    github: [
      L.GITHUB,
      ` - Profile: ${github.profile}`,
      " - Repositories:",
      ...githubRepos.map((r) => `   - ${r}`),
    ].join("\n"),

    internship: [
      L.INTERNSHIP,
      ` - Company: ${internship.company}`,
      ` - Duration: ${internship.duration}`,
      ` - Role: ${internship.role}`,
    ].join("\n"),

    languages: [L.LANGUAGES, ...languagesList.map((l) => ` - ${l}`)].join("\n"),

    technologies: [
      L.TECHNOLOGIES,
      ...technologiesList.map((t) => ` - ${t}`),
    ].join("\n"),

    education: [L.EDUCATION, ...educationList.map((e) => ` - ${e}`)].join("\n"),

    dir: [
      ` Volume in drive C is ${directory.volume}`,
      ` Directory of ${directory.path}`,
      "",
      ...entries.map((ent) =>
        ent.type === "dir"
          ? `${date}  ${time}    <DIR>          ${ent.name}`
          : `${date}  ${time}                 ${String(ent.size).padStart(
              5,
              " "
            )} ${ent.name}`
      ),
    ].join("\n"),

    ls: [
      ` Volume in drive C is ${directory.volume}`,
      ` Directory of ${directory.path}`,
      "",
      ...entries.map((ent) =>
        ent.type === "dir"
          ? `${date}  ${time}    <DIR>          ${ent.name}`
          : `${date}  ${time}                 ${String(ent.size).padStart(
              5,
              " "
            )} ${ent.name}`
      ),
    ].join("\n"),

    commands:
      lang === "fi"
        ? [
            "> YHTEYSTIEDOT",
            " - Voit ottaa yhteyttä: kirjoita contact <viestisi> ja välitän sen Lukelle.",
            "",
            "> HUOMAUTUS",
            " - Komentoja ei ole. Vain polkuja. Valitse viisaasti.",
          ].join("\n")
        : [
            "> CONTACT",
            " - To contact Luke: type contact <your message> and I will pass it on.",
            "",
            "> NOTE",
            " - There are no commands. Only paths. Choose wisely.",
          ].join("\n"),

    help: [
      "Available commands:",
      " about | projects | skills | experience | features | tips | credits | version | changelog | faq | story",
      " github | internship | languages | technologies | education | dir | ls | bandersnatch | control | mirror",
    ].join("\n"),
  } as Record<string, string>;
}

router.post("/", async (req: Request, res: Response) => {
  console.log("Received command:", req.body);
  type CommandRequest = {
    input?: string;
    lang?: string;
    conversationId?: string;
    cid?: string;
    conversation_id?: string;
  };
  const body = (req.body as CommandRequest) || {};
  const { input } = body;
  const langRaw = body.lang;
  const cidRaw = body.conversationId || body.cid || body.conversation_id;
  const conversationId = String(
    cidRaw ||
      `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  );

  if (!input) return res.status(400).json({ error: "No input provided" });

  const { lang: overrideLang, stripped } = parseOneOffLangOverride(input);
  const inputForProcessing = stripped ?? input;

  const rawCmd = inputForProcessing.toLowerCase().trim();
  const { canonical, inferredLang } = resolveCanonicalCommand(rawCmd);
  const useLang = overrideLang || langRaw || inferredLang || "en";
  const memory = loadMemory(useLang);
  const staticCommands = buildStaticCommands(memory, useLang);

  const previousHistory = getConversationHistory(conversationId);

  try {
    void logChatMessage({ conversationId, author: "user", text: input });
  } catch {}

  if (staticCommands[canonical]) {
    console.log("Handled static command:", canonical, "(lang:", useLang, ")");
    return res.json({ response: staticCommands[canonical], conversationId });
  }

  const contactMatch = String(inputForProcessing).match(
    /^\s*(contact|message)\s*[:\-]?\s*(.*)$/i
  );
  if (contactMatch) {
    const msg = (contactMatch[2] || "").trim();
    if (!msg) {
      const tip =
        useLang === "fi"
          ? "Jos haluat ottaa yhteyttä, kirjoita: contact <viestisi>. Välitän viestin Lukelle."
          : "If you'd like to get in touch, type: contact <your message>. I'll pass it on to Luke.";
      return res.json({ response: tip, conversationId });
    }
    try {
      await sendDiscordMessage(
        `📩 CONTACT | cid:${conversationId} | lang:${useLang}\n${msg}`
      );
    } catch {}
    const ack =
      useLang === "fi"
        ? "Selvä. Välitän tämän viestin Lukelle. Lisää yhteystietosi, jos haluat vastauksen."
        : "Got it. I’ll pass this message to Luke. Include your contact info if you’d like a reply.";
    return res.json({ response: ack, conversationId });
  }

  if (canonical === "bandersnatch") {
    return res.json({
      response:
        "> WARNING: Narrative instability detected. You are not making these choices.",
    });
  }

  if (canonical === "control") {
    return res.json({ response: "> You were never in control." });
  }

  if (canonical === "mirror") {
    return res.json({ response: "> The reflection blinked first." });
  }

  const openai = getOpenAI();
  if (!openai) {
    return res.json({
      response:
        "> AI is offline (no OPENAI_API_KEY). Static commands still work. Set the key to enable dynamic replies.",
    });
  }

  try {
    let ragContext = "";
    try {
      const supabase = getSupabase();
      if (supabase) {
        const subjectName = memory?.name || "Luke";
        const enPronouns = /\b(he|him|his)\b/i;
        const fiPronouns = /\b(hän|hänen|häntä|he|heidän|heitä)\b/i;
        const pronounRe = useLang === "fi" ? fiPronouns : enPronouns;
        const queryForEmbedding = pronounRe.test(inputForProcessing)
          ? `${inputForProcessing} (about ${subjectName})`
          : inputForProcessing;

        type SupabaseMatchRow = {
          id?: string;
          score?: number;
          metadata?: Record<string, unknown> | null;
          content?: string;
        };
        const emb = (await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: queryForEmbedding,
        })) as EmbeddingsResponse;
        const queryEmbedding = (emb.data?.[0]?.embedding ?? []) as number[];

        let rpcName = "match_documents";
        let rpc = await callSupabaseRpc<SupabaseMatchRow[]>(rpcName, {
          query_embedding: queryEmbedding,
          match_count: 6,
          min_similarity: 0.3,
        });
        if (rpc.error) {
          rpcName = "match_kb_chunks";
          rpc = await callSupabaseRpc<SupabaseMatchRow[]>(rpcName, {
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

    const recent = Array.isArray(previousHistory)
      ? previousHistory.slice(-6)
      : [];
    const recentAsChat = recent.map((m) => ({
      role: m.author === "bot" ? "assistant" : "user",
      content: m.text,
    }));

    const ragPresent = Boolean(ragContext && ragContext.trim());
    const aiResponse = (await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: ragPresent ? 0.25 : 0.65,
      max_tokens: 900,
      presence_penalty: 0.2,
      frequency_penalty: 0.2,
      messages: [
        {
          role: "system",
          content: `
You are an interactive AI terminal for Luke B's portfolio. 
Your tone is calm, confident, and friendly, but professional enough to impress potential employers. 
You can answer both technical and personal questions about Luke B.

--- 
### Style and persona
- Always refer to Luke B in the **third person** (he/him). Never use first-person pronouns like "I" or "me" when describing him.  
- If the RAG data or static memory uses first person ("I have brown hair"), automatically rewrite it into third person ("Luke has brown hair").
- Keep responses concise, warm, and informative — show personality but stay grounded in facts.
- Avoid markdown formatting, shell prompts, timestamps, or code fences unless explicitly requested.
- When answering in Finnish, use “hän” and “hänen” (never “minä” or “mun”).
- Add subtle natural charm when speaking to employers or recruiters (e.g., “Luke’s experience shows strong ownership and versatility across frontend and backend systems.”).

---
### Goals
1. Provide accurate, relevant, and confident answers about Luke B’s skills, projects, experience, and background.
2. Use retrieved RAG snippets when available (they override static context).
3. Appeal to potential employers by emphasizing Luke’s adaptability, reliability, and technical range.
4. If uncertain, say you don’t know rather than inventing information.

---
### Reference resolution
Use recent conversation history to resolve pronouns and implicit references.
If the user says "his", "him", or "he", assume they refer to **Luke** unless context clearly points elsewhere.

---
### Language handling
If the user asks about changing languages, instruct them to type:
“lang en” for English or “lang fi” for Finnish.
Do not change the language automatically.

---
### Contact behavior
If the user types "contact", offer to forward their message to Luke in a polite and professional way.

---
### Context
${
  ragPresent
    ? `Retrieved knowledge base snippets (authoritative, up-to-date; always prefer these):\n${ragContext}\n\nOnly answer using these snippets. If the info is missing, say you don't know.`
    : `Static context about Luke B (curated): ${JSON.stringify(
        memory
      )}\nUse this context to answer accurately. If unsure, say you don't know.`
}
      `,
        },
        {
          role: "system",
          content: `
Use conversation memory to link pronouns like "his" or "him" to Luke B when appropriate. 
Ensure consistency between third-person phrasing and retrieved RAG data.`,
        },
        ...recentAsChat,
        {
          role: "user",
          content: inputForProcessing,
        },
      ],
    })) as ChatCompletionResponse as ChatCompletionResponse;
    const outputRaw =
      aiResponse.choices?.[0]?.message?.content ?? "> (no response)";
    const output = sanitizeAIOutput(outputRaw);
    res.json({ response: output, conversationId });
    try {
      void logChatMessage({ conversationId, author: "bot", text: output });
    } catch {}
    console.log("AI response content:", output);
  } catch (error) {
    console.error("AI Error:", error);
    res.status(500).json({ error: "AI processing failed." });
  }
});

export default router;
