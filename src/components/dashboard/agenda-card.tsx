import Link from "next/link";
import type { AppointmentType } from "@prisma/client";
import { CalendarClock, CalendarDays, Clock } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatDate, formatTime } from "@/lib/format";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";

export const APPOINTMENT_TYPE_LABELS: Record<AppointmentType, string> = {
  VISIT: "Visita",
  TEST_DRIVE: "Test drive",
  CALL: "Ligação",
  DELIVERY: "Entrega",
  MEETING: "Reunião",
  REMINDER: "Lembrete",
  MAINTENANCE: "Manutenção",
};

export type UpcomingAppointment = {
  id: string;
  title: string;
  type: AppointmentType;
  startsAt: Date;
  lead: { id: string; name: string } | null;
  vehicle: { id: string; brand: string; model: string } | null;
};

function isToday(date: Date): boolean {
  const now = new Date();
  return (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  );
}

export function AgendaCard({ items }: { items: UpcomingAppointment[] }) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>Próximos compromissos</CardTitle>
        <CardAction>
          <Button asChild variant="ghost" size="sm">
            <Link href="/agenda">Abrir agenda</Link>
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="flex-1">
        {items.length === 0 ? (
          <EmptyState
            compact
            icon={CalendarDays}
            title="Agenda livre"
            description="Nenhuma visita ou test drive marcado por enquanto."
            action={
              <Button asChild size="sm" variant="outline">
                <Link href="/agenda">Agendar</Link>
              </Button>
            }
          />
        ) : (
          <ul className="space-y-2.5">
            {items.map((item) => {
              const today = isToday(item.startsAt);

              return (
                <li key={item.id}>
                  <Link
                    href="/agenda"
                    className="hover:bg-accent/60 -mx-2 flex items-center gap-3 rounded-lg px-2 py-2 transition-colors"
                  >
                    {/* Date chip reads at a glance without parsing text. */}
                    <div
                      className={cn(
                        "flex size-11 shrink-0 flex-col items-center justify-center rounded-lg border",
                        today
                          ? "border-primary/30 bg-primary/8 text-primary"
                          : "bg-muted/50",
                      )}
                    >
                      <span className="text-[10px] leading-none font-medium uppercase">
                        {new Intl.DateTimeFormat("pt-BR", {
                          month: "short",
                        }).format(item.startsAt)}
                      </span>
                      <span className="tabular text-base leading-tight font-semibold">
                        {item.startsAt.getDate()}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {item.title}
                      </p>
                      <p className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs">
                        <Clock className="size-3" />
                        {today ? "Hoje" : formatDate(item.startsAt, "short")} ·{" "}
                        {formatTime(item.startsAt)}
                        {item.lead ? ` · ${item.lead.name}` : ""}
                      </p>
                    </div>

                    <Badge variant="outline" size="sm" className="shrink-0">
                      {APPOINTMENT_TYPE_LABELS[item.type]}
                    </Badge>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export type FollowUpRow = {
  id: string;
  name: string;
  phone: string | null;
  nextFollowUpAt: Date | null;
  interestVehicle: { brand: string; model: string } | null;
};

/** Overdue and due-today follow-ups — the "do this now" list. */
export function FollowUpsCard({ items }: { items: FollowUpRow[] }) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>Follow-ups pendentes</CardTitle>
        <CardAction>
          <Button asChild variant="ghost" size="sm">
            <Link href="/crm">Ver todos</Link>
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="flex-1">
        {items.length === 0 ? (
          <EmptyState
            compact
            icon={CalendarClock}
            title="Nenhum follow-up atrasado"
            description="Sua carteira está em dia. Bom trabalho."
          />
        ) : (
          <ul className="divide-y">
            {items.map((lead) => {
              const overdue =
                lead.nextFollowUpAt && lead.nextFollowUpAt < new Date();

              return (
                <li key={lead.id}>
                  <Link
                    href={`/crm/${lead.id}`}
                    className="hover:bg-accent/60 -mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors"
                  >
                    <span
                      className={cn(
                        "size-2 shrink-0 rounded-full",
                        overdue ? "bg-destructive" : "bg-warning",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{lead.name}</p>
                      {lead.interestVehicle ? (
                        <p className="text-muted-foreground truncate text-xs">
                          {lead.interestVehicle.brand}{" "}
                          {lead.interestVehicle.model}
                        </p>
                      ) : null}
                    </div>
                    <span
                      className={cn(
                        "shrink-0 text-xs font-medium",
                        overdue ? "text-destructive" : "text-muted-foreground",
                      )}
                    >
                      {lead.nextFollowUpAt
                        ? formatDate(lead.nextFollowUpAt, "short")
                        : "—"}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
