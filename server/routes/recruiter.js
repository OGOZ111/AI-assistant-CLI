import express from "express";
const router = express.Router();

router.get("/", (req, res) => {
  console.log("Recruiter mode accessed");
  const recruiterData = {
    unlocked: true,
    message: `
> ACCESS GRANTED: RECRUITER MODE
> ===============================
> Name: Luke B
> Role: Full Stack Developer
> Location: Finland
> Contact: lukeb@example.com
> LinkedIn: https://linkedin.com/in/lukeb
> GitHub: https://github.com/lukeb
> Resume: https://lukeb.dev/resume.pdf
> ===============================
> System note: Only select few see this mode. You're one of them.
> End of transmission.
`,
  };

  res.json(recruiterData);
  console.log("Sent recruiter mode data");
});

export default router;
