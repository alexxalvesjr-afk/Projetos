import Link from "next/link";
import { TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Units the floor cannot discount, stated as its consequence.
 *
 * "10 veículos sem margem" is a fact; "your salesperson cannot offer a discount"
 * is a reason to act before the next customer walks in. The button goes straight
 * to the filtered list, so reading the alert and fixing it are one motion.
 */
export function MarginAlert({ count }: { count: number }) {
  if (count <= 0) return null;

  const plural = count > 1;

  return (
    <div className="bg-warning/15 border-warning/40 flex flex-wrap items-center gap-4 rounded-xl border px-5 py-4">
      <TriangleAlert className="text-warning size-5 shrink-0" />

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">
          {count} {plural ? "veículos" : "veículo"} sem desconto liberado
        </p>
        <p className="text-muted-foreground text-sm leading-relaxed">
          O vendedor não consegue oferecer desconto até você definir a margem
          {plural ? " desses veículos" : " desse veículo"}.
        </p>
      </div>

      <Button asChild size="sm" variant="outline" className="bg-card shrink-0">
        <Link href="/inventory?margem=pendente">Resolver agora</Link>
      </Button>
    </div>
  );
}
