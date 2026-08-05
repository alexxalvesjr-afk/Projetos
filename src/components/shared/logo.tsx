import { cn } from "@/lib/utils";

/**
 * Wordmark. The glyph is a geometric "M" — drawn inline as SVG so it stays
 * crisp, themeable and free of a network request.
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
        <linearGradient id="mypremium-mark" x1="0" y1="0" x2="32" y2="32">
          <stop offset="0%" stopColor="var(--primary)" />
          <stop
            offset="100%"
            stopColor="color-mix(in oklch, var(--primary) 62%, oklch(0.42 0.17 12))"
          />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#mypremium-mark)" />
      <path
        d="M10 22V10.5h3.4L16 15.2l2.6-4.7H22V22h-3.1v-6.4l-2.2 3.9h-1.4l-2.2-3.9V22H10Z"
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
          Mypremium
        </span>
      ) : null}
    </span>
  );
}
