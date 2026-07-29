import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  BadgeDollarSign,
  Banknote,
  Car,
  CircleDollarSign,
  ClipboardList,
  Gauge,
  Plus,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";

import { requireAuth } from "@/lib/session";
import { hasPermission } from "@/lib/rbac";
import { delta } from "@/lib/utils";
import {
  formatCompact,
  formatCurrencyShort,
  formatPercent,
} from "@/lib/format";
import { getDashboardData } from "@/server/services/dashboard.service";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard, StatCardSkeleton } from "@/components/shared/stat-card";
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
import { GoalProgressCard } from "@/components/dashboard/goal-progress-card";
import { TopSellersCard } from "@/components/dashboard/top-sellers-card";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { AgendaCard, FollowUpsCard } from "@/components/dashboard/agenda-card";

export const metadata: Metadata = {
  title: "Visão geral",
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

async function DashboardContent() {
  const user = await requireAuth();
  const data = await getDashboardData(user);

  const showFinancials = hasPermission(user.role, "dashboard:view_financials");
  const canManageGoals = hasPermission(user.role, "goal:manage");

  const {
    sales,
    salesPrevious,
    stock,
    leads,
    leadsPrevious,
    monthlySeries,
    goal,
    topSellers,
    recentActivity,
    upcoming,
    followUps,
    openTasks,
  } = data;

  return (
    <div className="space-y-6">
      {/* KPI grid ---------------------------------------------------------- */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          index={0}
          label="Faturamento no mês"
          value={formatCurrencyShort(sales.revenueCents)}
          delta={delta(sales.revenueCents, salesPrevious.revenueCents)}
          icon={<CircleDollarSign />}
          hint="Soma das vendas fechadas no mês corrente."
        />

        {showFinancials ? (
          <StatCard
            index={1}
            label="Lucro no mês"
            value={formatCurrencyShort(sales.profitCents)}
            delta={delta(sales.profitCents, salesPrevious.profitCents)}
            icon={<TrendingUp />}
            accent="success"
            hint="Faturamento menos custo de aquisição e preparação."
            footer={
              <p className="text-muted-foreground text-xs">
                Margem de {formatPercent(sales.marginPercent)}
              </p>
            }
          />
        ) : (
          <StatCard
            index={1}
            label="Ticket médio"
            value={formatCurrencyShort(sales.averageTicketCents)}
            delta={delta(
              sales.averageTicketCents,
              salesPrevious.averageTicketCents,
            )}
            icon={<BadgeDollarSign />}
            accent="success"
          />
        )}

        <StatCard
          index={2}
          label="Veículos vendidos"
          value={sales.unitsSold}
          delta={delta(sales.unitsSold, salesPrevious.unitsSold)}
          icon={<Car />}
          accent="info"
        />

        <StatCard
          index={3}
          label="Veículos em estoque"
          value={stock.inStock}
          icon={<Gauge />}
          accent="warning"
          hint="Disponíveis e reservados."
          footer={
            showFinancials ? (
              <p className="text-muted-foreground text-xs">
                {formatCurrencyShort(stock.investedCents)} de capital investido
              </p>
            ) : undefined
          }
        />

        <StatCard
          index={4}
          label="Leads no mês"
          value={leads.created}
          delta={delta(leads.created, leadsPrevious.created)}
          icon={<UserPlus />}
        />

        <StatCard
          index={5}
          label="Taxa de conversão"
          value={formatPercent(leads.conversionRate)}
          delta={delta(leads.conversionRate, leadsPrevious.conversionRate)}
          icon={<Users />}
          accent="success"
          hint="Leads ganhos sobre leads criados no período."
        />

        <StatCard
          index={6}
          label="Ticket médio"
          value={formatCurrencyShort(sales.averageTicketCents)}
          delta={delta(
            sales.averageTicketCents,
            salesPrevious.averageTicketCents,
          )}
          icon={<Banknote />}
          accent="info"
        />

        <StatCard
          index={7}
          label="Pipeline aberto"
          value={formatCompact(leads.open)}
          icon={<ClipboardList />}
          accent="warning"
          hint="Leads ativos em qualquer etapa antes de ganho/perdido."
          footer={
            <p className="text-muted-foreground text-xs">
              {openTasks} {openTasks === 1 ? "tarefa aberta" : "tarefas abertas"}
            </p>
          }
        />
      </div>

      {/* Chart + goal ------------------------------------------------------ */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
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

        <GoalProgressCard
          goal={goal}
          revenueCents={sales.revenueCents}
          profitCents={sales.profitCents}
          units={sales.unitsSold}
          scope={data.scope}
          canManage={canManageGoals}
        />
      </div>

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

export default async function DashboardPage() {
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

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}
