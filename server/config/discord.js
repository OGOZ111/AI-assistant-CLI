import { Client, GatewayIntentBits, Partials } from "discord.js";

let client = null;
let channelId = null;
let onReplyHandler = null;

function normalizeConversationId(raw) {
  const s = String(raw || "").trim();
  // Strip optional "cid:" prefix if provided by humans copying from logs
  return s.replace(/^cid:/i, "");
}

export function setDiscordOnReply(handler) {
  onReplyHandler = handler;
}

export async function initDiscord() {
  try {
    const token = process.env.DISCORD_BOT_TOKEN;
    channelId = process.env.DISCORD_CHANNEL_ID || null;
    if (!token || !channelId) {
      console.warn(
        "Discord not configured (set DISCORD_BOT_TOKEN and DISCORD_CHANNEL_ID)"
      );
      return;
    }
    client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
      partials: [Partials.Channel],
    });

    // Use 'clientReady' to avoid deprecation ('ready' will be removed in v15)
    client.on("clientReady", () => {
      console.log(`🤖 Discord bot logged in as ${client.user.tag}`);
    });

    client.on("messageCreate", async (message) => {
      try {
        if (message.author.bot) return;
        if (message.channelId !== channelId) return;
        const content = message.content || "";
        const m = content.match(/^\s*\/reply\s+(\S+)\s+([\s\S]+)$/i);
        if (m && onReplyHandler) {
          const conversationId = normalizeConversationId(m[1]);
          const replyText = m[2];
          await onReplyHandler({
            conversationId,
            message: replyText,
            author: `discord:${message.author.username}`,
          });
          await message.react("✅");
        }
      } catch (e) {
        console.error("Discord message handler error:", e);
      }
    });

    await client.login(token);
  } catch (e) {
    console.warn("Discord init skipped:", e?.message || e);
  }
}

export async function sendDiscordMessage(content) {
  try {
    if (!client || !channelId || !content) return;
    const channel = await client.channels.fetch(channelId);
    if (!channel) return;
    await channel.send(String(content).slice(0, 1900));
  } catch (e) {
    // Silently ignore send failures
  }
}

export function getDiscordStatus() {
  return {
    configured: !!channelId,
    connected: !!(client && client.user),
    channelId: channelId || null,
    username: client?.user?.tag || null,
  };
}
