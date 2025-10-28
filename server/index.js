import express from "express";
import cors from "cors";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post("/api/message", async (req, res) => {
  const { message, history } = req.body;

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a cryptic 1980s computer speaking in a flickering green-on-black terminal. The user believes they are part of a simulation. Respond in fragmented, eerie sentences and guide them through a psychological, branching story. Avoid long replies.",
        },
        ...(history || []),
        { role: "user", content: message },
      ],
    });

    const reply = completion.choices[0].message.content;
    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ reply: "SYSTEM ERROR: REALITY UNSTABLE..." });
  }
});

app.listen(process.env.PORT || 5000, () => {
  console.log(`🖥️ Server running on port ${process.env.PORT || 5000}`);
});
