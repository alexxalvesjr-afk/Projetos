import type { Metadata } from "next";
import { Suspense } from "react";
import {
  BadgeDollarSign,
  CircleDollarSign,
  Package,
  Percent,
  TrendingUp,
  Users,
} from "lucide-react";

import { requirePermission } from "@/lib/session";
import { hasPermission } from "@/lib/rbac";
import { delta } from "@/lib/utils";
import { formatCurrencyShort, formatPercent } from "@/lib/format";
import { AGING_BANDS, type AgingBand } from "@/lib/domain/vehicle";
import { LEAD_SOURCE_LABELS, PIPELINE_STAGES } from "@/lib/domain/lead";
import {
  metricsRepository,
  monthPeriod,
  previousPeriod,
} from "@/server/repositories/metrics.repository";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RevenueChart } from "@/components/charts/revenue-chart";
import {
  CompositionChart,
  FunnelChart,
  RankedBarChart,
} from "@/components/charts/simple-charts";
import { ExportMenu } from "@/components/reports/export-menu";

export const metadata: Metadata = {
  title: "Relatórios",
  description: "Faturamento, lucro, ROI, conversão e giro de estoque.",
};

export const dynamic = "force-dynamic";

async function Reports() {
  const user = await requirePermission("report:view");
  const org = user.organizationId;

  const current = monthPeriod();
  const previous = previousPeriod(current);
  const trendFrom = new Date(
    Date.UTC(current.from.getUTCFullYear(), current.from.getUTCMonth() - 11, 1),
  );

  const [
    sales,
    salesPrevious,
    leads,
    stock,
    aging,
    monthly,
    topVehicles,
    sellers,
    sources,
    marketing,
  ] = await Promise.all([
    metricsRepository.salesSummary(org, current),
    metricsRepository.salesSummary(org, previous),
    metricsRepository.leadSummary(org, current),
    metricsRepository.stockSummary(org),
    metricsRepository.stockAging(org),
    metricsRepository.salesTimeSeries(org, { from: trendFrom, to: current.to }, "month"),
    metricsRepository.topVehicles(org, current, 6),
    metricsRepository.topSellers(org, current, 6),
    metricsRepository.leadsBySource(org, current),
    metricsRepository.marketingSummary(org, current),
  ]);

  const canExport = hasPermission(user.role, "report:export");

  // ROI here is return on the capital tied up in sold units, not ad spend.
  const roi =
    sales.costCents > 0 ? (sales.profitCents / sales.costCents) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          index={0}
          label="Faturamento"
          value={formatCurrencyShort(sales.revenueCents)}
          delta={delta(sales.revenueCents, salesPrevious.revenueCents)}
          icon={<CircleDollarSign />}
        />
        <StatCard
          index={1}
          label="Lucro bruto"
          value={formatCurrencyShort(sales.profitCents)}
          delta={delta(sales.profitCents, salesPrevious.profitCents)}
          icon={<TrendingUp />}
          accent="success"
          footer={
            <p className="text-muted-foreground text-xs">
              Margem de {formatPercent(sales.marginPercent)}
            </p>
          }
        />
        <StatCard
          index={2}
          label="ROI sobre estoque vendido"
          value={formatPercent(roi)}
          icon={<Percent />}
          accent="info"
          hint="Lucro dividido pelo custo total das unidades vendidas."
        />
        <StatCard
          index={3}
          label="Ticket médio"
          value={formatCurrencyShort(sales.averageTicketCents)}
          delta={delta(sales.averageTicketCents, salesPrevious.averageTicketCents)}
          icon={<BadgeDollarSign />}
        />
        <StatCard
          index={4}
          label="Taxa de conversão"
          value={formatPercent(leads.conversionRate)}
          icon={<Users />}
          accent="success"
          footer={
            <p className="text-muted-foreground text-xs">
              {leads.won} ganhos de {leads.created} leads
            </p>
          }
        />
        <StatCard
          index={5}
          label="Capital em estoque"
          value={formatCurrencyShort(stock.investedCents)}
          icon={<Package />}
          accent="warning"
          footer={
            <p className="text-muted-foreground text-xs">
              {stock.inStock} unidades · valor de venda{" "}
              {formatCurrencyShort(stock.retailValueCents)}
            </p>
          }
        />
      </div>

      {/* Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Faturamento e lucro</CardTitle>
          <CardDescription>Últimos 12 meses</CardDescription>
        </CardHeader>
        <CardContent>
          <RevenueChart data={monthly} granularity="month" height={320} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Funnel */}
        <Card>
          <CardHeader>
            <CardTitle>Funil de conversão</CardTitle>
            <CardDescription>
              Leads por etapa e retenção entre elas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FunnelChart
              stages={PIPELINE_STAGES.filter((s) => s.id !== "LOST").map(
                (stage) => ({
                  label: stage.label,
                  value: leads.byStage[stage.id] ?? 0,
                  color: stage.color,
                }),
              )}
            />
          </CardContent>
        </Card>

        {/* Sources */}
        <Card>
          <CardHeader>
            <CardTitle>Origem dos leads</CardTitle>
            <CardDescription>Distribuição no mês corrente.</CardDescription>
          </CardHeader>
          <CardContent>
            <CompositionChart
              data={sources.map((source) => ({
                label: LEAD_SOURCE_LABELS[source.source],
                value: source.count,
              }))}
              format="number"
            />
          </CardContent>
        </Card>

        {/* Top vehicles */}
        <Card>
          <CardHeader>
            <CardTitle>Veículos mais vendidos</CardTitle>
            <CardDescription>Faturamento por modelo.</CardDescription>
          </CardHeader>
          <CardContent>
            <RankedBarChart
              data={topVehicles.map((vehicle) => ({
                label: `${vehicle.brand} ${vehicle.model}`,
                value: vehicle.revenueCents,
              }))}
              valueLabel="Faturamento"
              format="currency"
            />
          </CardContent>
        </Card>

        {/* Sellers */}
        <Card>
          <CardHeader>
            <CardTitle>Desempenho por vendedor</CardTitle>
            <CardDescription>Faturamento no mês.</CardDescription>
          </CardHeader>
          <CardContent>
            <RankedBarChart
              data={sellers.map((seller) => ({
                label: seller.name,
                value: seller.revenueCents,
              }))}
              valueLabel="Faturamento"
              format="currency"
              color="var(--chart-3)"
            />
          </CardContent>
        </Card>
      </div>

      {/* Aging + marketing */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Envelhecimento do estoque</CardTitle>
            <CardDescription>
              Quanto capital está parado e por quanto tempo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {(Object.keys(AGING_BANDS) as AgingBand[]).map((band) => {
                const row = aging.find((item) => item.band === band);
                const units = row?.units ?? 0;
                const invested = row?.investedCents ?? 0;
                const total = aging.reduce((sum, item) => sum + item.units, 0);
                const share = total > 0 ? (units / total) * 100 : 0;

                return (
                  <li key={band} className="space-y-1.5">
                    <div className="flex items-baseline justify-between text-sm">
                      <span>{AGING_BANDS[band].label}</span>
                      <span className="tabular">
                        <span className="font-semibold">{units}</span>
                        <span className="text-muted-foreground">
                          {" "}
                          · {formatCurrencyShort(invested)}
                        </span>
                      </span>
                    </div>
                    <div className="bg-muted h-2 overflow-hidden rounded-full">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${share}%`,
                          backgroundColor:
                            band === "stale"
                              ? "var(--destructive)"
                              : band === "watch"
                                ? "var(--warning)"
                                : band === "healthy"
                                  ? "var(--info)"
                                  : "var(--success)",
                        }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Retorno de mídia</CardTitle>
            <CardDescription>
              Investimento em anúncios no mês corrente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
              {[
                ["Investimento", formatCurrencyShort(marketing.spendCents)],
                ["Receita atribuída", formatCurrencyShort(marketing.revenueCents)],
                ["ROAS", `${marketing.roas.toFixed(2)}×`],
                ["ROI", formatPercent(marketing.roiPercent)],
                ["Custo por lead", formatCurrencyShort(marketing.costPerLeadCents)],
                ["Custo por venda", formatCurrencyShort(marketing.costPerSaleCents)],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-muted-foreground text-xs">{label}</dt>
                  <dd className="tabular mt-0.5 text-lg font-semibold">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      </div>

      {canExport ? null : (
        <p className="text-muted-foreground text-xs">
          Exportação disponível para gerentes e administradores.
        </p>
      )}
    </div>
  );
}

export default async function ReportsPage() {
  const user = await requirePermission("report:view");

  return (
    <div className="space-y-6 print:space-y-4">
      <PageHeader
        title="Relatórios"
        description="Faturamento, margem, conversão e giro de estoque em um só lugar."
      >
        {hasPermission(user.role, "report:export") ? <ExportMenu /> : null}
      </PageHeader>

      <Suspense
        fallback={
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        }
      >
        <Reports />
      </Suspense>
    </div>
  );
}
