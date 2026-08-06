"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CalendarClock,
  Car,
  CheckSquare,
  Flame,
  MessageCircle,
  MoveRight,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { formatCurrencyShort, formatDate } from "@/lib/format";
import {
  LEAD_SOURCE_LABELS,
  PIPELINE_STAGES,
  TEMPERATURE_VARIANTS,
  scoreBand,
} from "@/lib/domain/lead";
import type { LeadStage } from "@prisma/client";
import type { LeadCard as LeadCardData } from "@/server/repositories/lead.repository";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/ui/avatar";
import { Tooltip } from "@/components/ui/tooltip";

export function LeadCard({
  lead,
  overlay = false,
  onMove,
}: {
  lead: LeadCardData;
  overlay?: boolean;
  onMove?: (leadId: string, to: LeadStage) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lead.id, data: { stage: lead.stage } });

  const router = useRouter();

  /**
   * Opening the lead has to be done by hand.
   *
   * dnd-kit swallows the click that follows a pointerdown it was listening to,
   * so with the listeners on the whole card the anchor's own navigation never
   * fires. Measuring the travel ourselves recovers it: under the sensor's 6px
   * threshold nothing was dragged, so the gesture was a click and should open
   * the lead. The anchor stays in the markup for keyboard, middle-click and
   * "open in new tab", none of which come through this path.
   */
  const pressOrigin = React.useRef<{ x: number; y: number } | null>(null);

  function handlePointerDown(event: React.PointerEvent<HTMLLIElement>) {
    listeners?.onPointerDown?.(event);
    pressOrigin.current = { x: event.clientX, y: event.clientY };
  }

  function handlePointerUp(event: React.PointerEvent<HTMLLIElement>) {
    const origin = pressOrigin.current;
    pressOrigin.current = null;
    if (!origin || event.button !== 0) return;

    const travelled = Math.hypot(
      event.clientX - origin.x,
      event.clientY - origin.y,
    );
    if (travelled > 6) return;

    // The stage menu owns its own clicks.
    if ((event.target as HTMLElement).closest("[data-stage-menu]")) return;

    router.push(`/crm/${lead.id}`);
  }

  const overdue =
    lead.nextFollowUpAt && new Date(lead.nextFollowUpAt) < new Date();
  const band = scoreBand(lead.score);

  return (
    // Drag listeners live on the whole card, not on a grip. The sensor waits
    // for 6px of travel before it starts a drag, so a plain click still opens
    // the lead and the buttons inside keep working — the small handle was only
    // ever a workaround for not having that threshold.
    <li
      ref={overlay ? undefined : setNodeRef}
      {...(overlay ? {} : listeners)}
      {...(overlay
        ? {}
        : { onPointerDown: handlePointerDown, onPointerUp: handlePointerUp })}
      style={
        overlay
          ? undefined
          : { transform: CSS.Transform.toString(transform), transition }
      }
      className={cn(
        "bg-card group rounded-xl border shadow-xs transition-shadow",
        !overlay && "cursor-grab touch-manipulation active:cursor-grabbing",
        isDragging && "opacity-40",
        overlay && "rotate-2 shadow-lg",
      )}
    >
      <div className="relative p-3">
        {/* "Mover": the promise the page header makes, and the only way to
            change stage without a pointer. Doubles as the keyboard drag
            activator, so the card stays reachable by tab and space. */}
        {onMove && !overlay ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              ref={setActivatorNodeRef}
              {...attributes}
              data-stage-menu
              aria-label={`Mover ${lead.name} de etapa`}
              className="text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-ring absolute top-1.5 right-1.5 z-10 rounded-md p-1.5 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:outline-none max-md:opacity-100"
              onPointerDown={(event) => event.stopPropagation()}
            >
              <MoveRight className="size-3.5" />
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-48" data-stage-menu>
              <DropdownMenuLabel>Mover para</DropdownMenuLabel>
              {PIPELINE_STAGES.filter((stage) => stage.id !== lead.stage).map(
                (stage) => (
                  <DropdownMenuItem
                    key={stage.id}
                    onSelect={() => onMove(lead.id, stage.id)}
                  >
                    <span
                      aria-hidden
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: stage.color }}
                    />
                    {stage.label}
                  </DropdownMenuItem>
                ),
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}

        <Link href={`/crm/${lead.id}`} className="block space-y-2.5">
          <div className="space-y-1 pr-6">
            <p className="truncate text-sm leading-tight font-semibold">
              {lead.name}
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" size="sm">
                {LEAD_SOURCE_LABELS[lead.source]}
              </Badge>
              <Badge variant={TEMPERATURE_VARIANTS[lead.temperature]} size="sm">
                <Flame className="size-2.5" />
                {lead.score}
              </Badge>
            </div>
          </div>

          {lead.interestVehicle ? (
            <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <Car className="size-3.5 shrink-0" />
              <span className="truncate">
                {lead.interestVehicle.brand} {lead.interestVehicle.model}
              </span>
            </p>
          ) : null}

          {lead.budgetCents ? (
            <p className="tabular text-xs font-medium">
              Orçamento {formatCurrencyShort(lead.budgetCents)}
            </p>
          ) : null}

          <div className="flex items-center justify-between gap-2 border-t pt-2.5">
            <div className="text-muted-foreground flex items-center gap-2.5 text-[11px]">
              {lead._count.activities > 0 ? (
                <Tooltip content={`${lead._count.activities} interações`}>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="size-3" />
                    {lead._count.activities}
                  </span>
                </Tooltip>
              ) : null}

              {lead._count.tasks > 0 ? (
                <Tooltip content={`${lead._count.tasks} tarefas`}>
                  <span className="flex items-center gap-1">
                    <CheckSquare className="size-3" />
                    {lead._count.tasks}
                  </span>
                </Tooltip>
              ) : null}

              {lead.nextFollowUpAt ? (
                <Tooltip content={band.label}>
                  <span
                    className={cn(
                      "flex items-center gap-1",
                      overdue && "text-destructive font-medium",
                    )}
                  >
                    <CalendarClock className="size-3" />
                    {formatDate(lead.nextFollowUpAt, "short")}
                  </span>
                </Tooltip>
              ) : null}
            </div>

            {lead.assignedTo ? (
              <Tooltip content={lead.assignedTo.name}>
                <UserAvatar
                  name={lead.assignedTo.name}
                  image={lead.assignedTo.image}
                  className="size-6 shrink-0"
                />
              </Tooltip>
            ) : null}
          </div>
        </Link>
      </div>
    </li>
  );
}
