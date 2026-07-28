"use client";

import Link from "next/link";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CalendarClock,
  Car,
  CheckSquare,
  Flame,
  GripVertical,
  MessageCircle,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { formatCurrencyShort, formatDate } from "@/lib/format";
import {
  LEAD_SOURCE_LABELS,
  TEMPERATURE_VARIANTS,
  scoreBand,
} from "@/lib/domain/lead";
import type { LeadCard as LeadCardData } from "@/server/repositories/lead.repository";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/avatar";
import { Tooltip } from "@/components/ui/tooltip";

export function LeadCard({
  lead,
  overlay = false,
}: {
  lead: LeadCardData;
  overlay?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lead.id, data: { stage: lead.stage } });

  const overdue =
    lead.nextFollowUpAt && new Date(lead.nextFollowUpAt) < new Date();
  const band = scoreBand(lead.score);

  return (
    <li
      ref={overlay ? undefined : setNodeRef}
      style={
        overlay
          ? undefined
          : { transform: CSS.Transform.toString(transform), transition }
      }
      className={cn(
        "bg-card group rounded-xl border shadow-xs transition-shadow",
        isDragging && "opacity-40",
        overlay && "rotate-2 shadow-lg",
      )}
    >
      <div className="relative p-3">
        {/* Drag handle is separate from the link so a click still navigates. */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Mover ${lead.name}`}
          className="text-muted-foreground hover:bg-accent absolute top-2 right-2 cursor-grab rounded p-1 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 active:cursor-grabbing"
        >
          <GripVertical className="size-3.5" />
        </button>

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
