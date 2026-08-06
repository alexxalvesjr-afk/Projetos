import Link from "next/link";
import { Info } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatCurrencyShort, formatMileage } from "@/lib/format";
import { agingBand, vehicleTitle } from "@/lib/domain/vehicle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const TICKS = 28;

/**
 * How fast capital is leaving the floor.
 *
 * The arc is a proportion, not a rating: each tick is 1/28th of the stock, and
 * the green run is the share still inside the 60-day window. That is why the
 * legend names both states — a gauge whose empty half means nothing invites the
 * reader to interpret the needle position, and there is no scale here to read
 * a position against.
 */
export function TurnoverGauge({
  averageDays,
  onTime,
  stalled,
  over90,
}: {
  averageDays: number;
  onTime: number;
  stalled: number;
  over90: number;
}) {
  const total = onTime + stalled;
  const greenTicks = total > 0 ? Math.round((onTime / total) * TICKS) : 0;

  // Semicircle: 180° swept from due-west to due-east, one tick per step.
  const radius = 72;
  const centre = { x: 100, y: 86 };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">Giro do estoque</CardTitle>
        <p className="text-muted-foreground text-sm">
          Saúde dos carros em pátio hoje
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="mx-auto w-full max-w-[200px]">
          <svg viewBox="0 0 200 96" className="w-full" aria-hidden>
            {Array.from({ length: TICKS }).map((_, i) => {
              const angle = Math.PI - (i / (TICKS - 1)) * Math.PI;
              const inner = radius - 13;
              const x1 = centre.x + Math.cos(angle) * inner;
              const y1 = centre.y - Math.sin(angle) * inner;
              const x2 = centre.x + Math.cos(angle) * radius;
              const y2 = centre.y - Math.sin(angle) * radius;

              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  strokeWidth="5"
                  strokeLinecap="round"
                  className={
                    // The inactive run has to stay legible: it is the
                    // denominator. Too faint and the arc reads as a short green
                    // bar floating in space rather than a part of a whole.
                    i < greenTicks ? "stroke-success" : "stroke-muted-foreground/35"
                  }
                />
              );
            })}

            {/* Inside the SVG, not absolutely positioned over it: the number
                has to sit in the arc's hollow, and only the arc's own
                coordinate space knows where that is at any card width. */}
            <text
              x={centre.x}
              y={centre.y - 6}
              textAnchor="middle"
              className="fill-foreground text-[30px] font-semibold tracking-[-0.03em]"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {averageDays}d
            </text>
          </svg>

          <p className="text-muted-foreground -mt-1 text-center text-xs">
            giro médio do estoque
          </p>
        </div>

        <div className="text-muted-foreground flex items-center justify-center gap-5 text-xs">
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="bg-success size-2 rounded-full" />
            No prazo{total > 0 ? ` · ${onTime}` : ""}
          </span>
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="bg-muted-foreground/40 size-2 rounded-full"
            />
            Parado{total > 0 ? ` · ${stalled}` : ""}
          </span>
        </div>

        <div
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm",
            over90 > 0
              ? "bg-destructive/10 text-destructive"
              : "bg-muted text-muted-foreground",
          )}
        >
          <Info className="size-4 shrink-0" />
          <span>
            <span className="tabular font-semibold">{over90}</span>{" "}
            {over90 === 1 ? "carro parado" : "carros parados"} há mais de 90 dias
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

type OldestVehicle = {
  id: string;
  brand: string;
  model: string;
  version: string | null;
  year: number;
  modelYear: number | null;
  mileage: number;
  priceCents: number;
  purchasedAt: Date;
};

/**
 * The units to move first, ranked oldest-first.
 *
 * Ranked rather than filtered: the owner does not need to know which cars
 * crossed an arbitrary line, only which one to discount this week. The day
 * badge takes its colour from the same `agingBand` the inventory list uses,
 * so a car does not change severity depending on which screen shows it.
 */
export function OldestStockCard({ vehicles }: { vehicles: OldestVehicle[] }) {
  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base">Carros parados há mais tempo</CardTitle>
          <p className="text-muted-foreground text-sm">
            Priorize o giro destes carros
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="shrink-0">
          <Link href="/inventory?sort=aging_desc">Ver estoque</Link>
        </Button>
      </CardHeader>

      <CardContent>
        {vehicles.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            Nenhum veículo no pátio.
          </p>
        ) : (
          <ol className="divide-border divide-y">
            {vehicles.map((vehicle, index) => {
              const days = Math.max(
                0,
                Math.floor(
                  (Date.now() - new Date(vehicle.purchasedAt).getTime()) /
                    86_400_000,
                ),
              );
              const band = agingBand(days);

              return (
                <li key={vehicle.id}>
                  <Link
                    href={`/inventory/${vehicle.id}`}
                    className="hover:bg-accent/60 -mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors"
                  >
                    <span className="text-muted-foreground tabular w-4 shrink-0 text-sm">
                      {index + 1}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {vehicleTitle(vehicle)}
                      </span>
                      <span className="text-muted-foreground block text-xs">
                        {vehicle.year} · {formatMileage(vehicle.mileage)}
                      </span>
                    </span>

                    <span className="tabular shrink-0 text-sm font-semibold">
                      {formatCurrencyShort(vehicle.priceCents)}
                    </span>

                    <span
                      className={cn(
                        "tabular w-11 shrink-0 rounded-md px-1.5 py-0.5 text-center text-xs font-semibold",
                        band === "fresh" && "bg-success/12 text-success",
                        band === "healthy" && "bg-info/12 text-info",
                        band === "watch" && "bg-warning/15 text-warning",
                        band === "stale" && "bg-destructive/12 text-destructive",
                      )}
                    >
                      {days}d
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
