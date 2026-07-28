"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { ActivityType } from "@prisma/client";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  Mail,
  MessageCircle,
  PhoneCall,
  Send,
  StickyNote,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { formatRelative } from "@/lib/format";
import { ACTIVITY_LABELS } from "@/lib/domain/lead";
import { addLeadActivity } from "@/server/actions/lead.actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const ICONS: Record<ActivityType, typeof StickyNote> = {
  NOTE: StickyNote,
  CALL: PhoneCall,
  EMAIL: Mail,
  WHATSAPP: MessageCircle,
  MEETING: Users,
  STAGE_CHANGE: ArrowRight,
  TASK_CREATED: FileText,
  TASK_COMPLETED: CheckCircle2,
  APPOINTMENT: FileText,
  PROPOSAL_SENT: FileText,
  SYSTEM: StickyNote,
};

const TINTS: Record<ActivityType, string> = {
  NOTE: "bg-muted text-muted-foreground",
  CALL: "bg-info/12 text-info",
  EMAIL: "bg-info/12 text-info",
  WHATSAPP: "bg-success/12 text-success",
  MEETING: "bg-primary/10 text-primary",
  STAGE_CHANGE: "bg-primary/10 text-primary",
  TASK_CREATED: "bg-warning/14 text-warning",
  TASK_COMPLETED: "bg-success/12 text-success",
  APPOINTMENT: "bg-primary/10 text-primary",
  PROPOSAL_SENT: "bg-warning/14 text-warning",
  SYSTEM: "bg-muted text-muted-foreground",
};

/** Interaction kinds a user can log by hand. */
const LOGGABLE = [
  { type: "NOTE", label: "Anotação", icon: StickyNote },
  { type: "CALL", label: "Ligação", icon: PhoneCall },
  { type: "WHATSAPP", label: "WhatsApp", icon: MessageCircle },
  { type: "EMAIL", label: "E-mail", icon: Mail },
  { type: "MEETING", label: "Reunião", icon: Users },
  { type: "PROPOSAL_SENT", label: "Proposta", icon: FileText },
] as const;

export type TimelineEntry = {
  id: string;
  type: ActivityType;
  content: string | null;
  createdAt: Date;
  user: { id: string; name: string; image: string | null } | null;
};

export function LeadTimeline({
  leadId,
  entries,
}: {
  leadId: string;
  entries: TimelineEntry[];
}) {
  const router = useRouter();
  const [type, setType] = React.useState<(typeof LOGGABLE)[number]["type"]>("NOTE");
  const [content, setContent] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  function submit() {
    const text = content.trim();
    if (!text) return;

    startTransition(async () => {
      const result = await addLeadActivity({ leadId, type, content: text });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      setContent("");
      toast.success("Interação registrada");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico</CardTitle>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Composer */}
        <div className="space-y-2.5 rounded-xl border p-3">
          <div className="flex flex-wrap gap-1.5">
            {LOGGABLE.map((option) => (
              <button
                key={option.type}
                type="button"
                onClick={() => setType(option.type)}
                aria-pressed={type === option.type}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors",
                  type === option.type
                    ? "border-primary bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <option.icon className="size-3.5" />
                {option.label}
              </button>
            ))}
          </div>

          <Textarea
            rows={3}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            onKeyDown={(event) => {
              // ⌘/Ctrl+Enter submits — the shortcut people expect in a composer.
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.preventDefault();
                submit();
              }
            }}
            placeholder="O que aconteceu nesta interação?"
            className="border-0 p-0 shadow-none focus-visible:ring-0"
          />

          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-[11px]">
              ⌘ + Enter para enviar
            </p>
            <Button
              size="sm"
              onClick={submit}
              loading={pending}
              disabled={!content.trim()}
            >
              <Send />
              Registrar
            </Button>
          </div>
        </div>

        {/* Timeline */}
        <ol className="relative space-y-4">
          <span
            aria-hidden
            className="bg-border absolute top-2 bottom-2 left-[15px] w-px"
          />

          {entries.map((entry) => {
            const Icon = ICONS[entry.type];
            return (
              <li key={entry.id} className="relative flex gap-3">
                <span
                  className={cn(
                    "ring-card relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full ring-4",
                    TINTS[entry.type],
                  )}
                >
                  <Icon className="size-3.5" />
                </span>

                <div className="min-w-0 flex-1 pt-1">
                  <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
                    <span className="font-medium">
                      {entry.user?.name ?? "Sistema"}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {ACTIVITY_LABELS[entry.type]} ·{" "}
                      {formatRelative(entry.createdAt)}
                    </span>
                  </p>
                  {entry.content ? (
                    <p className="text-muted-foreground mt-1 text-[13px] leading-relaxed whitespace-pre-line">
                      {entry.content}
                    </p>
                  ) : null}
                </div>

                {entry.user ? (
                  <UserAvatar
                    name={entry.user.name}
                    image={entry.user.image}
                    className="size-6 shrink-0"
                  />
                ) : null}
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
