import { useState, useEffect, useRef } from "react";
import Typewriter from "./components/Typewriter.jsx";
import Progress from "./components/Progress.jsx";
import BannerReveal from "./components/BannerReveal.jsx";
import bannerRaw from "./assets/banner.txt?raw";
import useClock from "./hooks/useClock.js";
import Prompt from "./components/Prompt.jsx";
import getSteps from "./boot/steps.js";
import { handleLocalCommand } from "./cli/localCommands.jsx";
import { sendCommand } from "./api/command.js";

// Prevent React Strict Mode from double-running the boot sequence in development
// This resets on full page refresh, so the sequence still runs every reload.
let BOOT_SEQ_HAS_RUN = false;
let PREBOOT_SHOWN = false;
const SYSTEM_STATUS = {
  en: "SYSTEM ONLINE. Hello! I'm Luke's CLI assistant. Ask me anything about Luke and his projects, or type 'help' to see commands.",
  fi: "JÄRJESTELMÄ ONLINE. Hei! Olen Luken CLI-avustaja. Kysy mitä vain Lukeen ja projekteihin liittyen tai kirjoita 'help' nähdäksesi komennot.",
};
const PREBOOT_TEXT = {
  en: {
    header: "> BOOT MANAGER",
    select: "> Select Language: [ENGLISH]  [SUOMEKSI]",
    hint: "> Use arrow keys to choose, then press Enter to confirm. Press Enter again to boot.",
    helpHeader: "> BOOT HELP",
    helpSel: "> - Use arrow keys to select language, then press Enter.",
    helpBoot: "> - After confirming language, press Enter to boot.",
  },
  fi: {
    header: "> KÄYNNISTYSHALLINTA",
    select: "> Valitse kieli: [ENGLISH]  [SUOMEKSI]",
    hint: "> Valitse nuolinäppäimillä ja vahvista Enterillä. Paina Enter uudelleen käynnistääksesi.",
    helpHeader: "> KÄYNNISTYSOHJE",
    helpSel: "> - Valitse nuolinäppäimillä kieli ja vahvista Enterillä.",
    helpBoot: "> - Kielen vahvistuksen jälkeen paina Enter käynnistääksesi.",
  },
};

function App() {
  const [lines, setLines] = useState([]);
  const [lang, setLang] = useState(() => localStorage.getItem("lang") || "en");
  const [preBoot, setPreBoot] = useState(true);
  const [shouldBoot, setShouldBoot] = useState(false);
  const [preSel, setPreSel] = useState("en");
  const [preConfirmed] = useState(false);

  const [input, setInput] = useState("");
  // history removed; server handles stateless commands and AI fallback
  const [typing, setTyping] = useState(false);
  const [glitching, setGlitching] = useState(false);
  const [maskEnabled, setMaskEnabled] = useState(false);
  const [mode80, setMode80] = useState(false);
  const contentRef = useRef(null);
  const clock = useClock();
  const bootLangRef = useRef(lang);

  // Confirm language selection and immediately boot
  function chooseAndBoot(sel) {
    setPreSel(sel);
    setLang(sel);
    try {
      localStorage.setItem("lang", sel);
    } catch {
      // ignore persistence errors
    }
    setPreBoot(false);
    setShouldBoot(true);
  }

  function scrollToBottom(behavior = "auto") {
    const el = contentRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }

  // Auto-scroll to bottom whenever lines update or typing changes
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    });
  }, [lines, typing]);

  function triggerGlitch(duration = 1200) {
    setGlitching(true);
    setTimeout(() => setGlitching(false), duration);
  }

  // clock handled via useClock()

  // Tiny retro beep using Web Audio on submit / events
  function beep(freq = 520, duration = 0.08, type = "square") {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.value = freq;
      o.connect(g);
      g.connect(ctx.destination);
      const now = ctx.currentTime;
      g.gain.setValueAtTime(0.15, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      o.start(now);
      o.stop(now + duration + 0.02);
    } catch {
      // ignore audio errors (e.g., autoplay restrictions)
    }
  }

  // Append a block of lines to the terminal output
  function appendBlock(title, body = []) {
    const out = [];
    if (title) out.push(title);
    if (Array.isArray(body) && body.length) out.push(...body);
    setLines((prev) => [...prev, ...out]);
  }

  // Show banner with blocky, old-tech line-by-line reveal via BannerReveal component
  const showBannerSlow = ({
    chunkSize = 2,
    lineDelay = 35,
    linePause = 60,
    beepMode = "chunk",
    jitter = true,
    jitterPct = 0.3,
  } = {}) =>
    new Promise((resolve) => {
      const keyBase = `banner-${Date.now()}`;

      const bannerArr = bannerRaw.split("\n");

      setLines((prev) => [
        ...prev,
        <BannerReveal
          key={keyBase}
          lines={bannerArr}
          chunkSize={chunkSize}
          lineDelay={lineDelay}
          linePause={linePause}
          beepMode={beepMode}
          jitter={jitter}
          jitterPct={jitterPct}
          className=""
          onDone={() => {
            resolve();
          }}
        />,
      ]);
    });

  // Pre-boot menu on mount (guarded against Strict Mode double-effect)
  useEffect(() => {
    if (PREBOOT_SHOWN) return;
    PREBOOT_SHOWN = true;
    // Minimal pre-boot: show only the selector overlay (no initial lines)
    setLines((prev) => prev);
  }, []);

  // Keyboard handling for pre-boot language selection and boot
  useEffect(() => {
    if (!preBoot || shouldBoot) return;
    const onKeyDown = (e) => {
      const key = e.key;
      if (
        ["ArrowLeft", "ArrowUp", "ArrowRight", "ArrowDown", "Enter"].includes(
          key
        )
      ) {
        e.preventDefault();
      }
      if (key === "ArrowLeft" || key === "ArrowUp") {
        setPreSel("en");
      } else if (key === "ArrowRight" || key === "ArrowDown") {
        setPreSel("fi");
      } else if (key === "Enter") {
        // Confirm language and immediately boot
        bootLangRef.current = preSel;
        setLang(preSel);
        try {
          localStorage.setItem("lang", preSel);
        } catch {
          // ignore persistence errors
        }
        setPreBoot(false);
        setShouldBoot(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [preBoot, shouldBoot, preSel, lang]);

  // Boot sequence when user starts it
  useEffect(() => {
    if (!shouldBoot || BOOT_SEQ_HAS_RUN) return;
    BOOT_SEQ_HAS_RUN = true;

    setTyping(true);

    const addProgress = (label, duration) =>
      new Promise((resolve) => {
        const keyBase = `${label}-${Date.now()}`;
        setLines((prev) => [
          ...prev,
          <Progress
            key={keyBase}
            label={label}
            duration={duration}
            onDone={() => resolve()}
          />,
        ]);
      });

    const appendTyped = (text, onDone, speed = 30) => {
      setLines((prev) => [
        ...prev,
        <>
          <span>&gt; </span>
          <Typewriter
            text={text}
            speed={speed}
            onDone={onDone}
            onTick={() => scrollToBottom("auto")}
          />
        </>,
      ]);
    };

    (async () => {
      // Tiny pause after pre-boot
      await new Promise((r) => setTimeout(r, 200));

      // Loading bars in selected language
      const activeLang = bootLangRef.current || "en";
      for (const [label, duration] of getSteps(activeLang)) {
        await addProgress(label, duration);
      }

      // Clear pre-boot and progress lines
      setLines([]);

      // Banner then ONLINE
      await showBannerSlow({
        chunkSize: 2,
        lineDelay: 35,
        linePause: 60,
        beepMode: "chunk",
        jitter: true,
        jitterPct: 0.3,
      });
      await new Promise((r) => setTimeout(r, 250));
      appendTyped(
        SYSTEM_STATUS[activeLang] || SYSTEM_STATUS.en,
        () => setTyping(false),
        30
      );
    })();
  }, [shouldBoot]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!input.trim() || typing) return;

    // Hidden command to trigger a glitch without calling the server
    if (input.trim().toLowerCase() === "/glitch") {
      setInput("");
      setLines((prev) => [
        ...prev,
        <>
          <span className="text-white">&gt; /glitch</span>
        </>,
      ]);
      triggerGlitch();
      return;
    }

    const message = input.trim();
    // Clear the input immediately
    setInput("");
    // Beep for that retro feel
    beep();

    // Show the user's line in white
    setLines((prev) => [
      ...prev,
      <>
        <span className="text-white">&gt; {message}</span>
      </>,
    ]);
    // Handle simple local CLI commands without contacting the server
    const lower = message.toLowerCase();

    // Pre-boot handling
    if (preBoot && !shouldBoot) {
      if (
        lower === "reset" ||
        lower === "nollaa" ||
        lower === "uudelleenkäynnistä" ||
        lower === "uudelleenkaynnista"
      ) {
        setLines((prev) => [
          ...prev,
          lang === "fi" ? "> Käynnistetään uudelleen..." : "> Resetting...",
        ]);
        setTimeout(() => window.location.reload(), 200);
        return;
      }
      if (["1", "en", "lang en", "kieli en"].includes(lower)) {
        setLang("en");
        localStorage.setItem("lang", "en");
        setLines((prev) => [...prev, "> Language set: English"]);
        return;
      }
      if (["2", "fi", "lang fi", "kieli fi"].includes(lower)) {
        setLang("fi");
        localStorage.setItem("lang", "fi");
        setLines((prev) => [...prev, "> Kieli asetettu: suomi"]);
        return;
      }
      if (lower === "help") {
        const t = PREBOOT_TEXT[lang] || PREBOOT_TEXT.en;
        setLines((prev) => [...prev, t.helpHeader, t.helpSel, t.helpBoot]);
        return;
      }
      if (lower === "boot") {
        setLines((prev) => [...prev, "> Booting..."]);
        setPreBoot(false);
        setShouldBoot(true);
        return;
      }
      if (lower === "/glitch") {
        triggerGlitch();
        return;
      }
      setLines((prev) => [...prev, "> Unknown command in BOOT MANAGER."]);
      return;
    }
    const handled = await handleLocalCommand(lower, {
      setLines,
      setMode80,
      setMaskEnabled,
      maskEnabled,
      setLang,
      appendBlock,
      setTyping,
      showBannerSlow,
      triggerGlitch,
      scrollToBottom: () => scrollToBottom("auto"),
      lang,
    });
    if (handled) return;

    setTyping(true);
    try {
      const reply = await sendCommand(message, lang);
      setLines((prev) => [
        ...prev,
        <>
          <span>&gt; </span>
          <span className="whitespace-pre-wrap">
            <Typewriter
              text={reply}
              speed={40}
              onTick={() => scrollToBottom("auto")}
              onDone={() => {
                setTyping(false);
                if (Math.random() < 0.08) triggerGlitch(1200);
              }}
            />
          </span>
        </>,
      ]);

      // optionally track history locally here if needed in the future
    } catch {
      setLines((prev) => [
        ...prev,
        "> Error contacting server. Falling back to local help.",
      ]);
      setTyping(false);
    }
  }

  return (
    <div
      className={`${
        glitching ? "glitch-active" : ""
      } glitch-container min-h-screen bg-black text-green-400 font-mono flex items-center justify-center p-4`}
    >
      {/* Fullscreen glitch overlay */}
      <div className="glitch-overlay" />

      {/* Centered CMD-style window (no flicker on the window chrome) */}
      <div className="w-[95vw] max-w-3xl border border-gray-700 rounded-md shadow-[0_0_40px_rgba(0,255,0,0.15)] bg-black/95">
        {/* Title bar */}
        <div className="flex items-center justify-between h-8 px-3 bg-[#0b0b0b] border-b border-gray-700 text-gray-300 text-xs tracking-wide select-none">
          <span>C:\System\Luke.cmd</span>
          <div className="flex items-center gap-1 opacity-80">
            <span className="inline-block w-3 h-3 bg-gray-600" />
            <span className="inline-block w-3 h-3 bg-gray-600" />
            <span className="inline-block w-3 h-3 bg-gray-600" />
          </div>
        </div>

        {/* Content area */}
        <div
          ref={contentRef}
          className={`p-4 h-[65vh] md:h-[70vh] overflow-y-auto terminal-scroll crt ${
            maskEnabled ? "pixel-mask" : ""
          }`}
        >
          {/* Apply glitch only to output lines, not the whole window */}
          <div className={mode80 ? "mode-80" : undefined}>
            <div className="glitch-target">
              {preBoot && !shouldBoot && (
                <div className="mb-2">
                  <div>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={() => chooseAndBoot("en")}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ")
                          chooseAndBoot("en");
                      }}
                      className={
                        (preSel === "en"
                          ? "underline text-green-200 pulse-soft"
                          : "opacity-50") +
                        " cursor-pointer select-none focus:outline-none"
                      }
                    >
                      [ENGLISH]
                    </span>
                    <span> </span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={() => chooseAndBoot("fi")}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ")
                          chooseAndBoot("fi");
                      }}
                      className={
                        (preSel === "fi"
                          ? "underline text-green-200 pulse-soft"
                          : "opacity-50") +
                        " cursor-pointer select-none focus:outline-none"
                      }
                    >
                      [SUOMEKSI]
                    </span>
                  </div>
                  {!preConfirmed ? (
                    <div>
                      {
                        "Press Enter to Select Language. Valitse kieli painamalla Enter-painiketta."
                      }
                    </div>
                  ) : (
                    <div>
                      {lang === "fi"
                        ? "Paina Enter käynnistääksesi."
                        : "Press Enter to boot."}
                    </div>
                  )}
                </div>
              )}
              {lines.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>

            {!preBoot && (
              <form
                onSubmit={handleSubmit}
                className="mt-4 flex items-center gap-2 flex-wrap"
              >
                <Prompt path="C:\\SIM\\ACTIVE_USER" clock={clock}>
                  {typing ? (
                    <span className="cursor-block" aria-hidden="true" />
                  ) : (
                    <input
                      className="bg-black text-white caret-white outline-none flex-1 placeholder:text-white/40 border-b border-white/30 focus:border-white transition-colors selection:bg-green-500/20 selection:text-white"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      autoFocus
                      placeholder="type and press Enter…"
                    />
                  )}
                </Prompt>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
