import Link from "next/link";
import type { ActivityType } from "@prisma/client";
import {
  Activity,
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  FileText,
  Mail,
  MessageCircle,
  PhoneCall,
  StickyNote,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { formatRelative } from "@/lib/format";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/shared/empty-state";

const ICONS: Record<ActivityType, typeof Activity> = {
  NOTE: StickyNote,
  CALL: PhoneCall,
  EMAIL: Mail,
  WHATSAPP: MessageCircle,
  MEETING: Users,
  STAGE_CHANGE: ArrowRight,
  TASK_CREATED: FileText,
  TASK_COMPLETED: CheckCircle2,
  APPOINTMENT: CalendarCheck,
  PROPOSAL_SENT: FileText,
  SYSTEM: Activity,
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

export type ActivityRow = {
  id: string;
  type: ActivityType;
  content: string | null;
  createdAt: Date;
  user: { id: string; name: string; image: string | null } | null;
  lead: { id: string; name: string } | null;
};

export function ActivityFeed({ items }: { items: ActivityRow[] }) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>Atividade recente</CardTitle>
        <CardAction>
          <Button asChild variant="ghost" size="sm">
            <Link href="/crm">Ver funil</Link>
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="flex-1">
        {items.length === 0 ? (
          <EmptyState
            compact
            icon={Activity}
            title="Nada por aqui ainda"
            description="Interações com leads aparecem neste histórico."
          />
        ) : (
          <ol className="relative space-y-4">
            {/* Continuous rail behind the markers. */}
            <span
              aria-hidden
              className="bg-border absolute top-2 bottom-2 left-[15px] w-px"
            />

            {items.map((item) => {
              const Icon = ICONS[item.type];

              return (
                <li key={item.id} className="relative flex gap-3">
                  <span
                    className={cn(
                      "ring-card relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full ring-4",
                      TINTS[item.type],
                    )}
                  >
                    <Icon className="size-3.5" />
                  </span>

                  <div className="min-w-0 flex-1 pt-1">
                    <p className="text-sm leading-snug">
                      {item.user ? (
                        <span className="font-medium">{item.user.name}</span>
                      ) : (
                        <span className="font-medium">Sistema</span>
                      )}
                      {item.lead ? (
                        <>
                          <span className="text-muted-foreground"> · </span>
                          <Link
                            href={`/crm/${item.lead.id}`}
                            className="hover:text-primary font-medium underline-offset-2 hover:underline"
                          >
                            {item.lead.name}
                          </Link>
                        </>
                      ) : null}
                    </p>

                    {item.content ? (
                      <p className="text-muted-foreground mt-0.5 line-clamp-2 text-[13px] leading-relaxed">
                        {item.content}
                      </p>
                    ) : null}

                    <p className="text-muted-foreground mt-1 text-[11px]">
                      {formatRelative(item.createdAt)}
                    </p>
                  </div>

                  {item.user ? (
                    <UserAvatar
                      name={item.user.name}
                      image={item.user.image}
                      className="size-6 shrink-0"
                    />
                  ) : null}
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
