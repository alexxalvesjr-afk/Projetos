"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  CalendarClock,
  CheckCheck,
  CircleDollarSign,
  Target,
  TriangleAlert,
  UserPlus,
} from "lucide-react";
import type { NotificationType } from "@prisma/client";

import { cn } from "@/lib/utils";
import { formatRelative } from "@/lib/format";
import { markAllNotificationsRead, markNotificationRead } from "@/server/actions/notification.actions";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { EmptyState } from "@/components/shared/empty-state";

export type NotificationItem = {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  createdAt: Date;
};

const ICONS: Record<NotificationType, typeof Bell> = {
  LEAD_ASSIGNED: UserPlus,
  LEAD_STAGE_CHANGED: UserPlus,
  TASK_DUE: CalendarClock,
  APPOINTMENT_REMINDER: CalendarClock,
  VEHICLE_SOLD: CircleDollarSign,
  GOAL_REACHED: Target,
  STOCK_AGING: TriangleAlert,
  SYSTEM: Bell,
};

const ACCENTS: Record<NotificationType, string> = {
  LEAD_ASSIGNED: "bg-info/12 text-info",
  LEAD_STAGE_CHANGED: "bg-info/12 text-info",
  TASK_DUE: "bg-warning/14 text-warning",
  APPOINTMENT_REMINDER: "bg-primary/10 text-primary",
  VEHICLE_SOLD: "bg-success/12 text-success",
  GOAL_REACHED: "bg-success/12 text-success",
  STOCK_AGING: "bg-destructive/12 text-destructive",
  SYSTEM: "bg-muted text-muted-foreground",
};

export function NotificationsMenu({
  initialItems,
}: {
  initialItems: NotificationItem[];
}) {
  const router = useRouter();
  const [items, setItems] = React.useState(initialItems);
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  // Keep in sync when the server component re-renders with fresher data.
  React.useEffect(() => setItems(initialItems), [initialItems]);

  const unread = items.filter((n) => !n.read).length;

  function handleOpen(id: string, link: string | null) {
    // Optimistic: the badge should drop the moment the row is clicked.
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    startTransition(async () => {
      await markNotificationRead({ id });
      router.refresh();
    });
    if (link) {
      setOpen(false);
      router.push(link);
    }
  }

  function handleMarkAll() {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    startTransition(async () => {
      await markAllNotificationsRead();
      router.refresh();
    });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={
            unread > 0 ? `${unread} notificações não lidas` : "Notificações"
          }
        >
          <Bell className="size-4.5" />
          <AnimatePresence>
            {unread > 0 ? (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="bg-destructive text-destructive-foreground absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full text-[10px] font-bold tabular-nums"
              >
                {unread > 9 ? "9+" : unread}
              </motion.span>
            ) : null}
          </AnimatePresence>
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-88 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-semibold">Notificações</p>
          {unread > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAll}
              disabled={pending}
              className="text-muted-foreground h-7 text-xs"
            >
              <CheckCheck className="size-3.5" />
              Marcar todas
            </Button>
          ) : null}
        </div>

        <div className="scrollbar-thin max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <EmptyState
              compact
              icon={Bell}
              title="Tudo em dia"
              description="Nenhuma notificação por aqui."
            />
          ) : (
            <ul className="divide-y">
              {items.map((item) => {
                const Icon = ICONS[item.type];

                const rowClassName = cn(
                  "hover:bg-accent/60 flex w-full items-start gap-3 px-4 py-3 text-left transition-colors",
                  !item.read && "bg-primary/[0.04]",
                );

                const onActivate = (event: React.MouseEvent) => {
                  // Navigation is driven by `handleOpen` so the read receipt is
                  // written before the route changes.
                  event.preventDefault();
                  handleOpen(item.id, item.link);
                };

                const body = (
                  <>
                    <span
                        className={cn(
                          "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
                          ACCENTS[item.type],
                        )}
                      >
                        <Icon className="size-4" />
                      </span>

                      <span className="min-w-0 flex-1 space-y-0.5">
                        <span className="flex items-center gap-2">
                          <span
                            className={cn(
                              "truncate text-sm",
                              item.read ? "font-medium" : "font-semibold",
                            )}
                          >
                            {item.title}
                          </span>
                          {!item.read ? (
                            <span className="bg-primary size-1.5 shrink-0 rounded-full" />
                          ) : null}
                        </span>
                        {item.body ? (
                          <span className="text-muted-foreground line-clamp-2 block text-xs leading-relaxed">
                            {item.body}
                          </span>
                        ) : null}
                        <span className="text-muted-foreground block text-[11px]">
                          {formatRelative(item.createdAt)}
                        </span>
                      </span>
                  </>
                );

                return (
                  <li key={item.id}>
                    {item.link ? (
                      <Link
                        href={item.link}
                        onClick={onActivate}
                        className={rowClassName}
                      >
                        {body}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={onActivate}
                        className={rowClassName}
                      >
                        {body}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
