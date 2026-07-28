import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Empty states are a first-class screen, not a fallback. Each one names what is
 * missing, explains why the space is worth filling, and offers the action that
 * fills it.
 */
function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  compact = false,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "gap-3 px-6 py-10" : "gap-4 px-6 py-16",
        className,
      )}
    >
      <div className="relative">
        {/* Soft halo keeps the icon from reading as a broken image. */}
        <div
          aria-hidden
          className="bg-primary/8 absolute inset-0 -z-10 scale-[1.9] rounded-full blur-xl"
        />
        <div
          className={cn(
            "bg-muted text-muted-foreground flex items-center justify-center rounded-2xl border",
            compact ? "size-11" : "size-14",
          )}
        >
          <Icon className={compact ? "size-5" : "size-6"} strokeWidth={1.6} />
        </div>
      </div>

      <div className="space-y-1.5">
        <h3
          className={cn(
            "font-semibold tracking-[-0.01em]",
            compact ? "text-sm" : "text-base",
          )}
        >
          {title}
        </h3>
        {description ? (
          <p className="text-muted-foreground mx-auto max-w-sm text-sm leading-relaxed text-balance">
            {description}
          </p>
        ) : null}
      </div>

      {action || secondaryAction ? (
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          {action}
          {secondaryAction}
        </div>
      ) : null}
    </div>
  );
}

export { EmptyState };
