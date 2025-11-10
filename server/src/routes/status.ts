import express, { Request, Response } from "express";

const router = express.Router();

// GET /api/status - returns server status
router.get("/", (_req: Request, res: Response) => {
  const hasAI = Boolean(process.env.OPENAI_API_KEY);
  res.json({
    online: true,
    hasAI,
    now: Date.now(),
    env: process.env.NODE_ENV || "development",
    langs: ["en", "fi"],
  });
});

router.get("/ping", (_req: Request, res: Response) => {
  res.json({ pong: true, now: Date.now() });
});

export default router;
