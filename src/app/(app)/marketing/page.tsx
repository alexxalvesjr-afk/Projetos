import type { Metadata } from "next";
import { Suspense } from "react";
import type { CampaignChannel } from "@prisma/client";
import {
  Banknote,
  MousePointerClick,
  Percent,
  Target,
  TrendingUp,
  UserPlus,
} from "lucide-react";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { formatCompact, formatCurrencyShort, formatPercent } from "@/lib/format";
import {
  metricsRepository,
  monthPeriod,
} from "@/server/repositories/metrics.repository";
import { hasPermission } from "@/lib/rbac";
import { listConnections } from "@/server/services/ads.service";
import { AdConnections } from "@/components/marketing/ad-connections";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { CompositionChart } from "@/components/charts/simple-charts";

export const metadata: Metadata = {
  title: "Marketing",
  description: "Google Ads, Meta Ads, custo por lead e retorno de mídia.",
};

export const dynamic = "force-dynamic";

const CHANNEL_LABELS: Record<CampaignChannel, string> = {
  GOOGLE_ADS: "Google Ads",
  META_ADS: "Meta Ads",
  TIKTOK_ADS: "TikTok Ads",
  ORGANIC: "Orgânico",
  EMAIL: "E-mail",
  MARKETPLACE: "Marketplace",
  OTHER: "Outro",
};

/**
 * Recado de volta do fluxo de autorização.
 *
 * O provedor devolve o navegador para cá com um parâmetro na URL; sem traduzi-lo
 * o lojista voltaria para a mesma tela sem saber se deu certo.
 */
const CONNECTION_FEEDBACK: Record<
  string,
  { tone: "success" | "info" | "warning" | "destructive"; text: string }
> = {
  conectada: {
    tone: "success",
    text: "Conta conectada. O desempenho dos últimos 90 dias já está abaixo.",
  },
  "escolher-conta": {
    tone: "info",
    text: "Autorização concluída. Escolha qual conta de anúncios o CRM deve acompanhar.",
  },
  "sem-contas": {
    tone: "warning",
    text: "O perfil autorizado não administra nenhuma conta de anúncios. Entre com o perfil que gerencia as campanhas.",
  },
  "sem-chaves": {
    tone: "warning",
    text: "Esta plataforma ainda não foi configurada nesta instalação. Use o botão “Configurar” para ver o passo a passo.",
  },
  cancelada: {
    tone: "info",
    text: "Autorização cancelada. Nada foi alterado.",
  },
  invalida: {
    tone: "destructive",
    text: "O pedido de autorização expirou ou não confere. Clique em “Conectar” outra vez.",
  },
  falhou: {
    tone: "destructive",
    text: "Não foi possível concluir a conexão. Tente novamente em alguns instantes.",
  },
};

async function Marketing({ feedback }: { feedback?: string }) {
  const user = await requirePermission("campaign:view");
  const period = monthPeriod();
  const notice = feedback ? CONNECTION_FEEDBACK[feedback] : undefined;

  const [connections, summary, campaigns] = await Promise.all([
    listConnections(user.organizationId),
    metricsRepository.marketingSummary(user.organizationId, period),
    db.campaign.findMany({
      where: { organizationId: user.organizationId },
      include: {
        metrics: {
          where: { date: { gte: period.from, lt: period.to } },
        },
        _count: { select: { leads: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Aggregate each campaign's daily rows into the month's totals.
  const rows = campaigns
    .map((campaign) => {
      const totals = campaign.metrics.reduce(
        (acc, metric) => ({
          spend: acc.spend + metric.spendCents,
          impressions: acc.impressions + metric.impressions,
          clicks: acc.clicks + metric.clicks,
          leads: acc.leads + metric.leads,
          sales: acc.sales + metric.sales,
          revenue: acc.revenue + metric.revenueCents,
        }),
        { spend: 0, impressions: 0, clicks: 0, leads: 0, sales: 0, revenue: 0 },
      );

      return {
        id: campaign.id,
        name: campaign.name,
        channel: campaign.channel,
        status: campaign.status,
        ...totals,
        cpl: totals.leads > 0 ? Math.round(totals.spend / totals.leads) : 0,
        cpa: totals.sales > 0 ? Math.round(totals.spend / totals.sales) : 0,
        roas: totals.spend > 0 ? totals.revenue / totals.spend : 0,
        ctr:
          totals.impressions > 0
            ? (totals.clicks / totals.impressions) * 100
            : 0,
      };
    })
    .sort((a, b) => b.spend - a.spend);

  const byChannel = rows.reduce<Record<string, number>>((acc, row) => {
    const label = CHANNEL_LABELS[row.channel];
    acc[label] = (acc[label] ?? 0) + row.spend;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {notice ? (
        <Alert variant={notice.tone}>
          <AlertDescription>{notice.text}</AlertDescription>
        </Alert>
      ) : null}

      <AdConnections
        connections={connections}
        canManage={hasPermission(user.role, "campaign:manage")}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          index={0}
          label="Investimento no mês"
          value={formatCurrencyShort(summary.spendCents)}
          icon={<Banknote />}
          accent="warning"
        />
        <StatCard
          index={1}
          label="Receita atribuída"
          value={formatCurrencyShort(summary.revenueCents)}
          icon={<TrendingUp />}
          accent="success"
        />
        <StatCard
          index={2}
          label="ROAS"
          value={`${summary.roas.toFixed(2)}×`}
          icon={<Target />}
          hint="Receita atribuída dividida pelo investimento."
          footer={
            <p className="text-muted-foreground text-xs">
              ROI de {formatPercent(summary.roiPercent)}
            </p>
          }
        />
        <StatCard
          index={3}
          label="Custo por lead"
          value={formatCurrencyShort(summary.costPerLeadCents)}
          icon={<UserPlus />}
          accent="info"
          // Cheaper is better here, so the trend colour has to be inverted.
          invertTrend
          footer={
            <p className="text-muted-foreground text-xs">
              {formatCompact(summary.leads)} leads gerados
            </p>
          }
        />
        <StatCard
          index={4}
          label="Custo por venda"
          value={formatCurrencyShort(summary.costPerSaleCents)}
          icon={<Percent />}
          accent="info"
          invertTrend
          footer={
            <p className="text-muted-foreground text-xs">
              {summary.sales} vendas atribuídas
            </p>
          }
        />
        <StatCard
          index={5}
          label="CTR médio"
          value={formatPercent(summary.ctr, { digits: 2 })}
          icon={<MousePointerClick />}
          footer={
            <p className="text-muted-foreground text-xs">
              {formatCompact(summary.impressions)} impressões ·{" "}
              {formatCompact(summary.clicks)} cliques
            </p>
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Campanhas</CardTitle>
            <CardDescription>
              Desempenho no mês corrente, ordenado por investimento.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {rows.length === 0 ? (
              <EmptyState
                icon={Target}
                title="Nenhuma campanha cadastrada"
                description="Conecte suas contas de anúncio para acompanhar custo por lead e retorno de mídia."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campanha</TableHead>
                    <TableHead className="text-right">Investido</TableHead>
                    <TableHead className="text-right">Leads</TableHead>
                    <TableHead className="text-right">CPL</TableHead>
                    <TableHead className="text-right">Vendas</TableHead>
                    <TableHead className="text-right">ROAS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="max-w-56 truncate text-sm font-medium">
                            {row.name}
                          </p>
                          <Badge variant="outline" size="sm" className="mt-1">
                            {CHANNEL_LABELS[row.channel]}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="tabular text-right text-sm">
                        {formatCurrencyShort(row.spend)}
                      </TableCell>
                      <TableCell className="tabular text-right text-sm">
                        {row.leads}
                      </TableCell>
                      <TableCell className="tabular text-right text-sm">
                        {formatCurrencyShort(row.cpl)}
                      </TableCell>
                      <TableCell className="tabular text-right text-sm">
                        {row.sales}
                      </TableCell>
                      <TableCell className="tabular text-right text-sm font-medium">
                        <span
                          className={
                            row.roas >= 3
                              ? "text-success"
                              : row.roas >= 1
                                ? "text-warning"
                                : "text-destructive"
                          }
                        >
                          {row.roas.toFixed(2)}×
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Investimento por canal</CardTitle>
            <CardDescription>Distribuição da verba no mês.</CardDescription>
          </CardHeader>
          <CardContent>
            <CompositionChart
              data={Object.entries(byChannel).map(([label, value]) => ({
                label,
                value,
              }))}
              format="currency"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default async function MarketingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission("campaign:view");
  const feedback = (await searchParams).integracao;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marketing"
        description="Quanto cada canal custa, quantos leads entrega e o retorno real em vendas."
      />

      <Suspense
        fallback={
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        }
      >
        <Marketing feedback={typeof feedback === "string" ? feedback : undefined} />
      </Suspense>
    </div>
  );
}
