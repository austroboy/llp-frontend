"use client";

/**
 * Inline SVG sparkline — no chart library.
 * Renders a simple line chart inside a viewBox so it scales with width.
 */
export function HeroSparkline({
  data,
  height = 24,
  stroke = "var(--accent-blue, #2563eb)",
  strokeWidth = 1.5,
  className,
}: {
  data: number[];
  height?: number;
  stroke?: string;
  strokeWidth?: number;
  className?: string;
}) {
  if (!data || data.length === 0) {
    return (
      <svg
        viewBox="0 0 100 24"
        preserveAspectRatio="none"
        className={className}
        style={{ width: "100%", height, display: "block" }}
        aria-hidden="true"
      />
    );
  }

  const w = 100;
  const h = 24;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = data.length > 1 ? w / (data.length - 1) : 0;

  const points = data
    .map((v, i) => {
      const x = i * stepX;
      const y = h - ((v - min) / range) * h;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className={className}
      style={{ width: "100%", height, display: "block" }}
      aria-hidden="true"
    >
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        points={points}
      />
    </svg>
  );
}
