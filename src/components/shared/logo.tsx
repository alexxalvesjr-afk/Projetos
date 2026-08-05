import { cn } from "@/lib/utils";

/**
 * Compact mark for places a 379×85 lockup cannot go — the collapsed sidebar,
 * chiefly. Drawn inline rather than cropped from the artwork: the car graphic
 * and the wordmark overlap in the source file, so there is no rectangle that
 * isolates the symbol cleanly.
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

/**
 * The brand lockup.
 *
 * The artwork already contains the word "Mypremium", so nothing is set beside
 * it — a text wordmark next to a wordmark image reads as a duplicate. The name
 * lives in `alt`, which is where a screen reader expects it.
 */
export function Logo({
  className,
  showWordmark = true,
}: {
  className?: string;
  showWordmark?: boolean;
}) {
  if (!showWordmark) return <LogoMark className={className} />;

  return (
    // A plain <img>: the file is a fixed 379×85 asset in the layout of every
    // page, so there is nothing for next/image's optimiser to earn back.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo-mypremium.png"
      alt="Mypremium"
      width={379}
      height={85}
      className={cn("h-9 w-auto object-contain", className)}
    />
  );
}
