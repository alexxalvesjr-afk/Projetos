import Link from "next/link";
import { TriangleAlert } from "lucide-react";

/**
 * Units the floor cannot discount, stated as its consequence.
 *
 * "10 veículos sem margem" is a fact; "your salesperson cannot offer a discount"
 * is a reason to act before the next customer walks in.
 *
 * A solid amber block rather than a tinted one: this sits between the month's
 * target and the sales numbers, and a translucent wash at that position reads
 * as decoration. The colour is deliberately the same in both themes — an alert
 * that dims itself in dark mode is an alert that gets ignored — so the text and
 * the button are pinned to fixed values instead of theme tokens, which is the
 * one place in this app where that is the correct call.
 */
export function MarginAlert({ count }: { count: number }) {
  if (count <= 0) return null;

  const plural = count > 1;

  return (
    <div className="bg-warning text-warning-foreground flex flex-wrap items-center gap-4 rounded-xl px-5 py-4">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-black/10">
        <TriangleAlert className="size-5" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">
          {count} {plural ? "veículos" : "veículo"} sem desconto liberado
        </p>
        <p className="text-[13px] leading-relaxed opacity-80">
          O vendedor não consegue oferecer desconto até você definir a margem
          {plural ? " desses veículos" : " desse veículo"}.
        </p>
      </div>

      <Link
        href="/inventory?margem=pendente"
        className="shrink-0 rounded-lg bg-white px-3.5 py-2 text-sm font-semibold text-neutral-900 transition-colors hover:bg-white/90 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:outline-none"
      >
        Resolver agora
      </Link>
    </div>
  );
}
