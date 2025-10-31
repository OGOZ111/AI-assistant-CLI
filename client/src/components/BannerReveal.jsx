import { useEffect, useRef, useState, useCallback } from "react";

export default function BannerReveal({
  lines = [],
  chunkSize = 2,
  lineDelay = 35,
  linePause = 60,
  className = "",
  onDone,
  // Retro beep settings
  beepMode = "line", // 'none' | 'line' | 'chunk'
  beepFreq = 680,
  beepDuration = 0.03,
  beepVolume = 0.06,
  beepType = "square",
  // Old-tech timing randomness
  jitter = true,
  jitterPct = 0.3, // 30% variability
  // Responsive fit to prevent horizontal scrollbar
  responsiveFit = true,
  maxScale = 1,
  // Prefer a static image render on narrow screens to avoid scrollbars
  renderAsImageOnMobile = true,
  mobileWidthThreshold = 520,
  // Force image rendering on all screen sizes (overrides mobile-only)
  renderAsImageAlways = false,
  // Extras
  sweepOnMount = true,
  ghost = true,
}) {
  const [renderedLines, setRenderedLines] = useState([]);
  const doneRef = useRef(false);
  const audioRef = useRef(null);
  const wrapperRef = useRef(null);
  const preRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [activeChunk, setActiveChunk] = useState(null);
  const [sweeping, setSweeping] = useState(false);
  const [preferImage, setPreferImage] = useState(false);
  const [imageSrc, setImageSrc] = useState(null);

  const doBeep = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = audioRef.current || new AudioCtx();
      audioRef.current = ctx;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = beepType;
      o.frequency.value = beepFreq;
      o.connect(g);
      g.connect(ctx.destination);
      const now = ctx.currentTime;
      const vol = Math.max(0.001, Math.min(0.5, beepVolume));
      g.gain.setValueAtTime(vol, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + beepDuration);
      o.start(now);
      o.stop(now + beepDuration + 0.01);
    } catch {
      // ignore audio errors
    }
  }, [beepDuration, beepFreq, beepType, beepVolume]);

  useEffect(() => {
    // If we prefer an image, skip the chunked animation
    if (preferImage) {
      setRenderedLines(lines);
      return undefined;
    }

    let cancelled = false;
    const delay = (ms) => new Promise((r) => setTimeout(r, ms));

    (async () => {
      try {
        for (let li = 0; li < lines.length && !cancelled; li += 1) {
          const full = lines[li] ?? "";
          // Start the new line as empty
          setRenderedLines((prev) => [...prev, ""]);

          for (
            let i = 0;
            i < full.length && !cancelled;
            i += Math.max(1, chunkSize)
          ) {
            const step = Math.max(1, chunkSize);
            const nextLen = Math.min(full.length, i + step);
            const current = full.slice(0, nextLen);
            setRenderedLines((prev) => {
              const next = prev.slice();
              next[li] = current;
              return next;
            });
            setActiveChunk({ line: li, size: Math.min(step, full.length - i) });
            if (beepMode === "chunk") doBeep();

            // Small pause between chunks (simulate old hardware)
            const cd = jitter
              ? Math.max(
                  0,
                  Math.round(
                    lineDelay * (1 + (Math.random() * 2 - 1) * jitterPct)
                  )
                )
              : lineDelay;
            await delay(cd);
          }

          // Pause briefly between lines
          if (beepMode === "line") doBeep();
          const ld = jitter
            ? Math.max(
                0,
                Math.round(
                  linePause * (1 + (Math.random() * 2 - 1) * jitterPct)
                )
              )
            : linePause;
          await delay(ld);
        }
        setActiveChunk(null);
        if (!cancelled && !doneRef.current) {
          doneRef.current = true;
          try {
            if (onDone) onDone();
          } catch {
            /* noop */
          }
        }
      } catch {
        // In case anything goes wrong, complete silently
        if (!doneRef.current) {
          doneRef.current = true;
          try {
            if (onDone) onDone();
          } catch {
            /* noop */
          }
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    lines,
    chunkSize,
    lineDelay,
    linePause,
    onDone,
    beepMode,
    doBeep,
    jitter,
    jitterPct,
    preferImage,
  ]);

  // Scale down to fit container width if needed
  useEffect(() => {
    if (!responsiveFit) {
      setScale(1);
      return undefined;
    }
    const measure = () => {
      const wrap = wrapperRef.current;
      const pre = preRef.current;
      if (!wrap || !pre) return;
      const wrapW = wrap.clientWidth || 0;
      const contentW = pre.scrollWidth || 0;
      if (wrapW <= 0 || contentW <= 0) {
        setScale(1);
        return;
      }
      // Slightly conservative scale to avoid rounding-induced clipping
      const safeWrapW = Math.max(0, wrapW - 2);
      const s = Math.min(maxScale, safeWrapW / contentW);
      setScale(s < 1 ? s : 1);
    };
    measure();
    window.addEventListener("resize", measure);
    const id = setInterval(measure, 200);
    return () => {
      window.removeEventListener("resize", measure);
      clearInterval(id);
    };
  }, [responsiveFit, maxScale, renderedLines]);

  // Detect when to prefer image (narrow screens or always)
  useEffect(() => {
    const update = () => {
      if (renderAsImageAlways) {
        setPreferImage(true);
        return;
      }
      if (!renderAsImageOnMobile) {
        setPreferImage(false);
        return;
      }
      const w = wrapperRef.current?.clientWidth || window.innerWidth || 0;
      setPreferImage(w > 0 && w <= mobileWidthThreshold);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [renderAsImageOnMobile, mobileWidthThreshold, renderAsImageAlways]);

  // Generate a PNG data URL from the ASCII lines when preferring image
  useEffect(() => {
    if (!preferImage) {
      setImageSrc(null);
      return;
    }
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setImageSrc(null);
        return;
      }
      const fontFamily =
        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
      const baseFontSize = 12; // px
      const lineHeight = 14; // px
      ctx.font = `${baseFontSize}px ${fontFamily}`;
      const safe = Array.isArray(lines) ? lines : [];
      let maxW = 0;
      for (const ln of safe) {
        const w = Math.ceil(ctx.measureText(String(ln || "")).width);
        if (w > maxW) maxW = w;
      }
      const pad = 2;
      const width = Math.max(1, maxW + pad * 2);
      const height = Math.max(1, safe.length * lineHeight + pad * 2);
      const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
      // Transparent background: do not fill the canvas
      // Text
      ctx.font = `${baseFontSize}px ${fontFamily}`;
      ctx.fillStyle = "#34d399"; // green-400-ish
      let y = pad + baseFontSize; // first baseline
      for (const ln of safe) {
        ctx.fillText(String(ln || ""), pad, y);
        y += lineHeight;
      }
      const url = canvas.toDataURL("image/png");
      setImageSrc(url);
    } catch {
      setImageSrc(null);
    }
  }, [preferImage, lines]);

  // Optional one-off sweep line when mounted
  useEffect(() => {
    if (!sweepOnMount) return undefined;
    setSweeping(true);
    const id = setTimeout(() => setSweeping(false), 1200);
    return () => clearTimeout(id);
  }, [sweepOnMount]);

  return (
    <div
      ref={wrapperRef}
      className={`w-full flex justify-center ${
        sweeping ? "sweep-line" : ""
      } ${className}`}
      style={{ overflow: "hidden", width: "100%" }}
    >
      {preferImage && imageSrc ? (
        <img
          src={imageSrc}
          alt="ASCII banner"
          style={{ maxWidth: "100%", height: "auto", display: "block" }}
          onLoad={() => {
            try {
              if (!doneRef.current) {
                doneRef.current = true;
                onDone?.();
              }
            } catch {
              /* noop */
            }
          }}
        />
      ) : (
        <pre
          ref={preRef}
          className={`whitespace-pre leading-4 ${
            ghost ? "ghosting" : ""
          } p-0 m-0 overflow-x-hidden inline-block bg-transparent rounded-none`}
          style={{
            backgroundColor: "transparent",
            transform: `scale(${scale})`,
            transformOrigin: "top center",
          }}
        >
          {renderedLines.map((line, idx) => {
            const text = line || "";
            const isActive = activeChunk && activeChunk.line === idx;
            if (!isActive || activeChunk.size <= 0 || text.length === 0) {
              return (
                <span key={idx}>
                  {text}
                  {"\n"}
                </span>
              );
            }
            const end = text.length;
            const size = Math.min(activeChunk.size, end);
            const before = text.slice(0, end - size);
            const chunk = text.slice(end - size);
            return (
              <span key={idx}>
                {before}
                <span className="phosphor">{chunk}</span>
                {"\n"}
              </span>
            );
          })}
        </pre>
      )}
    </div>
  );
}
