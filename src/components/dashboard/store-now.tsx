import Link from "next/link";
import { Banknote, Tag, TrendingUp, TriangleAlert } from "lucide-react";

import { percent } from "@/lib/utils";
import { formatCurrencyShort, formatPercent } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Capital sitting on the floor right now.
 *
 * Separated from the sales tiles above and labelled as a snapshot, because
 * mixing a period measure (revenue this month) with a point-in-time one (money
 * parked in unsold stock) in the same row is what makes dashboards lie. The
 * heading says which one this is so nobody has to guess.
 */
export function InvestedCard({
  investedCents,
  retailValueCents,
  expectedProfitCents,
  inStock,
  withoutMarginCount,
}: {
  investedCents: number;
  retailValueCents: number;
  expectedProfitCents: number;
  inStock: number;
  withoutMarginCount: number;
}) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-[13px] font-medium">
          <span className="text-muted-foreground">Investido no estoque</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-5">
        <p className="tabular text-[30px] leading-none font-semibold tracking-[-0.03em]">
          {formatCurrencyShort(investedCents)}
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <Tag className="size-3.5" />
              Vale na venda
            </p>
            <p className="tabular mt-1 text-lg font-semibold">
              {formatCurrencyShort(retailValueCents)}
            </p>
            <p className="text-muted-foreground text-xs">
              {inStock === 1 ? "o carro" : `os ${inStock} carros`} no pátio
            </p>
          </div>

          <div>
            <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <TrendingUp className="size-3.5" />
              Lucro esperado
            </p>
            <p className="tabular text-success mt-1 text-lg font-semibold">
              {formatCurrencyShort(expectedProfitCents)}
            </p>
            <p className="text-muted-foreground text-xs">
              se vender pelo preço de tabela
            </p>
          </div>
        </div>

        {withoutMarginCount > 0 ? (
          <Link
            href="/inventory?margem=pendente"
            className="bg-warning/15 text-warning hover:bg-warning/25 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors"
          >
            <TriangleAlert className="size-3.5" />
            {withoutMarginCount} {withoutMarginCount === 1 ? "carro" : "carros"} sem
            margem
          </Link>
        ) : null}
      </CardContent>
    </Card>
  );
}

/** Live pipeline shape — how many people are mid-purchase right this second. */
export function FunnelNowCard({
  stages,
  openCount,
}: {
  stages: { label: string; count: number }[];
  openCount: number;
}) {
  const top = stages[0]?.count ?? 0;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-[13px] font-medium">
          <span className="text-muted-foreground">Funil agora</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-5">
        <p className="text-sm">
          <span className="tabular text-[30px] leading-none font-semibold tracking-[-0.03em]">
            {openCount}
          </span>
          <span className="text-muted-foreground ml-2">
            {openCount === 1 ? "cliente em aberto" : "clientes em aberto"}
          </span>
        </p>

        <ol className="space-y-3">
          {stages.map((stage) => {
            const share = top > 0 ? percent(stage.count, top) : 0;
            return (
              <li key={stage.label} className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-muted-foreground truncate">
                    {stage.label}
                  </span>
                  <span className="flex shrink-0 items-baseline gap-2">
                    <span className="tabular font-semibold">{stage.count}</span>
                    <span className="text-muted-foreground text-xs">
                      {formatPercent(share, { digits: 0 })}
                    </span>
                  </span>
                </div>
                <div className="bg-muted h-2 overflow-hidden rounded-full">
                  <div
                    className="bg-chart-1 h-full rounded-full transition-[width] duration-700"
                    style={{ width: `${Math.max(share, stage.count > 0 ? 3 : 0)}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ol>

        {openCount === 0 ? (
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            <Banknote className="size-4" />
            Nenhuma negociação aberta no momento.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
