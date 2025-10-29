import React from "react";
import Progress from "../components/Progress.jsx";
import Typewriter from "../components/Typewriter.jsx";
import TypeAndReplace from "../components/TypeAndReplace.jsx";
import BigSymbol from "../components/BigSymbol.jsx";
import { sendCommand } from "../api/command.js";

// --- Lightweight client-side state for ping history (persists during session) ---
const PING_HISTORY = [];
const PING_HISTORY_MAX = 24; // keep last 24 samples

function renderSparkline(values) {
  if (!values || values.length === 0) return "";
  const blocks = "▁▂▃▄▅▆▇█"; // 8 levels
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1, max - min);
  return values
    .map((v) => {
      const norm = (v - min) / span; // 0..1
      const idx = Math.min(
        blocks.length - 1,
        Math.max(0, Math.floor(norm * (blocks.length - 1)))
      );
      return blocks[idx];
    })
    .join("");
}

// (Removed) typeBlock helper; informational commands now come from server

// Helper: call backend for a command and type the response
async function typeServer(ctx, cmd, speed = 30) {
  try {
    ctx.setTyping?.(true);
    const reply = await sendCommand(cmd, ctx.lang);
    const key = `sv-${Date.now()}`;
    ctx.setLines((prev) => [
      ...prev,
      <span key={key}>
        <span className="whitespace-pre-wrap">
          <Typewriter
            text={reply}
            speed={speed}
            onTick={() => ctx.scrollToBottom?.("auto")}
            onDone={() => ctx.setTyping?.(false)}
          />
        </span>
      </span>,
    ]);
  } catch {
    ctx.setLines((prev) => [...prev, "> Server unavailable for this command."]);
    ctx.setTyping?.(false);
  }
  return true;
}

export async function handleLocalCommand(message, ctx) {
  const lower = message.toLowerCase().trim();

  // helper to render help lines for a given language
  const getHelpLines = (lang) => {
    const L = lang === "fi";
    return L
      ? [
          "Käytettävissä olevat komennot:",
          "  apua            - näytä tämä ohje",
          "  tyhjennä        - tyhjennä näkymä (alias: clear / cls)",
          "  nollaa          - käynnistä sovellus uudelleen (alias: reset / uudelleenkäynnistä)",
          "  hakemisto       - listaa hakemiston sisältö (alias: dir / ls)",
          "  tila            - näytä palvelimen tila (status)",
          "  ping            - mitattu viive (ms)",
          "  lang en|fi      - vaihda kieltä lennossa",
          "  banneri         - näytä aloitusbanneri uudelleen",
          "  skannaa         - suorita diagnostiikka edistymispalkeilla",
          "  maski päälle|pois - ota pikselimaski käyttöön tai pois",
          "  maski vaihda    - vaihda maskin tila",
          "  tila 80|auto    - rajoita ~80 merkkiin tai palauta automaattinen tila",
          "  tietoa          - mitä tämä sovellus on",
          "  ominaisuudet    - keskeiset ominaisuudet",
          "  vinkit          - vinkkejä ja pikanäppäimiä",
          "  tekijät         - sovelluksen tekijät",
          "  versio          - näytä versiotiedot (alias: ver)",
          "  muutokset       - viimeisimmät muutokset (alias: changelog)",
          "  kysymykset      - usein kysytyt kysymykset (alias: faq)",
          "  tarina          - interaktiivinen tarina",
          "  /häiriö         - visuaalinen glitch-efekti",
          "  projektit       - Luken projektit",
          "  kokemus         - Luken työkokemus",
          "  taidot          - taidot ja teknologiat",
          "  github          - Luken GitHub-profiili",
          "  linkedin        - Luken LinkedIn-profiili",
          "  harjoittelu     - harjoittelun tiedot",
          "  koulutus        - koulutustausta",
          "  komennot        - listaa kaikki komennot",
        ]
      : [
          "Available commands:",
          "  help            - show this help",
          "  clear / cls     - clear the screen",
          "  reset           - refresh the page",
          "  dir / ls        - list directory",
          "  status          - show server status",
          "  ping            - measure latency",
          "  lang en|fi      - switch language on the fly",
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
        ];
  };

  // clear / cls
  if (["clear", "cls"].includes(lower)) {
    ctx.setLines([]);
    return true;
  }

  // help (localized)
  if (lower === "help" || (lower === "apua" && ctx.lang === "fi")) {
    ctx.setLines((prev) => [...prev, ...getHelpLines(ctx.lang)]);
    return true;
  }

  // language switch: lang en|fi
  if (lower === "lang") {
    ctx.setLines((prev) => [
      ...prev,
      ctx.lang === "fi" ? "> Käyttö: lang en|fi" : "> Usage: lang en|fi",
    ]);
    return true;
  }
  if (lower.startsWith("lang ")) {
    const arg = lower.split(/\s+/)[1];
    if (arg === "en" || arg === "fi") {
      ctx.setLang?.(arg);
      try {
        localStorage.setItem("lang", arg);
      } catch {
        // ignore persistence errors
      }
      ctx.setLines((prev) => [
        ...prev,
        arg === "fi" ? "> Kieli asetettu: suomi" : "> Language set: English",
        ...getHelpLines(arg),
      ]);
    } else {
      ctx.setLines((prev) => [
        ...prev,
        ctx.lang === "fi" ? "> Käyttö: lang en|fi" : "> Usage: lang en|fi",
      ]);
    }
    return true;
  }

  // Finnish alias: kieli en|fi
  if (lower === "kieli") {
    ctx.setLines((prev) => [
      ...prev,
      ctx.lang === "fi" ? "> Käyttö: kieli en|fi" : "> Usage: kieli en|fi",
    ]);
    return true;
  }
  if (lower.startsWith("kieli ")) {
    const arg = lower.split(/\s+/)[1];
    if (arg === "en" || arg === "fi") {
      ctx.setLang?.(arg);
      try {
        localStorage.setItem("lang", arg);
      } catch {
        // ignore persistence errors
      }
      ctx.setLines((prev) => [
        ...prev,
        arg === "fi" ? "> Kieli asetettu: suomi" : "> Language set: English",
        ...getHelpLines(arg),
      ]);
    } else {
      ctx.setLines((prev) => [
        ...prev,
        ctx.lang === "fi" ? "> Käyttö: kieli en|fi" : "> Usage: kieli en|fi",
      ]);
    }
    return true;
  }

  // reset (refresh page) - support FI aliases too
  if (
    lower === "reset" ||
    lower === "nollaa" ||
    lower === "uudelleenkäynnistä" ||
    lower === "uudelleenkaynnista"
  ) {
    ctx.setLines((prev) => [
      ...prev,
      ctx.lang === "fi" ? "> Käynnistetään uudelleen..." : "> Resetting...",
    ]);
    setTimeout(() => {
      window.location.reload();
    }, 200);
    return true;
  }

  // mask on|off|toggle
  if (lower === "mask on") {
    ctx.setMaskEnabled(true);
    ctx.setLines((prev) => [
      ...prev,
      ctx.lang === "fi"
        ? "> Pikselimaskeeraus käytössä."
        : "> Pixel mask enabled.",
    ]);
    return true;
  }
  if (lower === "mask off") {
    ctx.setMaskEnabled(false);
    ctx.setLines((prev) => [
      ...prev,
      ctx.lang === "fi"
        ? "> Pikselimaskeeraus pois käytöstä."
        : "> Pixel mask disabled.",
    ]);
    return true;
  }
  if (lower === "mask toggle") {
    const next = !ctx.maskEnabled;
    ctx.setMaskEnabled(next);
    ctx.setLines((prev) => [
      ...prev,
      next
        ? ctx.lang === "fi"
          ? "> Pikselimaskeeraus käytössä."
          : "> Pixel mask enabled."
        : ctx.lang === "fi"
        ? "> Pikselimaskeeraus pois käytöstä."
        : "> Pixel mask disabled.",
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

  // status: show emulated server status (try backend, fallback to local)
  if (lower === "status") {
    try {
      ctx.setTyping?.(true);
      const started = performance.now();
      const res = await fetch("http://localhost:5000/api/status");
      const ms = Math.max(1, Math.round(performance.now() - started));
      const data = await res.json();
      const load = Math.min(
        99,
        Math.max(
          1,
          Math.round((Date.now() % 100000) / 1000 + (Math.random() * 10 - 5))
        )
      );
      const lines = [
        "> STATUS",
        ` Server: ${data.online ? "ONLINE" : "OFFLINE"} (${ms}ms)`,
        ` Environment: ${data.env}`,
        ` Languages: ${(data.langs || ["en"]).join(", ")}`,
        ` AI Key: ${data.hasAI ? "Detected" : "Not detected"}`,
        ` Load: ${String(load).padStart(2, " ")}%`,
        ` Time: ${new Date(data.now || Date.now()).toLocaleString()}`,
      ].join("\n");
      const key = `st-${Date.now()}`;
      ctx.setLines((prev) => [
        ...prev,
        <span key={key} className="whitespace-pre-wrap">
          <Typewriter
            text={lines}
            speed={24}
            onTick={() => ctx.scrollToBottom?.("auto")}
            onDone={() => ctx.setTyping?.(false)}
          />
        </span>,
      ]);
    } catch {
      // Fallback to local emulation
      const jitter = Math.round(40 + Math.random() * 60);
      const load = Math.round(20 + Math.random() * 55);
      const lines = [
        "> STATUS",
        ` Server: ONLINE (~${jitter}ms)`,
        ` Environment: emulated`,
        ` Languages: en, fi`,
        ` AI Key: Unknown`,
        ` Load: ${load}%`,
        ` Time: ${new Date().toLocaleString()}`,
      ].join("\n");
      const key = `stl-${Date.now()}`;
      ctx.setLines((prev) => [
        ...prev,
        <span key={key} className="whitespace-pre-wrap">
          <Typewriter
            text={lines}
            speed={24}
            onTick={() => ctx.scrollToBottom?.("auto")}
          />
        </span>,
      ]);
      ctx.setTyping?.(false);
    }
    return true;
  }

  // ping: measure latency to backend; fallback to emulated
  if (lower === "ping") {
    try {
      const started = performance.now();
      const res = await fetch("http://localhost:5000/api/status/ping");
      await res.json();
      const ms = Math.max(1, Math.round(performance.now() - started));
      // update history and render a tiny sparkline
      PING_HISTORY.push(ms);
      if (PING_HISTORY.length > PING_HISTORY_MAX) PING_HISTORY.shift();
      const spark = renderSparkline(PING_HISTORY);
      ctx.setLines((prev) => [...prev, `> PING ${ms}ms  ${spark}`]);
    } catch {
      const ms = Math.round(40 + Math.random() * 120);
      PING_HISTORY.push(ms);
      if (PING_HISTORY.length > PING_HISTORY_MAX) PING_HISTORY.shift();
      const spark = renderSparkline(PING_HISTORY);
      ctx.setLines((prev) => [...prev, `> PING ~${ms}ms (emulated)  ${spark}`]);
    }
    return true;
  }

  // info blocks (backend-routed)
  if (lower === "about") {
    return await typeServer(ctx, lower, 30);
  }
  if (lower === "features") {
    return await typeServer(ctx, lower, 30);
  }
  if (lower === "tips") {
    return await typeServer(ctx, lower, 30);
  }
  if (lower === "credits") {
    return await typeServer(ctx, lower, 30);
  }
  if (lower === "version" || lower === "ver") {
    return await typeServer(ctx, "version", 30);
  }
  if (lower === "changelog") {
    return await typeServer(ctx, lower, 30);
  }
  if (lower === "faq") {
    return await typeServer(ctx, lower, 30);
  }
  if (lower === "story") {
    return await typeServer(ctx, lower, 30);
  }
  if (lower === "projects") {
    return await typeServer(ctx, lower, 30);
  }

  if (lower === "experience") {
    return await typeServer(ctx, lower, 30);
  }

  if (lower === "skills") {
    return await typeServer(ctx, lower, 30);
  }

  if (lower === "github") {
    return await typeServer(ctx, lower, 30);
  }

  if (lower === "internship") {
    return await typeServer(ctx, lower, 30);
  }

  if (lower === "languages") {
    return await typeServer(ctx, lower, 30);
  }

  if (lower === "technologies") {
    return await typeServer(ctx, lower, 30);
  }

  if (lower === "education") {
    return await typeServer(ctx, lower, 30);
  }

  // recruiter mode (dedicated backend route)
  if (
    lower === "access recruiter" ||
    lower === "recruiter_mode" ||
    lower === "recruiter"
  ) {
    try {
      ctx.setTyping?.(true);
      const res = await fetch(
        `http://localhost:5000/api/recruiter?lang=${encodeURIComponent(
          ctx.lang || "en"
        )}`
      );
      const data = await res.json();
      // Normalize message into multiline text if backend used inline separators
      let normalized = String(data.message ?? "");
      if (!/\r?\n/.test(normalized)) {
        normalized = normalized.replace(/\s*>\s*/g, "\n> ").trim();
      }
      const key = `rec-${Date.now()}`;
      ctx.setLines((prev) => [
        ...prev,
        <span key={key}>
          <span className="whitespace-pre-wrap">
            <Typewriter
              text={normalized}
              speed={30}
              onTick={() => ctx.scrollToBottom?.("auto")}
              onDone={() => ctx.setTyping?.(false)}
            />
          </span>
        </span>,
      ]);
    } catch {
      ctx.setLines((prev) => [...prev, "> Recruiter endpoint unavailable."]);
      ctx.setTyping?.(false);
    }
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

  // backend easter eggs
  if (["bandersnatch", "control", "mirror"].includes(lower)) {
    return await typeServer(ctx, lower, 30);
  }

  // mode 80|auto
  if (lower.startsWith("mode ")) {
    const arg = lower.split(/\s+/)[1];
    if (arg === "80") {
      ctx.setMode80(true);
      ctx.setLines((p) => [
        ...p,
        ctx.lang === "fi" ? "> Tila: 80 merkkiä." : "> Mode set to 80 columns.",
      ]);
    } else if (arg === "auto") {
      ctx.setMode80(false);
      ctx.setLines((p) => [
        ...p,
        ctx.lang === "fi"
          ? "> Tila: automaattinen leveys."
          : "> Mode set to auto width.",
      ]);
    } else {
      ctx.setLines((p) => [
        ...p,
        ctx.lang === "fi" ? "> Käyttö: mode 80|auto" : "> Usage: mode 80|auto",
      ]);
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
        label={ctx.lang === "fi" ? "skannataan..." : "scanning..."}
        duration={1200}
        onDone={() => {
          ctx.setLines((p2) => [
            ...p2,
            <Progress
              key={`p2-${keyBase}`}
              label={
                ctx.lang === "fi"
                  ? "käynnistyssektorit alustetaan..."
                  : "boot sectors initializing..."
              }
              duration={1400}
              onDone={() => {
                ctx.setLines((p3) => [
                  ...p3,
                  <Progress
                    key={`p3-${keyBase}`}
                    label={
                      ctx.lang === "fi" ? "levytarkastus..." : "disk check..."
                    }
                    duration={1600}
                    onDone={() => {
                      ctx.setLines((p4) => [
                        ...p4,
                        ctx.lang === "fi"
                          ? "> Diagnostiikka valmis."
                          : "> Diagnostics complete.",
                      ]);
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
    return await typeServer(ctx, lower, 30);
  }

  // not handled
  return false;
}
