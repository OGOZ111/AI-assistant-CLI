import dotenv from "dotenv";
import app from "./app";
import { initSupabase, verifySupabaseConnection } from "./config/connectDB";
import { initDiscord, setDiscordOnReply } from "./config/discord";
import { logChatMessage } from "./services/conversations";

dotenv.config();

// If behind a proxy (Render, Vercel, etc.), trust the proxy so req.ip is accurate
app.set("trust proxy", true);

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
