import type { E0SymbolId } from "@/lib/challenges/electronics/e0";

export function E0SymbolIcon({
  symbolId,
  className = "h-20 w-28",
}: {
  symbolId: E0SymbolId;
  className?: string;
}) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  return (
    <svg
      viewBox="0 0 120 72"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {symbolId === "resistor" && (
        <path {...common} d="M7 36h16l8-13 12 26 12-26 12 26 12-26 9 13h15" />
      )}

      {symbolId === "led" && (
        <>
          <path {...common} d="M8 36h28m34 0h42M36 17v38l34-19-34-19Zm34 0v38" />
          <path {...common} d="m70 18 15-11m-6 2h6v6M77 29l15-11m-6 2h6v6" />
        </>
      )}

      {symbolId === "switch" && (
        <>
          <path {...common} d="M8 46h27m48 0h29M38 44l40-25" />
          <circle cx="36" cy="46" r="4" {...common} />
          <circle cx="82" cy="46" r="4" {...common} />
        </>
      )}

      {symbolId === "dc-source" && (
        <>
          <path {...common} d="M8 36h30m44 0h30M45 19v34M58 27v18M69 19v34M82 27v18" />
          <path {...common} d="M42 10h7m-3.5-3.5v7M76 10h9" />
        </>
      )}

      {symbolId === "ground" && (
        <path {...common} d="M60 7v28M34 35h52M43 46h34M51 57h18" />
      )}

      {symbolId === "dc-motor" && (
        <>
          <path {...common} d="M8 36h22m60 0h22" />
          <circle cx="60" cy="36" r="29" {...common} />
          <text
            x="60"
            y="44"
            textAnchor="middle"
            fill="currentColor"
            fontSize="23"
            fontWeight="700"
            aria-hidden="true"
          >
            M
          </text>
        </>
      )}

      {symbolId === "microcontroller" && (
        <>
          <rect x="31" y="10" width="58" height="52" rx="5" {...common} />
          {[18, 30, 42, 54].map((y) => (
            <g key={y}>
              <path {...common} d={`M18 ${y}h13M89 ${y}h13`} />
            </g>
          ))}
          <path {...common} d="M49 27h22M49 36h22M49 45h14" />
        </>
      )}

      {symbolId === "sensor" && (
        <>
          <path {...common} d="M8 36h25m54 0h25" />
          <rect x="33" y="13" width="54" height="46" rx="7" {...common} />
          <path {...common} d="M46 43c7-10 21-10 28 0M51 34c5-6 13-6 18 0M58 26h4" />
        </>
      )}

      {symbolId === "polarized-capacitor" && (
        <>
          <path {...common} d="M8 36h40m24 0h40M48 16v40M72 16c-13 9-13 31 0 40M37 9h12m-6-6v12" />
        </>
      )}
    </svg>
  );
}
