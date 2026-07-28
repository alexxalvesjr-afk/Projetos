"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { AppointmentStatus, AppointmentType } from "@prisma/client";
import { ChevronLeft, ChevronRight, Clock, MapPin, Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatDate, formatTime } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const APPOINTMENT_TYPE_LABELS: Record<AppointmentType, string> = {
  VISIT: "Visita",
  TEST_DRIVE: "Test drive",
  CALL: "Ligação",
  DELIVERY: "Entrega",
  MEETING: "Reunião",
  REMINDER: "Lembrete",
  MAINTENANCE: "Manutenção",
};

export const APPOINTMENT_TYPE_COLORS: Record<AppointmentType, string> = {
  VISIT: "var(--chart-1)",
  TEST_DRIVE: "var(--chart-3)",
  CALL: "var(--chart-2)",
  DELIVERY: "var(--chart-5)",
  MEETING: "var(--chart-4)",
  REMINDER: "var(--chart-6)",
  MAINTENANCE: "var(--muted-foreground)",
};

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  SCHEDULED: "Agendado",
  CONFIRMED: "Confirmado",
  COMPLETED: "Concluído",
  CANCELED: "Cancelado",
  NO_SHOW: "Não compareceu",
};

const STATUS_VARIANTS: Record<
  AppointmentStatus,
  "secondary" | "success" | "warning" | "destructive" | "info"
> = {
  SCHEDULED: "info",
  CONFIRMED: "success",
  COMPLETED: "secondary",
  CANCELED: "destructive",
  NO_SHOW: "warning",
};

export type CalendarEvent = {
  id: string;
  title: string;
  type: AppointmentType;
  status: AppointmentStatus;
  startsAt: Date;
  endsAt: Date;
  location: string | null;
  lead: { id: string; name: string } | null;
  assignedTo: { id: string; name: string } | null;
};

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function sameDay(a: Date, b: Date) {
  return (
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
  );
}

/** Six-week grid covering the month, padded with neighbouring days. */
function monthGrid(anchor: Date): Date[] {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());

  return Array.from({ length: 42 }, (_, i) => {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    return day;
  });
}

export function CalendarView({
  events,
  onCreate,
}: {
  events: CalendarEvent[];
  onCreate: (date?: Date) => void;
}) {
  const router = useRouter();
  const [anchor, setAnchor] = React.useState(() => new Date());
  const [selected, setSelected] = React.useState(() => new Date());
  const [mode, setMode] = React.useState<"month" | "list">("month");

  // Group once per event set rather than scanning per cell.
  const byDay = React.useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const key = new Date(event.startsAt).toDateString();
      const bucket = map.get(key) ?? [];
      bucket.push(event);
      map.set(key, bucket);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
    }
    return map;
  }, [events]);

  const days = React.useMemo(() => monthGrid(anchor), [anchor]);
  const selectedEvents = byDay.get(selected.toDateString()) ?? [];

  const upcoming = React.useMemo(
    () =>
      [...events]
        .filter((event) => event.startsAt >= new Date())
        .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime()),
    [events],
  );

  function shiftMonth(delta: number) {
    setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + delta, 1));
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => shiftMonth(-1)}
            aria-label="Mês anterior"
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => shiftMonth(1)}
            aria-label="Próximo mês"
          >
            <ChevronRight />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const today = new Date();
              setAnchor(today);
              setSelected(today);
            }}
          >
            Hoje
          </Button>
        </div>

        <h2 className="text-base font-semibold capitalize">
          {new Intl.DateTimeFormat("pt-BR", {
            month: "long",
            year: "numeric",
          }).format(anchor)}
        </h2>

        <Tabs
          value={mode}
          onValueChange={(value) => setMode(value as typeof mode)}
          className="ml-auto"
        >
          <TabsList>
            <TabsTrigger value="month">Mês</TabsTrigger>
            <TabsTrigger value="list">Lista</TabsTrigger>
          </TabsList>
        </Tabs>

        <Button onClick={() => onCreate(selected)}>
          <Plus />
          Novo compromisso
        </Button>
      </div>

      {mode === "month" ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
          <Card className="overflow-hidden p-0">
            {/* Weekday header */}
            <div className="text-muted-foreground grid grid-cols-7 border-b text-center text-xs font-medium">
              {WEEKDAYS.map((day) => (
                <div key={day} className="py-2">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {days.map((day, index) => {
                const dayEvents = byDay.get(day.toDateString()) ?? [];
                const outside = day.getMonth() !== anchor.getMonth();
                const isToday = sameDay(day, new Date());
                const isSelected = sameDay(day, selected);

                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setSelected(day)}
                    onDoubleClick={() => onCreate(day)}
                    className={cn(
                      "hover:bg-accent/60 relative min-h-24 border-r border-b p-1.5 text-left transition-colors last:border-r-0",
                      // Trailing column and final row should not double-border.
                      (index + 1) % 7 === 0 && "border-r-0",
                      index >= 35 && "border-b-0",
                      outside && "bg-muted/30",
                      isSelected && "bg-primary/5 ring-primary/40 ring-1 ring-inset",
                    )}
                  >
                    <span
                      className={cn(
                        "tabular inline-flex size-6 items-center justify-center rounded-full text-xs font-medium",
                        outside && "text-muted-foreground/60",
                        isToday && "bg-primary text-primary-foreground",
                      )}
                    >
                      {day.getDate()}
                    </span>

                    <div className="mt-1 space-y-0.5">
                      {dayEvents.slice(0, 3).map((event) => (
                        <div
                          key={event.id}
                          className="flex items-center gap-1 truncate rounded px-1 py-0.5 text-[10px] leading-tight font-medium"
                          style={{
                            backgroundColor: `color-mix(in oklch, ${APPOINTMENT_TYPE_COLORS[event.type]} 16%, transparent)`,
                            color: APPOINTMENT_TYPE_COLORS[event.type],
                          }}
                        >
                          <span className="tabular shrink-0">
                            {formatTime(event.startsAt)}
                          </span>
                          <span className="truncate">{event.title}</span>
                        </div>
                      ))}
                      {dayEvents.length > 3 ? (
                        <p className="text-muted-foreground px-1 text-[10px]">
                          +{dayEvents.length - 3} mais
                        </p>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Day detail */}
          <Card className="h-fit">
            <CardContent className="space-y-3 pt-5">
              <div>
                <p className="text-muted-foreground text-xs font-medium uppercase">
                  {new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(
                    selected,
                  )}
                </p>
                <p className="text-lg font-semibold">
                  {formatDate(selected, "long")}
                </p>
              </div>

              {selectedEvents.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-muted-foreground text-sm">
                    Nenhum compromisso neste dia.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => onCreate(selected)}
                  >
                    <Plus />
                    Agendar
                  </Button>
                </div>
              ) : (
                <ul className="space-y-2">
                  {selectedEvents.map((event) => (
                    <li key={event.id}>
                      <EventRow event={event} />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="pt-5">
            {upcoming.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center text-sm">
                Nenhum compromisso futuro.
              </p>
            ) : (
              <ul className="space-y-2">
                {upcoming.map((event) => (
                  <li key={event.id}>
                    <EventRow event={event} showDate />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );

  function EventRow({
    event,
    showDate = false,
  }: {
    event: CalendarEvent;
    showDate?: boolean;
  }) {
    return (
      <div className="hover:bg-accent/50 flex gap-3 rounded-lg border p-2.5 transition-colors">
        <span
          aria-hidden
          className="w-1 shrink-0 rounded-full"
          style={{ backgroundColor: APPOINTMENT_TYPE_COLORS[event.type] }}
        />

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-sm font-medium">{event.title}</p>
            <Badge variant={STATUS_VARIANTS[event.status]} size="sm">
              {STATUS_LABELS[event.status]}
            </Badge>
          </div>

          <p className="text-muted-foreground flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs">
            <span className="flex items-center gap-1">
              <Clock className="size-3" />
              {showDate ? `${formatDate(event.startsAt, "short")} · ` : ""}
              {formatTime(event.startsAt)}–{formatTime(event.endsAt)}
            </span>
            {event.location ? (
              <span className="flex items-center gap-1 truncate">
                <MapPin className="size-3" />
                {event.location}
              </span>
            ) : null}
          </p>

          {event.lead ? (
            <Link
              href={`/crm/${event.lead.id}`}
              className="text-primary text-xs font-medium underline-offset-2 hover:underline"
              onClick={() => router.prefetch(`/crm/${event.lead!.id}`)}
            >
              {event.lead.name}
            </Link>
          ) : null}
        </div>
      </div>
    );
  }
}
