import { Client, GatewayIntentBits, Partials } from "discord.js";

type ReplyHandler = (args: {
  conversationId?: string;
  message: string;
  author?: string;
}) => Promise<void> | void;

let client: Client | null = null;
let channelId: string | null = null;
let onReplyHandler: ReplyHandler | null = null;

function normalizeConversationId(raw: unknown): string {
  const s = String(raw ?? "").trim();
  // Strip optional "cid:" prefix if provided by humans copying from logs
  return s.replace(/^cid:/i, "");
}

export function setDiscordOnReply(handler: ReplyHandler) {
  onReplyHandler = handler;
}

export async function initDiscord(): Promise<void> {
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

    // Use 'clientReady' to avoid deprecation warnings in newer discord.js versions
    client.once("clientReady", () => {
      try {
        console.log(`🤖 Discord bot logged in as ${client?.user?.tag}`);
        // Announce bot is online (best-effort)
        void sendDiscordMessage(
          "🤖 Bot is online and ready to receive messages!"
        );
      } catch {
        // ignore
      }
    });

    client.on("messageCreate", async (message) => {
      try {
        if (!client) return;
        if (message.author?.bot) return;
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
  } catch (e: unknown) {
    const err = e as { message?: string } | undefined;
    console.warn("Discord init skipped:", err?.message ?? e);
  }
}

export async function sendDiscordMessage(content?: string): Promise<void> {
  try {
    if (!client || !channelId || !content) return;
    const ch = await client.channels.fetch(channelId);
    // best-effort send — channel types differ between contexts; keep cast minimal
    const channelAny = ch as unknown as {
      send?: (c: string) => Promise<unknown>;
    } | null;
    if (!channelAny || typeof channelAny.send !== "function") return;
    await channelAny.send(String(content).slice(0, 1900));
  } catch {
    // Silently ignore send failures — this is best-effort logging/notify
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
