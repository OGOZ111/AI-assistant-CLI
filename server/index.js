import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import commandRouter from "./routes/command.js";
import recruiterRouter from "./routes/recruiter.js";
import statusRouter from "./routes/status.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/command", commandRouter);
app.use("/api/recruiter", recruiterRouter);
app.use("/api/status", statusRouter);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🧠 AI Server running on port ${PORT}`));
