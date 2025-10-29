import express from "express";
const router = express.Router();

router.get("/", (req, res) => {
  console.log("Recruiter mode accessed");
  const lang = (req.query.lang || "en").toLowerCase();
  const messageEn = `
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
`;

  const messageFi = `
> PÄÄSY MYÖNNETTY: REKRYTOIJAN TILA
> ===============================
> Nimi: Luke B
> Rooli: Full Stack -kehittäjä
> Sijainti: Suomi
> Yhteys: lukeb@example.com
> LinkedIn: https://linkedin.com/in/lukeb
> GitHub: https://github.com/lukeb
> CV: https://lukeb.dev/resume.pdf
> ===============================
> Järjestelmähuomautus: Vain harvat näkevät tämän tilan. Sinä olet yksi heistä.
> Yhteys katkaistu.
`;

  const recruiterData = {
    unlocked: true,
    message: lang === "fi" ? messageFi : messageEn,
  };

  res.json(recruiterData);
  console.log("Sent recruiter mode data");
});

export default router;
