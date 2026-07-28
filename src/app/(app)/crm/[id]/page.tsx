import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, Car, Mail, Phone, Sparkles } from "lucide-react";

import { requirePermission } from "@/lib/session";
import { hasPermission } from "@/lib/rbac";
import { formatCurrency, formatDate, formatPhone, formatRelative } from "@/lib/format";
import {
  LEAD_SOURCE_LABELS,
  STAGE_META,
  TEMPERATURE_LABELS,
  TEMPERATURE_VARIANTS,
  scoreBand,
} from "@/lib/domain/lead";
import { vehicleTitle } from "@/lib/domain/vehicle";
import { leadRepository } from "@/server/repositories/lead.repository";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { UserAvatar } from "@/components/ui/avatar";
import { LeadContactBar } from "@/components/crm/lead-contact-bar";
import { LeadTimeline } from "@/components/crm/lead-timeline";
import { LeadTasks } from "@/components/crm/lead-tasks";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const user = await requirePermission("lead:view");
  const { id } = await params;
  const lead = await leadRepository.findById(user.organizationId, id);
  return { title: lead?.name ?? "Lead" };
}

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission("lead:view");
  const { id } = await params;

  const lead = await leadRepository.findById(user.organizationId, id);
  if (!lead) notFound();

  // A salesperson may only open their own leads.
  const canSeeAll = hasPermission(user.role, "lead:view_all");
  if (!canSeeAll && lead.assignedToId !== user.id) notFound();

  const stage = STAGE_META[lead.stage];
  const band = scoreBand(lead.score);
  const vehicle = lead.interestVehicle;
  const cover = vehicle?.images[0];

  const facts = [
    ["Origem", LEAD_SOURCE_LABELS[lead.source]],
    ["Temperatura", TEMPERATURE_LABELS[lead.temperature]],
    ["Criado em", formatDate(lead.createdAt)],
    [
      "Último contato",
      lead.lastContactAt ? formatRelative(lead.lastContactAt) : "Nunca",
    ],
    [
      "Próximo follow-up",
      lead.nextFollowUpAt ? formatDate(lead.nextFollowUpAt) : "—",
    ],
    [
      "Orçamento",
      lead.budgetCents ? formatCurrency(lead.budgetCents) : "—",
    ],
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="text-muted-foreground -ml-2 mb-2"
        >
          <Link href="/crm">
            <ArrowLeft />
            Voltar ao funil
          </Link>
        </Button>

        <PageHeader
          title={lead.name}
          description={
            <span className="flex flex-wrap items-center gap-2">
              <Badge style={{ backgroundColor: `${stage.color}1a`, color: stage.color }}>
                {stage.label}
              </Badge>
              <Badge variant={TEMPERATURE_VARIANTS[lead.temperature]} size="sm">
                {TEMPERATURE_LABELS[lead.temperature]}
              </Badge>
              {lead.phone ? (
                <span className="text-muted-foreground flex items-center gap-1 text-xs">
                  <Phone className="size-3.5" />
                  {formatPhone(lead.phone)}
                </span>
              ) : null}
              {lead.email ? (
                <span className="text-muted-foreground flex items-center gap-1 text-xs">
                  <Mail className="size-3.5" />
                  {lead.email}
                </span>
              ) : null}
            </span>
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardContent className="pt-5">
              <LeadContactBar
                leadId={lead.id}
                name={lead.name}
                phone={lead.phone}
                email={lead.email}
                vehicle={vehicle ? vehicleTitle(vehicle) : null}
              />
            </CardContent>
          </Card>

          <LeadTimeline
            leadId={lead.id}
            entries={lead.activities.map((activity) => ({
              id: activity.id,
              type: activity.type,
              content: activity.content,
              createdAt: activity.createdAt,
              user: activity.user,
            }))}
          />
        </div>

        <div className="space-y-6">
          {/* Score */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="text-primary size-4" />
                Score do lead
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="tabular text-3xl font-semibold tracking-[-0.03em]">
                  {lead.score}
                </span>
                <Badge variant={band.variant}>{band.label}</Badge>
              </div>
              <Progress value={lead.score} />
              <p className="text-muted-foreground text-xs leading-relaxed">
                Calculado a partir da origem, etapa, temperatura e tempo desde o
                último contato.
              </p>
            </CardContent>
          </Card>

          {/* Vehicle of interest */}
          {vehicle ? (
            <Card>
              <CardHeader>
                <CardTitle>Veículo de interesse</CardTitle>
              </CardHeader>
              <CardContent>
                <Link
                  href={`/inventory/${vehicle.id}`}
                  className="hover:bg-accent/60 -m-2 flex gap-3 rounded-lg p-2 transition-colors"
                >
                  <span className="bg-muted relative size-16 shrink-0 overflow-hidden rounded-lg">
                    {cover ? (
                      <Image
                        src={cover.url}
                        alt=""
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    ) : (
                      <span className="text-muted-foreground flex size-full items-center justify-center">
                        <Car className="size-5" />
                      </span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {vehicleTitle(vehicle)}
                    </span>
                    <span className="text-muted-foreground block text-xs">
                      {vehicle.year} · {vehicle.color}
                    </span>
                    <span className="tabular mt-1 block text-sm font-semibold">
                      {formatCurrency(vehicle.priceCents)}
                    </span>
                  </span>
                </Link>
              </CardContent>
            </Card>
          ) : null}

          <LeadTasks
            leadId={lead.id}
            tasks={lead.tasks.map((task) => ({
              id: task.id,
              title: task.title,
              priority: task.priority,
              dueAt: task.dueAt,
              completedAt: task.completedAt,
              assignedTo: task.assignedTo,
            }))}
          />

          {/* Facts */}
          <Card>
            <CardHeader>
              <CardTitle>Detalhes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 text-sm">
              {facts.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="text-right font-medium">{value}</span>
                </div>
              ))}

              {lead.assignedTo ? (
                <>
                  <Separator />
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Consultor</span>
                    <span className="flex items-center gap-2">
                      <UserAvatar
                        name={lead.assignedTo.name}
                        image={lead.assignedTo.image}
                        className="size-6"
                      />
                      <span className="text-sm font-medium">
                        {lead.assignedTo.name}
                      </span>
                    </span>
                  </div>
                </>
              ) : null}

              {lead.tradeInDescription ? (
                <>
                  <Separator />
                  <div>
                    <p className="text-muted-foreground mb-0.5">Troca</p>
                    <p className="font-medium">{lead.tradeInDescription}</p>
                    {lead.tradeInValueCents ? (
                      <p className="tabular text-muted-foreground text-xs">
                        Avaliado em {formatCurrency(lead.tradeInValueCents)}
                      </p>
                    ) : null}
                  </div>
                </>
              ) : null}

              {lead.notes ? (
                <>
                  <Separator />
                  <div>
                    <p className="text-muted-foreground mb-1">Observações</p>
                    <p className="text-[13px] leading-relaxed whitespace-pre-line">
                      {lead.notes}
                    </p>
                  </div>
                </>
              ) : null}

              {lead.lostReason ? (
                <>
                  <Separator />
                  <div>
                    <p className="text-muted-foreground mb-0.5">
                      Motivo da perda
                    </p>
                    <p className="text-destructive font-medium">
                      {lead.lostReason}
                    </p>
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
