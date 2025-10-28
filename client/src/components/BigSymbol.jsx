import React from "react";

export default function BigSymbol({
  char = "ⵄ",
  size = "12rem",
  title = null,
}) {
  return (
    <div className="my-4 flex flex-col items-center justify-center select-none">
      {title ? <div className="mb-2 text-green-400">{title}</div> : null}
      <div
        className="text-green-400"
        style={{
          fontFamily:
            "'Noto Sans Tifinagh', ui-sans-serif, system-ui, sans-serif",
          fontSize: size,
          lineHeight: 1,
          filter: "drop-shadow(0 0 4px rgba(0,255,0,0.25))",
        }}
      >
        {char}
      </div>
    </div>
  );
}
