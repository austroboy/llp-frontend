import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
    >
      {/* Left tall blue column */}
      <rect x="0" y="0" width="22" height="48" rx="2" fill="#1A5DAB" />
      {/* Top-right orange block */}
      <rect x="25" y="0" width="23" height="22" rx="2" fill="#F26522" />
      {/* Middle-right black block */}
      <rect x="25" y="25" width="23" height="10" rx="2" fill="#1A1A1A" />
      {/* Bottom-right blue block */}
      <rect x="25" y="38" width="23" height="10" rx="2" fill="#1A5DAB" />
    </svg>
  );
}
