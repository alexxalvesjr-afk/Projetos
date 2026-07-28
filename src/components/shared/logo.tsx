import { cn } from "@/lib/utils";

/**
 * Wordmark. The glyph is an abstracted "R" cut from a speedometer arc — drawn
 * inline as SVG so it stays crisp, themeable and free of a network request.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={cn("size-8", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id="revend-mark" x1="0" y1="0" x2="32" y2="32">
          <stop offset="0%" stopColor="var(--primary)" />
          <stop
            offset="100%"
            stopColor="color-mix(in oklch, var(--primary) 55%, var(--chart-6))"
          />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#revend-mark)" />
      <path
        d="M11 22V10.5h6.2a3.9 3.9 0 0 1 1.2 7.6L21.4 22h-3.6l-2.5-3.6h-1.1V22H11Zm3.2-6.1h2.6a1.6 1.6 0 0 0 0-3.2h-2.6v3.2Z"
        fill="white"
      />
    </svg>
  );
}

export function Logo({
  className,
  showWordmark = true,
}: {
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      {showWordmark ? (
        <span className="text-[17px] font-semibold tracking-[-0.03em]">
          Revend
        </span>
      ) : null}
    </span>
  );
}
