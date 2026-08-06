"use client";

import Link from "next/link";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CalendarClock,
  Car,
  MessageCircle,
  MoreHorizontal,
  Pencil,
} from "lucide-react";
import type { LeadStage } from "@prisma/client";

import { cn, whatsappLink } from "@/lib/utils";
import { formatDate, formatPhone } from "@/lib/format";
import { LEAD_ORIGIN_PHRASES, PIPELINE_STAGES } from "@/lib/domain/lead";
import type { LeadCard as LeadCardData } from "@/server/repositories/lead.repository";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * A lead, as it appears on the board.
 *
 * The body is inert on click — it is a drag surface and nothing else. Editing
 * has its own button, so a press held a beat too long while reordering can no
 * longer open a screen nobody asked for. What is printed on it answers the
 * questions a salesperson has before dialling, in that order: who, on what
 * number, about which car, from where, and since when.
 */
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

  const overdue =
    lead.nextFollowUpAt && new Date(lead.nextFollowUpAt) < new Date();

  const vehicle = lead.interestVehicle;
  const vehicleLine = vehicle
    ? [vehicle.brand, vehicle.model, vehicle.version].filter(Boolean).join(" ")
    : null;

  return (
    <li
      ref={overlay ? undefined : setNodeRef}
      {...(overlay ? {} : listeners)}
      style={
        overlay
          ? undefined
          : { transform: CSS.Transform.toString(transform), transition }
      }
      className={cn(
        "bg-card group rounded-xl border p-3 shadow-xs transition-shadow",
        !overlay && "cursor-grab touch-manipulation active:cursor-grabbing",
        isDragging && "opacity-40",
        overlay && "rotate-2 shadow-lg",
      )}
    >
      <p className="truncate text-sm leading-tight font-semibold uppercase">
        {lead.name}
      </p>
      {lead.phone ? (
        <p className="text-muted-foreground tabular mt-0.5 truncate text-xs">
          {formatPhone(lead.phone)}
        </p>
      ) : null}

      {vehicleLine ? (
        <p className="text-muted-foreground mt-2 flex items-start gap-1.5 text-xs">
          <Car className="mt-px size-3.5 shrink-0" />
          <span className="line-clamp-2">{vehicleLine}</span>
        </p>
      ) : null}

      <p className="text-muted-foreground mt-2 text-[11px] font-medium tracking-wide uppercase">
        {LEAD_ORIGIN_PHRASES[lead.source]}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[11px]">
          Conversa {formatDate(lead.createdAt, "short")}
        </span>
        {lead.nextFollowUpAt ? (
          <span
            className={cn(
              "flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px]",
              overdue
                ? "bg-destructive/12 text-destructive font-medium"
                : "bg-info/12 text-info",
            )}
          >
            <CalendarClock className="size-3" />
            Visita {formatDate(lead.nextFollowUpAt, "short")}
          </span>
        ) : null}
      </div>

      {/* Actions. Stopping pointerdown here keeps a press on any of them from
          being read as the beginning of a drag. */}
      {!overlay ? (
        <div
          className="mt-3 flex items-center gap-1.5 border-t pt-2.5"
          onPointerDown={(event) => event.stopPropagation()}
        >
          {lead.phone ? (
            <a
              href={whatsappLink(
                lead.phone,
                `Olá ${lead.name.split(" ")[0]}, tudo bem?`,
              )}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Conversar com ${lead.name} no WhatsApp`}
              className="bg-success/12 text-success hover:bg-success/20 focus-visible:ring-ring flex size-7 shrink-0 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              <MessageCircle className="size-3.5" />
            </a>
          ) : null}

          <Link
            href={`/crm/${lead.id}`}
            className="hover:bg-accent focus-visible:ring-ring flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            <Pencil className="size-3" />
            Editar
          </Link>

          {onMove ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                ref={setActivatorNodeRef}
                {...attributes}
                aria-label={`Mover ${lead.name} de etapa`}
                className="text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-ring ml-auto flex size-7 shrink-0 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                <MoreHorizontal className="size-4" />
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-48">
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
        </div>
      ) : null}
    </li>
  );
}
