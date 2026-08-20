import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

/**
 * Wordmark. The glyph is a "D" cut from a gold plate — drawn inline as SVG so
 * it stays crisp, themeable and free of a network request.
 *
 * The counter is punched with `evenodd` rather than painted over, so the mark
 * survives on any background instead of only on the one it was designed for.
 * The letter takes `--primary-foreground`, never white: gold is a light hue
 * and white on it is unreadable.
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
        <linearGradient id="duboss-mark" x1="0" y1="0" x2="32" y2="32">
          <stop
            offset="0%"
            stopColor="color-mix(in oklch, var(--primary) 82%, white)"
          />
          <stop offset="55%" stopColor="var(--primary)" />
          <stop
            offset="100%"
            stopColor="color-mix(in oklch, var(--primary) 72%, oklch(0.42 0.08 58))"
          />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#duboss-mark)" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10.6 9.4h5.6a6.6 6.6 0 0 1 0 13.2h-5.6V9.4Zm3.4 3.3v6.6h2.2a3.3 3.3 0 0 0 0-6.6h-2.2Z"
        fill="var(--primary-foreground)"
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
          {BRAND.name}
        </span>
      ) : null}
    </span>
  );
}
