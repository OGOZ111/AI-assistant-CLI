import { useEffect, useState } from "react";

export default function Typewriter({ text, speed = 30, onDone }) {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setDisplayed(text.slice(0, i + 1));
      i++;
      if (i === text.length) {
        clearInterval(interval);
        if (onDone) onDone();
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed, onDone]);

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
