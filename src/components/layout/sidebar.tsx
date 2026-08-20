"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { PanelLeftClose, PanelLeftOpen, Plus } from "lucide-react";
import type { Role } from "@prisma/client";

import { cn } from "@/lib/utils";
import { hasPermission } from "@/lib/rbac";
import { NAVIGATION, isNavItemActive } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { Logo, LogoMark } from "@/components/shared/logo";

export function Sidebar({
  role,
  organizationName,
  className,
  onNavigate,
  collapsible = true,
}: {
  role: Role;
  organizationName: string;
  className?: string;
  /** Lets the mobile drawer close itself after a navigation. */
  onNavigate?: () => void;
  collapsible?: boolean;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);

  // Persist the preference so the shell feels stable between sessions.
  React.useEffect(() => {
    const stored = window.localStorage.getItem("duboss:sidebar-collapsed");
    if (stored === "1") setCollapsed(true);
  }, []);

  const toggle = React.useCallback(() => {
    setCollapsed((prev) => {
      window.localStorage.setItem("duboss:sidebar-collapsed", prev ? "0" : "1");
      return !prev;
    });
  }, []);

  const sections = React.useMemo(
    () =>
      NAVIGATION.map((section) => ({
        ...section,
        items: section.items.filter(
          (item) => !item.permission || hasPermission(role, item.permission),
        ),
      })).filter((section) => section.items.length > 0),
    [role],
  );

  const isCollapsed = collapsible && collapsed;

  return (
    <aside
      data-collapsed={isCollapsed}
      className={cn(
        "bg-sidebar border-sidebar-border flex h-full flex-col border-r",
        "transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
        isCollapsed ? "w-[68px]" : "w-64",
        className,
      )}
    >
      {/* Brand */}
      <div
        className={cn(
          "flex h-16 shrink-0 items-center gap-2 px-4",
          isCollapsed && "justify-center px-0",
        )}
      >
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="flex min-w-0 items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {isCollapsed ? <LogoMark /> : <Logo />}
        </Link>
      </div>

      {!isCollapsed ? (
        <div className="text-muted-foreground truncate px-4 pb-3 text-xs font-medium">
          {organizationName}
        </div>
      ) : null}

      {/* Primary action */}
      <div className={cn("px-3 pb-3", isCollapsed && "px-2.5")}>
        <Tooltip content={isCollapsed ? "Novo veículo" : null} side="right">
          <Button
            asChild
            size={isCollapsed ? "icon" : "default"}
            className={cn("w-full", isCollapsed && "size-11.5")}
          >
            <Link href="/inventory/new" onClick={onNavigate}>
              <Plus />
              {!isCollapsed ? "Novo veículo" : null}
            </Link>
          </Button>
        </Tooltip>
      </div>

      {/* Navigation */}
      <nav className="scrollbar-thin flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {sections.map((section) => (
          <div key={section.label} className="space-y-1">
            {!isCollapsed ? (
              <p className="text-muted-foreground/80 px-2.5 pb-1 text-[11px] font-semibold tracking-wider uppercase">
                {section.label}
              </p>
            ) : (
              <div className="bg-sidebar-border mx-auto my-3 h-px w-6" />
            )}

            {section.items.map((item) => {
              const active = isNavItemActive(item, pathname);
              const Icon = item.icon;

              return (
                <Tooltip
                  key={item.href}
                  content={isCollapsed ? item.label : null}
                  side="right"
                >
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                      "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
                      active
                        ? "text-sidebar-accent-foreground"
                        : "text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/60",
                      isCollapsed && "justify-center px-0",
                    )}
                  >
                    {/* Shared layout id makes the active pill glide between
                        items instead of blinking on and off. */}
                    {active ? (
                      <motion.span
                        layoutId="sidebar-active"
                        className="bg-sidebar-accent absolute inset-0 -z-10 rounded-lg"
                        transition={{
                          type: "spring",
                          stiffness: 380,
                          damping: 32,
                        }}
                      />
                    ) : null}

                    <Icon
                      className={cn(
                        "size-4.5 shrink-0 transition-colors",
                        active
                          ? "text-primary"
                          : "text-muted-foreground group-hover:text-foreground",
                      )}
                      strokeWidth={active ? 2.2 : 1.9}
                    />
                    {!isCollapsed ? (
                      <span className="truncate">{item.label}</span>
                    ) : null}
                  </Link>
                </Tooltip>
              );
            })}
          </div>
        ))}
      </nav>

      {collapsible ? (
        <div className="border-sidebar-border shrink-0 border-t p-3">
          <Button
            variant="ghost"
            size={isCollapsed ? "icon" : "sm"}
            onClick={toggle}
            className={cn(
              "text-muted-foreground w-full",
              !isCollapsed && "justify-start",
            )}
            aria-label={isCollapsed ? "Expandir menu" : "Recolher menu"}
          >
            {isCollapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
            {!isCollapsed ? "Recolher" : null}
          </Button>
        </div>
      ) : null}
    </aside>
  );
}
