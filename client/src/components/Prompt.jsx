import React from "react";

export default function Prompt({
  path = "C:\\SIM\\USER",
  clock = "",
  children,
}) {
  return (
    <div className="flex flex-row flex-wrap items-baseline gap-2">
      <span className="text-green-400 select-none">{path}</span>
      {clock ? (
        <span className="text-green-400 select-none">[{clock}]&gt;</span>
      ) : (
        <span className="text-green-400 select-none">&gt;</span>
      )}
      <span className="text-green-100">{children}</span>
    </div>
  );
}
