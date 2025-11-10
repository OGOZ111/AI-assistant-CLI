import express, { RequestHandler } from "express";
import cors from "cors";
import commandRouter from "./routes/command";
import recruiterRouter from "./routes/recruiter";
import statusRouter from "./routes/status";
import ragRouter from "./routes/rag";
import chatRouter from "./routes/chat";
import { createRateLimiter } from "./middlewares/rateLimiter";

const app = express();

app.use(cors());
app.use(express.json());

// Global baseline limiter (per-IP): defaults 120 req/min; configurable via env
const globalLimiter: RequestHandler = createRateLimiter({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000,
  max: Number(process.env.RATE_LIMIT_MAX) || 120,
  prefix: "rl:global",
});
app.use(globalLimiter);

// Stricter limiter for AI-heavy endpoints
const aiLimiter: RequestHandler = createRateLimiter({
  windowMs: Number(process.env.RATE_LIMIT_AI_WINDOW_MS) || 60_000,
  max: Number(process.env.RATE_LIMIT_AI_MAX) || 20,
  message: "Too many AI requests. Please slow down and try again shortly.",
  prefix: "rl:ai",
});

app.use("/api/command", aiLimiter, commandRouter);
app.use("/api/recruiter", recruiterRouter);
app.use("/api/status", statusRouter);
app.use("/api/rag", aiLimiter, ragRouter);
app.use("/api/chat", aiLimiter, chatRouter);

export default app;
