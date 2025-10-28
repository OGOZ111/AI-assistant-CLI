import { useState, useEffect, useRef } from "react";
import Typewriter from "./components/Typewriter.jsx";
import Progress from "./components/Progress.jsx";
import BannerReveal from "./components/BannerReveal.jsx";
import bannerRaw from "./assets/banner.txt?raw";
import useClock from "./hooks/useClock.js";
import Prompt from "./components/Prompt.jsx";
import steps from "./boot/steps.js";
import { handleLocalCommand } from "./cli/localCommands.jsx";

// Prevent React Strict Mode from double-running the boot sequence in development
// This resets on full page refresh, so the sequence still runs every reload.
let BOOT_SEQ_HAS_RUN = false;

function App() {
  const [lines, setLines] = useState(["> SYSTEM BOOTING..."]);
  const [systemStatus] = useState(
    "SYSTEM ONLINE. Hello There! I am Luke's CLI assistant. I can help you with various tasks and commands about Luke and his projects. Ask me anything! or type 'help' to see available commands. You can also type 'about' to learn more about me."
  );
  const [input, setInput] = useState("");
  const [history, setHistory] = useState([]);
  const [typing, setTyping] = useState(false);
  const [glitching, setGlitching] = useState(false);
  const [maskEnabled, setMaskEnabled] = useState(false);
  const [mode80, setMode80] = useState(false);
  const contentRef = useRef(null);
  const clock = useClock();

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
      // Use original BAN DERSNATCH banner (no fox)
      const _originalBannerText = `  ____                  _                      _       _       _
 |  _ \\                | |                    | |     | |     | |
 | |_) | __ _ _ __   ___| |__   ___ _ __   __ _| |_ ___| |_ ___| |__
 |  _ < / _' | '_ \\\\ / __| '_ \\\\ / _ \\\\ '_ \\\\ / _' | __/ __| __/ __| '_ \\\\ 
 | |_) | (_| | | | | (__| | | |  __/ | | | (_| | |_\\\\__ \\\\ |_\\\\__ \\\\ | | |
 |____/ \\\\__,_|_| |_|\\\\___|_| |_|\\\\___|_| |_|\\\\__,_|\\\\__|___/\\\\__|___/_| |_|

        BAN DERSNATCH CLI — SIMULATION TERMINAL`;
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

  // On mount, run boot sequence: scans -> banner -> SYSTEM ONLINE
  useEffect(() => {
    // Guard against Strict Mode's double-invocation in dev without persisting across refreshes
    if (BOOT_SEQ_HAS_RUN) return;
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
          <Typewriter text={text} speed={speed} onDone={onDone} />
        </>,
      ]);
    };

    // Sequence runner
    (async () => {
      // Tiny pause after booting line
      await new Promise((r) => setTimeout(r, 400));

      // Lots of realistic loading bars
      for (const [label, duration] of steps) {
        await addProgress(label, duration);
      }

      // Clear all loading lines and boot text
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
      appendTyped(systemStatus, () => setTyping(false), 30);
    })();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    const handled = await handleLocalCommand(lower, {
      setLines,
      setMode80,
      setMaskEnabled,
      maskEnabled,
      appendBlock,
      setTyping,
      showBannerSlow,
      triggerGlitch,
    });
    if (handled) return;

    setTyping(true);

    const res = await fetch("http://localhost:5000/api/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history }),
    });

    const data = await res.json();

    // Append assistant line using the shared Typewriter component
    setLines((prev) => [
      ...prev,
      <>
        <span>&gt; </span>
        <Typewriter
          text={data.reply}
          speed={40}
          onDone={() => {
            setTyping(false);
            // ~8% chance to trigger a violent glitch after an AI reply
            if (Math.random() < 0.08) {
              triggerGlitch(1200);
            }
          }}
        />
      </>,
    ]);

    // Track conversation history for server context
    setHistory((prev) => [
      ...prev,
      { role: "user", content: message },
      { role: "assistant", content: data.reply },
    ]);
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
          <span>C:\\Windows\\System32\\cmd.exe</span>
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
              {lines.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>

            <form
              onSubmit={handleSubmit}
              className="mt-4 flex items-center gap-2 flex-wrap"
            >
              <Prompt path="C:\\SIM\\USER" clock={clock}>
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
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
