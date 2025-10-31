import React from "react";

export default function Prompt({
  path = "C:\\SIM\\USER",
  clock = "",
  children,
}) {
  return (
    <div className="flex flex-row flex-nowrap items-baseline gap-1 sm:gap-2">
      <span className="text-green-400 select-none">{path}</span>
      {clock ? (
        <span className="text-green-400 select-none">[{clock}]&gt;</span>
      ) : (
        <span className="text-green-400 select-none">&gt;</span>
      )}
      <span className="text-green-100 flex flex-1 min-w-0 items-baseline">
        {children}
      </span>
    </div>
  );
}
