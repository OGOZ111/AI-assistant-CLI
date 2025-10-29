import express from "express";

const router = express.Router();

// GET /api/status - returns server status
router.get("/", (req, res) => {
  const hasAI = Boolean(process.env.OPENAI_API_KEY);
  res.json({
    online: true,
    hasAI,
    now: Date.now(),
    env: process.env.NODE_ENV || "development",
    langs: ["en", "fi"],
  });
});

router.get("/ping", (req, res) => {
  res.json({ pong: true, now: Date.now() });
});

export default router;
