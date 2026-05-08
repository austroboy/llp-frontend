"use client";

import { useEffect, useState } from "react";

const LAUNCH_DATE = new Date("2026-05-01T00:00:00+06:00");
const MSG = "🚧  Site is under development — expected to go live on May 1st  🚧";

export function UnderDevBanner() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (new Date() >= LAUNCH_DATE) setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <div className="relative z-[60] w-full overflow-hidden bg-amber-500 text-white font-semibold text-sm select-none">
      <div className="animate-marquee-left flex whitespace-nowrap py-2.5">
        {Array.from({ length: 8 }).map((_, i) => (
          <span key={i} className="mx-12 shrink-0">{MSG}</span>
        ))}
      </div>
    </div>
  );
}
