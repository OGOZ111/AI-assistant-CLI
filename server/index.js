import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import commandRouter from "./routes/command.js";
import recruiterRouter from "./routes/recruiter.js";
import statusRouter from "./routes/status.js";
import { initSupabase, verifySupabaseConnection } from "./config/connectDB.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/command", commandRouter);
app.use("/api/recruiter", recruiterRouter);
app.use("/api/status", statusRouter);

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
