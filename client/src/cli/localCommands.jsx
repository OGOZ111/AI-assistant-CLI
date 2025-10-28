import React from "react";
import Progress from "../components/Progress.jsx";
import Typewriter from "../components/Typewriter.jsx";
import TypeAndReplace from "../components/TypeAndReplace.jsx";
import BigSymbol from "../components/BigSymbol.jsx";

// Helper: type a block (optional title + array of body lines) sequentially
function typeBlock(ctx, title, body = [], speed = 30) {
  const lines = [];
  if (title) lines.push(title);
  if (Array.isArray(body) && body.length) lines.push(...body);
  if (!lines.length) return;

  ctx.setTyping?.(true);

  const run = (i) => {
    if (i >= lines.length) {
      ctx.setTyping?.(false);
      return;
    }
    const key = `tb-${Date.now()}-${i}`;
    ctx.setLines((prev) => [
      ...prev,
      <span key={key}>
        <Typewriter text={lines[i]} speed={speed} onDone={() => run(i + 1)} />
      </span>,
    ]);
  };

  run(0);
}

export async function handleLocalCommand(message, ctx) {
  const lower = message.toLowerCase().trim();

  // clear / cls
  if (["clear", "cls"].includes(lower)) {
    ctx.setLines([]);
    return true;
  }

  // help
  if (lower === "help") {
    ctx.setLines((prev) => [
      ...prev,
      "Available commands:",
      "  help            - show this help",
      "  clear / cls     - clear the screen",
      "  dir / ls        - list directory",
      "  banner          - print the boot banner",
      "  scan            - run diagnostics with progress",
      "  mask on|off     - enable/disable pixel mask",
      "  mask toggle     - toggle pixel mask",
      "  mode 80|auto    - clamp to ~80 columns or restore",
      "  about           - what this app is",
      "  features        - key features overview",
      "  tips            - usage tips and shortcuts",
      "  credits         - acknowledgements",
      "  version | ver   - show version info",
      "  changelog       - latest changes",
      "  faq             - common questions",
      "  story           - in-universe lore",
      "  /glitch         - trigger a visual glitch",
      "  projects        - list of Luke's projects",
      "  experience      - overview of Luke's experience",
      "  skills          - key skills and technologies",
      "  github          - Luke's GitHub profile",
      "  linkedin        - Luke's LinkedIn profile",
      "  internship      - details of Luke's internship",
      "  education       - overview of Luke's education",
      "  commands        - ...",
    ]);
    return true;
  }

  // mask on|off|toggle
  if (lower === "mask on") {
    ctx.setMaskEnabled(true);
    ctx.setLines((prev) => [...prev, "> Pixel mask enabled."]);
    return true;
  }
  if (lower === "mask off") {
    ctx.setMaskEnabled(false);
    ctx.setLines((prev) => [...prev, "> Pixel mask disabled."]);
    return true;
  }
  if (lower === "mask toggle") {
    const next = !ctx.maskEnabled;
    ctx.setMaskEnabled(next);
    ctx.setLines((prev) => [
      ...prev,
      next ? "> Pixel mask enabled." : "> Pixel mask disabled.",
    ]);
    return true;
  }

  // banner replay
  if (lower === "banner") {
    ctx.setTyping(true);
    await ctx.showBannerSlow({
      chunkSize: 2,
      lineDelay: 35,
      linePause: 60,
      beepMode: "chunk",
      jitter: true,
      jitterPct: 0.3,
    });
    ctx.setTyping(false);
    return true;
  }

  // info blocks
  if (lower === "about") {
    typeBlock(ctx, "> ABOUT", [
      " - I am handbuilt by Luke to showcase his skills and projects.",
      "- He coded me using React, Node.js, Tailwind CSS, Express to create an immersive CLI experience.",
      "- I use RAG (Retrieval-Augmented Generation) to provide accurate and up-to-date responses about Luke and his work via a remote server.",
      "- This is a retro-styled simulation terminal inspired by 80s CLI aesthetics and the TV show Bandersnatch, and just like the show, your choices matter and I can respond accordingly.",
    ]);
    return true;
  }
  if (lower === "features") {
    typeBlock(ctx, "> FEATURES", [
      "- ASCII banner with chunked reveal, jitter, beeps, and responsive scaling",
      "- OpenAI-powered assistant with RAG for Luke-specific info",
      "- Vector Database integration for accurate, up-to-date responses",
      "- Visual glitch trigger (/glitch) scoped to output area",
      "- Optional pixel-dot mask overlay and custom scrollbars",
      "- DOS-like prompt with live clock: C:\\SIM\\USER [HH:MM:SS]>",
    ]);
    return true;
  }
  if (lower === "tips") {
    typeBlock(ctx, "> TIPS", [
      "- Use 'banner' to replay the intro ASCII.",
      "- Try 'dir' or 'ls' for a themed directory listing.",
      "- 'scan' runs a small diagnostics sequence with multiple bars.",
      "- Arrow Up/Down cycles your OS history (if your browser remembers).",
      "- Commands are case-insensitive; spaces around arguments are ignored.",
    ]);
    return true;
  }
  if (lower === "credits") {
    typeBlock(ctx, "> CREDITS", [
      "Concept & Implementation: You + this assistant",
      "Tech: React + Vite, Tailwind via PostCSS, a hint of WebAudio",
      "Thanks to classic terminal UIs for the inspiration",
    ]);
    return true;
  }
  if (lower === "version" || lower === "ver") {
    typeBlock(ctx, "> VERSION", [
      "Ban DERSNATCH CLI — dev build",
      "UI: client-side simulated terminal",
      "Server: local endpoint for AI replies",
    ]);
    return true;
  }
  if (lower === "changelog") {
    typeBlock(ctx, "> CHANGELOG", [
      "- Added DOS-style prompt clock [HH:MM:SS]",
      "- Banner centered horizontally; background unified",
      "- Various visual polish: scaling, pixel mask, glitch scope",
      "- Boot sequence with multiple progress steps",
    ]);
    return true;
  }
  if (lower === "faq") {
    typeBlock(ctx, "> FAQ", [
      "Q: Is this a real shell?",
      "A: It's a themed UI; some commands are simulated locally for fun.",
      "Q: Why does the text glow?",
      "A: Phosphor nostalgia. Tune brightness if your eyes need a rest.",
    ]);
    return true;
  }
  if (lower === "story") {
    typeBlock(ctx, "> STORY", [
      "Echoes of an offline system wake in the dark.",
      "Fragments load; a banner blinks into place, waiting for input.",
      "Somewhere, telemetry is muted—and that feels intentional.",
    ]);
    return true;
  }
  if (lower === "projects") {
    typeBlock(ctx, "> PROJECTS", [
      " - Project 1: Bandersnatch CLI",
      " - Project 2: Retro Web Terminal",
      " - Project 3: AI-Powered Assistant",
    ]);
    return true;
  }

  if (lower === "experience") {
    typeBlock(ctx, "> EXPERIENCE", [
      " - Role: Full-Stack Developer",
      " - Duration: 2020 - Present",
      " - Technologies: React, Tailwind CSS, Node.js",
    ]);
    return true;
  }

  if (lower === "github") {
    typeBlock(ctx, "> GITHUB", [
      " - Profile: https://github.com/OGOZ111",
      " - Repositories:",
      "   - bandersnatch-cli",
      "   - retro-web-terminal",
      "   - ai-powered-assistant",
    ]);
    return true;
  }

  if (lower === "internship") {
    typeBlock(ctx, "> INTERNSHIP", [
      " - Company: ABC Corp",
      " - Duration: Summer 2024",
      " - Role: Software Engineering Intern",
    ]);
    return true;
  }

  if (lower === "languages") {
    typeBlock(ctx, "> LANGUAGES", [
      " - JavaScript",
      " - Python",
      " - Typescript",
      " - HTML/CSS",
    ]);
    return true;
  }

  if (lower === "technologies") {
    typeBlock(ctx, "> TECHNOLOGIES", [
      " - React",
      " - Node.js",
      " - Express",
      " - MongoDB",
    ]);
    return true;
  }

  if (lower === "education") {
    typeBlock(ctx, "> EDUCATION", [
      " - Helsinki Business College",
      " - Fulltime studies in Software Development",
      " - Graduation: 2024",
    ]);
    return true;
  }

  if (lower === "netflix") {
    // Easter egg: pretend to type a generic description, erase it, then reveal the actual line.
    ctx.setTyping(true);
    const key = `nfx-${Date.now()}`;
    ctx.setLines((prev) => [
      ...prev,
      <span key={key}>
        <TypeAndReplace
          firstText="Netflix is a global subscription-based streaming service that offers a wide vari"
          secondText="We shouldn’t know that name."
          typeSpeed={28}
          backspaceSpeed={18}
          pauseMs={500}
          onBeforeBackspace={() => {
            if (ctx.triggerGlitch) ctx.triggerGlitch(900);
          }}
          onDone={() => ctx.setTyping(false)}
        />
      </span>,
    ]);
    return true;
  }

  if (lower === "commands") {
    const key = `sym-${Date.now()}`;
    ctx.setLines((prev) => [
      ...prev,
      <BigSymbol
        key={key}
        char="ⵄ"
        size="9rem"
        title="> There are no commands. Only pathways"
      />,
    ]);
    return true;
  }

  if (lower === "commands") {
    typeBlock(ctx, "> LINKEDIN", [
      " - There are no commands. Only paths. Choose wisely.",
    ]);
    return true;
  }

  // mode 80|auto
  if (lower.startsWith("mode ")) {
    const arg = lower.split(/\s+/)[1];
    if (arg === "80") {
      ctx.setMode80(true);
      ctx.setLines((p) => [...p, "> Mode set to 80 columns."]);
    } else if (arg === "auto") {
      ctx.setMode80(false);
      ctx.setLines((p) => [...p, "> Mode set to auto width."]);
    } else {
      ctx.setLines((p) => [...p, "> Usage: mode 80|auto"]);
    }
    return true;
  }

  // scan diagnostic (progress chain)
  if (lower === "scan") {
    const keyBase = Date.now();
    ctx.setLines((prev) => [
      ...prev,
      <Progress
        key={`p1-${keyBase}`}
        label="scanning..."
        duration={1200}
        onDone={() => {
          ctx.setLines((p2) => [
            ...p2,
            <Progress
              key={`p2-${keyBase}`}
              label="boot sectors initializing..."
              duration={1400}
              onDone={() => {
                ctx.setLines((p3) => [
                  ...p3,
                  <Progress
                    key={`p3-${keyBase}`}
                    label="disk check..."
                    duration={1600}
                    onDone={() => {
                      ctx.setLines((p4) => [...p4, "> Diagnostics complete."]);
                    }}
                  />,
                ]);
              }}
            />,
          ]);
        }}
      />,
    ]);
    return true;
  }

  // dir / ls
  if (["dir", "ls"].includes(lower)) {
    const now = new Date();
    const date = now.toLocaleDateString();
    const time = now.toLocaleTimeString();
    ctx.setLines((prev) => [
      ...prev,
      ` Volume in drive C is SIMULATION`,
      ` Directory of C:\\SIM\\USER`,
      ``,
      `${date}  ${time}    <DIR>          .`,
      `${date}  ${time}    <DIR>          ..`,
      `${date}  ${time}                 8192 reality.log`,
      `${date}  ${time}                 1024 access.key`,
      `${date}  ${time}    <DIR>          echoes`,
    ]);
    return true;
  }

  // not handled
  return false;
}
