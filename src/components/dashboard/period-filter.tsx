import Link from "next/link";

import { cn } from "@/lib/utils";
import {
  PERIOD_KEYS,
  PERIOD_LABELS,
  type PeriodKey,
} from "@/server/repositories/metrics.repository";

/**
 * Window selector for the three headline numbers.
 *
 * Plain links rather than client state: the numbers come from the server
 * anyway, so a link gives a shareable URL, a working back button and a
 * selection that survives a refresh — none of which `useState` would.
 */
export function PeriodFilter({
  active,
  label,
}: {
  active: PeriodKey;
  label: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {PERIOD_KEYS.map((key) => {
        const isActive = key === active;
        return (
          <Link
            key={key}
            href={key === "mes" ? "/dashboard" : `/dashboard?periodo=${key}`}
            scroll={false}
            aria-current={isActive ? "true" : undefined}
            className={cn(
              "focus-visible:ring-ring rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none",
              isActive
                ? "bg-primary text-primary-foreground border-transparent"
                : "bg-card hover:bg-accent text-muted-foreground hover:text-foreground",
            )}
          >
            {PERIOD_LABELS[key]}
          </Link>
        );
      })}

      <span className="text-muted-foreground ml-1 text-sm">{label}</span>
    </div>
  );
}
