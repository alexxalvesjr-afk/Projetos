"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { TaskPriority } from "@prisma/client";
import { ListTodo, Plus } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import { createLeadTask, toggleTask } from "@/server/actions/lead.actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
  URGENT: "Urgente",
};

const PRIORITY_VARIANTS: Record<
  TaskPriority,
  "secondary" | "info" | "warning" | "destructive"
> = {
  LOW: "secondary",
  MEDIUM: "info",
  HIGH: "warning",
  URGENT: "destructive",
};

export type TaskRow = {
  id: string;
  title: string;
  priority: TaskPriority;
  dueAt: Date | null;
  completedAt: Date | null;
  assignedTo: { id: string; name: string } | null;
};

export function LeadTasks({
  leadId,
  tasks,
}: {
  leadId: string;
  tasks: TaskRow[];
}) {
  const router = useRouter();
  const [title, setTitle] = React.useState("");
  const [adding, setAdding] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  // Optimistic completion so the checkbox responds instantly.
  const [optimistic, setOptimistic] = React.useState<Record<string, boolean>>({});

  function isDone(task: TaskRow) {
    return optimistic[task.id] ?? Boolean(task.completedAt);
  }

  function toggle(task: TaskRow) {
    const next = !isDone(task);
    setOptimistic((prev) => ({ ...prev, [task.id]: next }));

    startTransition(async () => {
      const result = await toggleTask({ id: task.id, completed: next });
      if (!result.ok) {
        setOptimistic((prev) => ({ ...prev, [task.id]: !next }));
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  function add() {
    const value = title.trim();
    if (value.length < 2) return;

    startTransition(async () => {
      const result = await createLeadTask({
        leadId,
        title: value,
        priority: "MEDIUM",
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      setTitle("");
      setAdding(false);
      toast.success("Tarefa criada");
      router.refresh();
    });
  }

  const open = tasks.filter((task) => !isDone(task));
  const done = tasks.filter((task) => isDone(task));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tarefas</CardTitle>
        <CardAction>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAdding((value) => !value)}
          >
            <Plus />
            Nova
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="space-y-3">
        {adding ? (
          <div className="flex gap-2">
            <Input
              autoFocus
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") add();
                if (event.key === "Escape") setAdding(false);
              }}
              placeholder="Ligar para confirmar a visita…"
            />
            <Button onClick={add} loading={pending} disabled={title.trim().length < 2}>
              Criar
            </Button>
          </div>
        ) : null}

        {tasks.length === 0 && !adding ? (
          <EmptyState
            compact
            icon={ListTodo}
            title="Nenhuma tarefa"
            description="Crie lembretes para não perder o timing do follow-up."
          />
        ) : (
          <ul className="space-y-1">
            {[...open, ...done].map((task) => {
              const completed = isDone(task);
              const overdue =
                !completed && task.dueAt && new Date(task.dueAt) < new Date();

              return (
                <li
                  key={task.id}
                  className="hover:bg-accent/50 -mx-2 flex items-start gap-2.5 rounded-lg px-2 py-2 transition-colors"
                >
                  <Checkbox
                    checked={completed}
                    onCheckedChange={() => toggle(task)}
                    className="mt-0.5"
                    aria-label={`Concluir ${task.title}`}
                  />

                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "text-sm leading-snug",
                        completed && "text-muted-foreground line-through",
                      )}
                    >
                      {task.title}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Badge variant={PRIORITY_VARIANTS[task.priority]} size="sm">
                        {PRIORITY_LABELS[task.priority]}
                      </Badge>
                      {task.dueAt ? (
                        <span
                          className={cn(
                            "text-xs",
                            overdue
                              ? "text-destructive font-medium"
                              : "text-muted-foreground",
                          )}
                        >
                          {formatDate(task.dueAt, "short")}
                        </span>
                      ) : null}
                      {task.assignedTo ? (
                        <span className="text-muted-foreground text-xs">
                          · {task.assignedTo.name.split(" ")[0]}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
