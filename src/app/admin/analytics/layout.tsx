import type { ReactNode } from "react";

export default function AnalyticsLayout({ children }: { children: ReactNode }) {
  return <div className="px-6 py-8 max-w-[1440px] mx-auto">{children}</div>;
}
