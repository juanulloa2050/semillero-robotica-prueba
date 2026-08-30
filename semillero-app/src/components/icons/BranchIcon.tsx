import type { BranchId } from "@/lib/types";

const PATHS: Record<BranchId, React.ReactNode> = {
  design: (
    <>
      <path d="M12 3 3 7.5 12 12l9-4.5L12 3Z" />
      <path d="M3 16.5 12 21l9-4.5" />
      <path d="M3 12l9 4.5 9-4.5" />
    </>
  ),
  mechanics: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2.2M12 18.8V21M21 12h-2.2M5.2 12H3M18.4 5.6l-1.55 1.55M7.15 16.85 5.6 18.4M18.4 18.4l-1.55-1.55M7.15 7.15 5.6 5.6" />
    </>
  ),
  electronics: (
    <>
      <rect x="8" y="8" width="8" height="8" rx="1" />
      <path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" />
    </>
  ),
  control: (
    <>
      <path d="M4 15a8 8 0 1 1 16 0" />
      <path d="M12 15 16 9" />
      <circle cx="12" cy="15" r="1.2" />
    </>
  ),
  software: (
    <>
      <path d="m9 8-4 4 4 4" />
      <path d="m15 8 4 4-4 4" />
    </>
  ),
  ai: (
    <>
      <circle cx="6" cy="6" r="1.8" />
      <circle cx="18" cy="6" r="1.8" />
      <circle cx="12" cy="13" r="1.8" />
      <circle cx="6" cy="19" r="1.8" />
      <circle cx="18" cy="19" r="1.8" />
      <path d="M7.5 7 11 12M13 12l4.5-5M11 14.5 7.5 18M13 14.5l4.5 3.5" />
    </>
  ),
  systems: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="1.5" />
      <path d="m7 9 3 3-3 3M13 15h4" />
    </>
  ),
};

export function BranchIcon({
  branch,
  className,
  style,
}: {
  branch: BranchId;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      {PATHS[branch]}
    </svg>
  );
}
