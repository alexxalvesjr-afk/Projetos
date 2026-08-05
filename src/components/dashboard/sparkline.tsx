import { cn } from "@/lib/utils";

/**
 * The shape of a series, at tile size.
 *
 * Deliberately unlabelled and unhoverable: it sits beside a number that already
 * carries the value, and its only job is to say whether that number has been
 * climbing or sagging. Anything that needs reading precisely belongs in the
 * chart on /reports, not in a 100×34 box.
 */
export function Sparkline({
  values,
  className,
  tone = "currentColor",
}: {
  values: number[];
  className?: string;
  tone?: string;
}) {
  // Two points is the minimum that can express a direction.
  if (values.length < 2) {
    return (
      <svg
        viewBox="0 0 100 34"
        preserveAspectRatio="none"
        className={cn("h-8.5 w-25", className)}
        aria-hidden
      >
        <line
          x1="0"
          y1="30"
          x2="100"
          y2="30"
          stroke={tone}
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.35"
        />
      </svg>
    );
  }

  const max = Math.max(...values);
  const min = Math.min(...values);
  // A flat series would divide by zero; park it mid-height instead.
  const span = max - min || 1;

  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * 100;
    const y = 30 - ((value - min) / span) * 26;
    return [x, y] as const;
  });

  const line = points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const area = `0,34 ${line} 100,34`;
  const [lastX, lastY] = points[points.length - 1];

  return (
    <svg
      viewBox="0 0 100 34"
      preserveAspectRatio="none"
      className={cn("h-8.5 w-25 overflow-visible", className)}
      aria-hidden
    >
      <polygon points={area} fill={tone} opacity="0.12" />
      <polyline
        points={line}
        fill="none"
        stroke={tone}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {/* The endpoint is where the eye lands — mark where the series ended up. */}
      <circle cx={lastX} cy={lastY} r="2.5" fill={tone} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
