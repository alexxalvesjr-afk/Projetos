"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Fallback mark: a geometric "M", drawn inline as SVG.
 *
 * Used on its own in the collapsed sidebar, where a horizontal wordmark has
 * nowhere to go, and as the stand-in for the full lockup until the brand file
 * lands in /public.
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

/** Where the brand lockup is expected to live once uploaded. */
const LOGO_SRC = "/logo-mypremium.png";

/**
 * The brand lockup.
 *
 * Renders the real artwork from /public when it is there and silently falls
 * back to the drawn mark when it is not, so a missing file shows a wordmark
 * rather than a broken-image icon. That is the whole reason this is a client
 * component — `onError` is the only reliable signal that an image 404'd, and
 * the alternative (checking the filesystem during render) would tie a UI
 * component to the deployment's disk layout.
 */
export function Logo({
  className,
  showWordmark = true,
}: {
  className?: string;
  showWordmark?: boolean;
}) {
  const [artworkFailed, setArtworkFailed] = React.useState(false);

  if (!showWordmark) return <LogoMark className={className} />;

  if (!artworkFailed) {
    // A plain <img> rather than next/image: the optimiser wants intrinsic
    // dimensions for a file whose aspect ratio is not known here, and it would
    // turn a swapped logo into a cache-busting exercise. The asset is a few KB
    // and sits in the layout on every page — there is nothing to optimise.
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={LOGO_SRC}
        alt="Mypremium"
        className={cn("h-8 w-auto object-contain", className)}
        onError={() => setArtworkFailed(true)}
      />
    );
  }

  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="text-[17px] font-semibold tracking-[-0.03em]">
        Mypremium
      </span>
    </span>
  );
}
