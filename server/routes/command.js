import express from "express";
import fs from "fs";
import OpenAI from "openai";

const router = express.Router();

// Resolve memory.json relative to this file for robustness
const memoryPath = new URL("../memory.json", import.meta.url);
const memory = JSON.parse(fs.readFileSync(memoryPath, "utf8"));

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

// Predefined static commands
function buildStaticCommands() {
  const now = new Date();
  const date = now.toLocaleDateString();
  const time = now.toLocaleTimeString();

  return {
    about: [
      "> ABOUT",
      `Name: ${memory.name}`,
      `Role: ${memory.role}`,
      `Based in: ${memory.based_in}`,
      `Skills: ${memory.skills.join(", ")}`,
    ].join("\n"),

    projects: memory.projects
      .map((p, i) => `> [${i + 1}] ${p.name}: ${p.description}`)
      .join("\n"),

    skills: ["> SKILLS", `Installed modules: ${memory.skills.join(", ")}`].join(
      "\n"
    ),
    education: ["> EDUCATION", ...memory.education].join("\n"),

    experience: [
      "> EXPERIENCE",
      ...memory.experience.map((l) => `- ${l}`),
    ].join("\n"),

    features: ["> FEATURES", ...memory.features.map((l) => `- ${l}`)].join(
      "\n"
    ),

    tips: ["> TIPS", ...memory.tips.map((l) => `- ${l}`)].join("\n"),

    credits: ["> CREDITS", ...memory.creditsLines].join("\n"),

    version: [
      "> VERSION",
      memory.versionInfo.title,
      memory.versionInfo.ui,
      memory.versionInfo.server,
    ].join("\n"),

    changelog: ["> CHANGELOG", ...memory.changelog.map((l) => `- ${l}`)].join(
      "\n"
    ),

    faq: [
      "> FAQ",
      ...memory.faq.flatMap((qa) => [`Q: ${qa.q}`, `A: ${qa.a}`]),
    ].join("\n"),

    story: ["> STORY", ...memory.story].join("\n"),

    github: [
      "> GITHUB",
      ` - Profile: ${memory.github.profile}`,
      " - Repositories:",
      ...memory.github.repositories.map((r) => `   - ${r}`),
    ].join("\n"),

    internship: [
      "> INTERNSHIP",
      ` - Company: ${memory.internship.company}`,
      ` - Duration: ${memory.internship.duration}`,
      ` - Role: ${memory.internship.role}`,
    ].join("\n"),

    languages: [
      "> LANGUAGES",
      ...memory.languagesList.map((l) => ` - ${l}`),
    ].join("\n"),

    technologies: [
      "> TECHNOLOGIES",
      ...memory.technologiesList.map((t) => ` - ${t}`),
    ].join("\n"),

    education: [
      "> EDUCATION",
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

  if (!input) return res.status(400).json({ error: "No input provided" });

  const cmd = input.toLowerCase().trim();
  const staticCommands = buildStaticCommands();

  // Check for static command first
  if (staticCommands[cmd]) {
    console.log("Handled static command:", cmd);
    return res.json({ response: staticCommands[cmd] });
  }

  // Easter eggs
  if (cmd === "bandersnatch") {
    return res.json({
      response:
        "> WARNING: Narrative instability detected. You are not making these choices.",
    });
  }

  if (cmd === "control") {
    return res.json({
      response: "> You were never in control.",
    });
  }

  if (cmd === "mirror") {
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
    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an interactive AI terminal for Luke B's portfolio. Respond concisely with a mysterious, simulation-themed tone. Context about Luke: ${JSON.stringify(
            memory
          )}`,
        },
        {
          role: "user",
          content: input,
        },
      ],
    });

    const output =
      aiResponse.choices?.[0]?.message?.content ?? "> (no response)";
    res.json({ response: output });
  } catch (error) {
    console.error("AI Error:", error);
    res.status(500).json({ error: "AI processing failed." });
  }
});

export default router;
