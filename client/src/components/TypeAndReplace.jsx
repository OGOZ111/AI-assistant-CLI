import React, { useEffect, useState } from "react";

// Types firstText, then backspaces it, then types secondText.
// Props:
// - firstText: string to type initially
// - secondText: string to type after erase
// - typeSpeed: ms per char when typing (both phases)
// - backspaceSpeed: ms per char when deleting
// - pauseMs: pause between finish of firstText and start of backspace
// - onDone: callback after secondText finishes typing
export default function TypeAndReplace({
  firstText = "",
  secondText = "",
  typeSpeed = 30,
  backspaceSpeed = 20,
  pauseMs = 400,
  onBeforeBackspace,
  onDone,
}) {
  const [displayed, setDisplayed] = useState("");
  const [phase, setPhase] = useState("type1"); // type1 -> pause -> backspace -> type2 -> done

  useEffect(() => {
    let i = 0;
    let timer;

    const type = (text, speed, nextPhase) => {
      i = displayed.length; // resume from current length
      timer = setInterval(() => {
        i += 1;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) {
          clearInterval(timer);
          setPhase(nextPhase);
        }
      }, speed);
    };

    const backspace = (speed, nextPhase) => {
      i = displayed.length;
      timer = setInterval(() => {
        i -= 1;
        setDisplayed((prev) => prev.slice(0, -1));
        if (i <= 0) {
          clearInterval(timer);
          setPhase(nextPhase);
        }
      }, speed);
    };

    if (phase === "type1") {
      setDisplayed("");
      type(firstText, typeSpeed, "pause");
    } else if (phase === "pause") {
      if (onBeforeBackspace) onBeforeBackspace();
      timer = setTimeout(() => setPhase("backspace"), pauseMs);
    } else if (phase === "backspace") {
      backspace(backspaceSpeed, "type2");
    } else if (phase === "type2") {
      type(secondText, typeSpeed, "done");
    } else if (phase === "done") {
      if (onDone) onDone();
    }

    return () => clearTimeout(timer);
    // We intentionally omit dependencies to drive phase machine changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  if (!displayed) return <span />;
  const head = displayed.slice(0, -1);
  const tail = displayed.slice(-1);
  return (
    <span>
      {head}
      <span className="phosphor">{tail}</span>
    </span>
  );
}
