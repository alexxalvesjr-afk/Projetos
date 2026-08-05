import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ClipboardList, Plus, TrendingUp, UserPlus } from "lucide-react";

import { requireAuth } from "@/lib/session";
import { hasPermission } from "@/lib/rbac";
import { delta } from "@/lib/utils";
import { formatCurrencyShort, formatPercent } from "@/lib/format";
import { STAGE_LABELS } from "@/lib/domain/lead";
import {
  isPeriodKey,
  periodLabel,
  type PeriodKey,
} from "@/server/repositories/metrics.repository";
import { getDashboardData } from "@/server/services/dashboard.service";
import { PageHeader } from "@/components/shared/page-header";
import { StatCardSkeleton } from "@/components/shared/stat-card";
import { GoalBanner } from "@/components/dashboard/goal-banner";
import { MarginAlert } from "@/components/dashboard/margin-alert";
import { PeriodFilter } from "@/components/dashboard/period-filter";
import { SalesKpi } from "@/components/dashboard/sales-kpi";
import { InvestedCard, FunnelNowCard } from "@/components/dashboard/store-now";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { TopSellersCard } from "@/components/dashboard/top-sellers-card";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { AgendaCard, FollowUpsCard } from "@/components/dashboard/agenda-card";

export const metadata: Metadata = {
  title: "Painel",
  description: "Indicadores da sua revenda em tempo real.",
};

// Dashboards read live operational data; caching them would show stale numbers.
export const dynamic = "force-dynamic";

function DashboardSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  );
}

async function DashboardContent({ periodKey }: { periodKey: PeriodKey }) {
  const user = await requireAuth();
  const data = await getDashboardData(user, periodKey);

  const showFinancials = hasPermission(user.role, "dashboard:view_financials");
  const canManageGoals = hasPermission(user.role, "goal:manage");

  const {
    sales,
    salesPrevious,
    monthSales,
    stock,
    leads,
    monthlySeries,
    dailySeries,
    goal,
    topSellers,
    recentActivity,
    upcoming,
    followUps,
  } = data;

  // Sparklines read the buckets inside the selected window; a single bucket
  // draws a flat baseline rather than a misleading spike.
  const revenueSeries = dailySeries.map((d) => d.revenueCents);
  const profitSeries = dailySeries.map((d) => d.profitCents);
  const unitsSeries = dailySeries.map((d) => d.units);

  const openStages = ["NEW", "CONTACTED", "VISIT_SCHEDULED", "NEGOTIATION"] as const;
  const funnelStages = openStages.map((stage) => ({
    label: STAGE_LABELS[stage],
    count: leads.byStage[stage] ?? 0,
  }));

  return (
    <div className="space-y-6">
      {/* Meta do mês ------------------------------------------------------- */}
      <GoalBanner
        targetUnits={goal?.targetUnits ?? 0}
        soldUnits={monthSales.unitsSold}
        scope={data.scope}
        canManage={canManageGoals}
      />

      {/* Pendência que trava o vendedor ------------------------------------ */}
      {showFinancials ? (
        <MarginAlert count={stock.withoutMarginCount} />
      ) : null}

      {/* Visão de vendas --------------------------------------------------- */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-[-0.02em]">
              Visão de vendas
            </h2>
            <p className="text-muted-foreground text-sm">
              Acompanhe o que foi fechado no período.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/reports">Relatórios</Link>
          </Button>
        </div>

        <PeriodFilter active={periodKey} label={periodLabel(periodKey)} />

        <p className="text-muted-foreground text-xs">
          Os três números abaixo mudam conforme o período escolhido acima.
        </p>

        <div className="grid gap-4 md:grid-cols-3">
          {showFinancials ? (
            <SalesKpi
              label="Lucro"
              value={formatCurrencyShort(sales.profitCents)}
              delta={delta(sales.profitCents, salesPrevious.profitCents)}
              hint={`${sales.unitsSold} ${sales.unitsSold === 1 ? "venda" : "vendas"} · margem ${formatPercent(sales.marginPercent, { digits: 0 })}`}
              series={profitSeries}
              tone="var(--chart-5)"
            />
          ) : (
            <SalesKpi
              label="Ticket médio"
              value={formatCurrencyShort(sales.averageTicketCents)}
              delta={delta(
                sales.averageTicketCents,
                salesPrevious.averageTicketCents,
              )}
              hint="por venda no período"
              series={revenueSeries}
              tone="var(--chart-5)"
            />
          )}

          <SalesKpi
            label="Faturamento"
            value={formatCurrencyShort(sales.revenueCents)}
            delta={delta(sales.revenueCents, salesPrevious.revenueCents)}
            hint={`Ticket médio ${formatCurrencyShort(sales.averageTicketCents)} por venda`}
            series={revenueSeries}
          />

          <SalesKpi
            label="Vendas"
            value={sales.unitsSold}
            delta={delta(sales.unitsSold, salesPrevious.unitsSold)}
            hint="carros vendidos no período"
            series={unitsSeries}
            tone="var(--chart-2)"
          />
        </div>
      </section>

      {/* Sua loja agora ---------------------------------------------------- */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="text-xl font-semibold tracking-[-0.02em]">
            Sua loja agora
          </h2>
          <p className="text-muted-foreground text-sm">
            foto do momento · não muda com o período
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {showFinancials ? (
            <InvestedCard
              investedCents={stock.investedCents}
              retailValueCents={stock.retailValueCents}
              expectedProfitCents={stock.expectedProfitCents}
              pricedCount={stock.pricedCount}
              inStock={stock.inStock}
              withoutMarginCount={stock.withoutMarginCount}
            />
          ) : null}

          <FunnelNowCard stages={funnelStages} openCount={leads.open} />
        </div>
      </section>

      {/* Tendência ---------------------------------------------------------
          The goal card that used to sit beside this is gone: the banner at the
          top of the page states the same target, and showing it twice made the
          screen look like two different sources of truth. */}
      <Card>
        <CardHeader>
          <CardTitle>Faturamento e lucro</CardTitle>
          <CardDescription>Últimos 12 meses</CardDescription>
          <CardAction>
            <Button asChild variant="ghost" size="sm">
              <Link href="/reports">Relatórios</Link>
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <RevenueChart data={monthlySeries} granularity="month" />
        </CardContent>
      </Card>

      {/* Operational panels ------------------------------------------------ */}
      <div className="grid gap-4 lg:grid-cols-3">
        <TopSellersCard sellers={topSellers} />
        <AgendaCard items={upcoming} />
        <FollowUpsCard items={followUps} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ActivityFeed items={recentActivity} />
        </div>

        {/* Quick actions */}
        <Card>
          <CardHeader>
            <CardTitle>Ações rápidas</CardTitle>
            <CardDescription>Os atalhos do dia a dia.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {hasPermission(user.role, "vehicle:create") ? (
              <Button asChild variant="outline" className="justify-start">
                <Link href="/inventory/new">
                  <Plus />
                  Cadastrar veículo
                </Link>
              </Button>
            ) : null}
            <Button asChild variant="outline" className="justify-start">
              <Link href="/crm?new=1">
                <UserPlus />
                Registrar lead
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link href="/agenda?new=1">
                <ClipboardList />
                Agendar visita
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link href="/reports">
                <TrendingUp />
                Ver relatórios
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const { periodo } = await searchParams;
  // An unrecognised value falls back to the month rather than erroring: the
  // window comes from a URL anyone can hand-edit.
  const periodKey: PeriodKey = isPeriodKey(periodo) ? periodo : "mes";

  const user = await requireAuth();
  const firstName = user.name.split(" ")[0];

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  })();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={new Intl.DateTimeFormat("pt-BR", {
          weekday: "long",
          day: "numeric",
          month: "long",
        }).format(new Date())}
        title={`${greeting}, ${firstName}`}
        description="Este é o retrato da sua operação hoje."
      >
        <Button asChild variant="outline">
          <Link href="/reports">Relatórios</Link>
        </Button>
        {hasPermission(user.role, "vehicle:create") ? (
          <Button asChild>
            <Link href="/inventory/new">
              <Plus />
              Novo veículo
            </Link>
          </Button>
        ) : null}
      </PageHeader>

      {/* Keyed on the window so switching periods re-suspends and shows the
          skeleton, instead of leaving stale numbers on screen mid-fetch. */}
      <Suspense key={periodKey} fallback={<DashboardSkeleton />}>
        <DashboardContent periodKey={periodKey} />
      </Suspense>
    </div>
  );
}
