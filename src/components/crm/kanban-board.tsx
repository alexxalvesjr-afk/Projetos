"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { LeadStage } from "@prisma/client";
import { Inbox } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { formatCurrencyShort } from "@/lib/format";
import { PIPELINE_STAGES } from "@/lib/domain/lead";
import { moveLead } from "@/server/actions/lead.actions";
import type { LeadCard as LeadCardData } from "@/server/repositories/lead.repository";
import { LeadCard } from "@/components/crm/lead-card";

type Columns = Record<LeadStage, LeadCardData[]>;

function Column({
  stage,
  leads,
  isOver,
  onMove,
}: {
  stage: (typeof PIPELINE_STAGES)[number];
  leads: LeadCardData[];
  isOver: boolean;
  onMove: (leadId: string, to: LeadStage) => void;
}) {
  const { setNodeRef } = useDroppable({ id: stage.id });

  const value = leads.reduce(
    (sum, lead) => sum + (lead.interestVehicle?.priceCents ?? 0),
    0,
  );

  return (
    <div className="flex h-full w-72 shrink-0 flex-col">
      {/* Header — a solid bar in the stage colour rather than a dot beside
          text: at six columns the eye needs to find a lane before it reads a
          label, and a filled band does that from across the room. */}
      <div
        className="mb-3 flex items-center gap-2 rounded-lg px-3 py-2 text-white"
        style={{ backgroundColor: stage.color }}
      >
        <h3 className="truncate text-sm font-semibold">{stage.label}</h3>
        <span className="tabular ml-auto shrink-0 rounded-md bg-black/20 px-1.5 py-0.5 text-xs font-semibold">
          {leads.length}
        </span>
      </div>

      {value > 0 ? (
        <p className="text-muted-foreground tabular -mt-1.5 mb-2 px-1 text-xs">
          {formatCurrencyShort(value)}
        </p>
      ) : null}

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={cn(
          "scrollbar-thin flex-1 space-y-2.5 overflow-y-auto rounded-xl border border-dashed p-2 transition-colors",
          isOver
            ? "border-primary/50 bg-primary/5"
            : "border-transparent bg-muted/40",
        )}
      >
        <SortableContext
          items={leads.map((lead) => lead.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="space-y-2.5">
            {leads.map((lead) => (
              <LeadCard key={lead.id} lead={lead} onMove={onMove} />
            ))}
          </ul>
        </SortableContext>

        {leads.length === 0 ? (
          <div className="text-muted-foreground/70 flex flex-col items-center gap-1.5 py-8 text-center">
            <Inbox className="size-5" strokeWidth={1.5} />
            <p className="text-xs">Arraste um lead para cá</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Pipeline board.
 *
 * State is optimistic: the card moves the instant it is dropped and only
 * reverts if the server rejects the change. Waiting on a round trip before
 * repainting makes drag-and-drop feel broken.
 */
export function KanbanBoard({ initial }: { initial: Columns }) {
  const router = useRouter();
  const [columns, setColumns] = React.useState<Columns>(initial);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [overStage, setOverStage] = React.useState<LeadStage | null>(null);

  React.useEffect(() => setColumns(initial), [initial]);

  const sensors = useSensors(
    // 6px of travel before a drag begins, so a plain click still opens the
    // lead now that the whole card is a drag handle.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    // Touch needs a hold instead of a distance: the board scrolls sideways, and
    // a distance threshold would turn every swipe into a dropped card.
    useSensor(TouchSensor, {
      activationConstraint: { delay: 220, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const activeLead = React.useMemo(() => {
    if (!activeId) return null;
    for (const list of Object.values(columns)) {
      const found = list.find((lead) => lead.id === activeId);
      if (found) return found;
    }
    return null;
  }, [activeId, columns]);

  function findStage(leadId: string): LeadStage | null {
    for (const [stage, list] of Object.entries(columns)) {
      if (list.some((lead) => lead.id === leadId)) return stage as LeadStage;
    }
    return null;
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  /**
   * Applies a move optimistically and mirrors it to the server.
   *
   * Shared by the drag handler and the per-card "Mover" menu so both paths
   * produce the same ordering and the same rollback — two copies of this logic
   * would drift, and the one that drifts is always the one nobody tests.
   *
   * `beforeId` places the card above an existing one; omit it to append.
   */
  async function commitMove(leadId: string, to: LeadStage, beforeId?: string) {
    const from = findStage(leadId);
    if (!from) return;

    const snapshot = columns;
    const moving = columns[from].find((lead) => lead.id === leadId);
    if (!moving) return;

    const source = columns[from].filter((lead) => lead.id !== leadId);
    const targetList = from === to ? source : [...columns[to]];

    const overIndex = beforeId
      ? targetList.findIndex((lead) => lead.id === beforeId)
      : -1;
    const insertAt = overIndex === -1 ? targetList.length : overIndex;
    targetList.splice(insertAt, 0, { ...moving, stage: to });

    setColumns({
      ...columns,
      [from]: from === to ? targetList : source,
      [to]: targetList,
    });

    const result = await moveLead({
      id: leadId,
      stage: to,
      orderedIds: targetList.map((lead) => lead.id),
    });

    if (!result.ok) {
      setColumns(snapshot);
      toast.error(result.error);
      return;
    }

    if (from !== to) {
      const label = PIPELINE_STAGES.find((s) => s.id === to)?.label;
      toast.success(`${moving.name} movido para ${label}.`);
    }
    router.refresh();
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    setOverStage(null);
    if (!over) return;

    const leadId = String(active.id);
    // `over` is either a column (empty space) or another card.
    const overId = String(over.id);
    const to = (PIPELINE_STAGES.some((s) => s.id === overId)
      ? overId
      : findStage(overId)) as LeadStage | null;
    if (!to) return;

    await commitMove(leadId, to, overId === to ? undefined : overId);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={(event) => {
        const overId = event.over ? String(event.over.id) : null;
        setOverStage(
          overId && PIPELINE_STAGES.some((s) => s.id === overId)
            ? (overId as LeadStage)
            : overId
              ? findStage(overId)
              : null,
        );
      }}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setActiveId(null);
        setOverStage(null);
      }}
    >
      <div className="scrollbar-thin flex gap-4 overflow-x-auto pb-4">
        {PIPELINE_STAGES.map((stage) => (
          <Column
            key={stage.id}
            stage={stage}
            leads={columns[stage.id] ?? []}
            onMove={(leadId, to) => void commitMove(leadId, to)}
            isOver={overStage === stage.id}
          />
        ))}
      </div>

      {/* Overlay follows the cursor so the card never disappears mid-drag. */}
      <DragOverlay dropAnimation={{ duration: 200, easing: "cubic-bezier(0.16,1,0.3,1)" }}>
        {activeLead ? (
          <ul className="w-72">
            <LeadCard lead={activeLead} overlay />
          </ul>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
