"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * Builds a compact page list with ellipses: 1 … 4 5 6 … 20.
 * Always shows the first and last page so the range is never ambiguous.
 */
function pageWindow(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages = new Set<number>([1, total, current]);
  if (current > 1) pages.add(current - 1);
  if (current < total) pages.add(current + 1);
  if (current <= 3) pages.add(2).add(3).add(4);
  if (current >= total - 2) pages.add(total - 1).add(total - 2).add(total - 3);

  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);

  const output: (number | "…")[] = [];
  let previous = 0;
  for (const page of sorted) {
    if (previous && page - previous > 1) output.push("…");
    output.push(page);
    previous = page;
  }
  return output;
}

export function Pagination({
  page,
  pageCount,
  total,
  perPage,
}: {
  page: number;
  pageCount: number;
  total: number;
  perPage: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (pageCount <= 1) {
    return (
      <p className="text-muted-foreground text-sm">
        {total} {total === 1 ? "resultado" : "resultados"}
      </p>
    );
  }

  function goTo(target: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (target <= 1) params.delete("page");
    else params.set("page", String(target));
    router.push(`${pathname}?${params.toString()}`, { scroll: true });
  }

  const from = (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-muted-foreground text-sm">
        <span className="tabular text-foreground font-medium">
          {from}–{to}
        </span>{" "}
        de <span className="tabular">{total}</span>
      </p>

      <nav className="flex items-center gap-1" aria-label="Paginação">
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => goTo(page - 1)}
          disabled={page <= 1}
          aria-label="Página anterior"
        >
          <ChevronLeft />
        </Button>

        {pageWindow(page, pageCount).map((entry, index) =>
          entry === "…" ? (
            <span
              key={`gap-${index}`}
              className="text-muted-foreground px-1 text-sm"
            >
              …
            </span>
          ) : (
            <Button
              key={entry}
              variant={entry === page ? "default" : "ghost"}
              size="icon-sm"
              onClick={() => goTo(entry)}
              aria-current={entry === page ? "page" : undefined}
              className={cn("tabular", entry === page && "pointer-events-none")}
            >
              {entry}
            </Button>
          ),
        )}

        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => goTo(page + 1)}
          disabled={page >= pageCount}
          aria-label="Próxima página"
        >
          <ChevronRight />
        </Button>
      </nav>
    </div>
  );
}
