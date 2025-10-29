import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import commandRouter from "./routes/command.js";
import recruiterRouter from "./routes/recruiter.js";
import statusRouter from "./routes/status.js";
import { initSupabase, verifySupabaseConnection } from "./config/connectDB.js";
import ragRouter from "./routes/rag.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/command", commandRouter); // AI command interface API route for terminal-like interactions for normal users
app.use("/api/recruiter", recruiterRouter); // Recruiter Mode API route for tailored responses for recruiters
app.use("/api/status", statusRouter); // Server status API route
app.use("/api/rag", ragRouter); // RAG API route for document retrieval and question answering from knowledge base in Supabase

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

app.listen(PORT, () => console.log(`🧠 AI Server running on port ${PORT}`));
