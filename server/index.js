import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import commandRouter from "./routes/command.js";
import recruiterRouter from "./routes/recruiter.js";
import statusRouter from "./routes/status.js";
import { initSupabase, verifySupabaseConnection } from "./config/connectDB.js";
import ragRouter from "./routes/rag.js";
import chatRouter from "./routes/chat.js";
import { initDiscord, setDiscordOnReply } from "./config/discord.js";
import { logChatMessage } from "./services/conversations.js";
import { createRateLimiter } from "./middlewares/rateLimiter.js";

dotenv.config();

const app = express();
// If behind a proxy (Render, Vercel, etc.), trust the proxy so req.ip is accurate
app.set("trust proxy", true);
app.use(cors());
app.use(express.json());

// Global baseline limiter (per-IP): defaults 120 req/min; configurable via env
const globalLimiter = createRateLimiter({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000,
  max: Number(process.env.RATE_LIMIT_MAX) || 120,
  prefix: "rl:global",
});
app.use(globalLimiter);

// Stricter limiter for AI-heavy endpoints
const aiLimiter = createRateLimiter({
  windowMs: Number(process.env.RATE_LIMIT_AI_WINDOW_MS) || 60_000,
  max: Number(process.env.RATE_LIMIT_AI_MAX) || 20,
  message: "Too many AI requests. Please slow down and try again shortly.",
  prefix: "rl:ai",
});

app.use("/api/command", aiLimiter, commandRouter); // AI command interface API route for terminal-like interactions for normal users
app.use("/api/recruiter", recruiterRouter); // Recruiter Mode API route for tailored responses for recruiters
app.use("/api/status", statusRouter); // Server status API route
app.use("/api/rag", aiLimiter, ragRouter); // RAG API route for document retrieval and question answering from knowledge base in Supabase
app.use("/api/chat", aiLimiter, chatRouter); // Chat streaming + SSE + Discord bridge

const PORT = process.env.PORT || 5000;

// Initialize Supabase and verify connectivity (non-blocking)
initSupabase();
verifySupabaseConnection().then((res) => {
  if (res?.ok) {
    console.log("✅ Supabase connection OK");
  } else {
    console.warn(
      `⚠️  Supabase not ready: ${
        res?.reason || "configuration missing or unreachable"
      }`
    );
  }
});

// Initialize Discord bot (optional) and wire /reply callback to inject messages into conversations
initDiscord();
setDiscordOnReply(async ({ conversationId, message, author }) => {
  if (!conversationId || !message) return;
  await logChatMessage({
    conversationId,
    author: author || "admin",
    text: message,
  });
});

app.listen(PORT, () => console.log(`🧠 AI Server running on port ${PORT}`));
