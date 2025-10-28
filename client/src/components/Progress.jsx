import { useEffect, useRef, useState } from "react";

export default function Progress({
  label = "processing...",
  duration = 2000,
  onDone,
}) {
  const [pct, setPct] = useState(0);
  const rafRef = useRef();
  const doneRef = useRef(false);

  useEffect(() => {
    const dur = Number(duration);
    if (!Number.isFinite(dur) || dur <= 0) {
      setPct(100);
      if (onDone && !doneRef.current) {
        doneRef.current = true;
        setTimeout(() => {
          try {
            onDone();
          } catch (err) {
            // swallow callback errors to avoid crashing UI
            console.error("Progress onDone error:", err);
          }
        }, 0);
      }
      return () => {};
    }

    const start = performance.now();
    const tick = (t) => {
      const elapsed = t - start;
      const raw = (elapsed / dur) * 100;
      const p = Math.min(100, Math.max(0, Math.floor(raw)) || 0);
      setPct(p);
      if (p < 100) {
        rafRef.current = requestAnimationFrame(tick);
      } else if (onDone && !doneRef.current) {
        doneRef.current = true;
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = undefined;
        try {
          onDone();
        } catch (err) {
          console.error("Progress onDone error:", err);
        }
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [duration, onDone]);

  const totalBars = 20;
  const safePct = Number.isFinite(pct) ? Math.max(0, Math.min(100, pct)) : 0;
  const filled = Math.max(
    0,
    Math.min(totalBars, Math.floor((safePct / 100) * totalBars) || 0)
  );
  const remaining = Math.max(0, totalBars - filled);
  const bar = `[${"#".repeat(filled)}${".".repeat(
    remaining
  )}] ${safePct}% ${label}`;

  return (
    <div>
      <span>{bar}</span>
    </div>
  );
}
