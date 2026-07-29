import {
  BarChart3,
  CalendarDays,
  Car,
  Globe,
  KanbanSquare,
  LayoutDashboard,
  Megaphone,
  Settings,
  Target,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { Permission } from "@/lib/rbac";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Item is hidden unless the signed-in role holds this permission. */
  permission?: Permission;
  /** Matches nested routes, e.g. `/inventory/new`. */
  exact?: boolean;
};

export type NavSection = {
  label: string;
  items: NavItem[];
};

/**
 * Single source of truth for the sidebar and the command palette. Both read
 * this list and filter it through the same permission check, so a hidden nav
 * item is never reachable from the palette either.
 */
export const NAVIGATION: NavSection[] = [
  {
    label: "Operação",
    items: [
      {
        href: "/dashboard",
        label: "Painel",
        icon: LayoutDashboard,
        permission: "dashboard:view",
        exact: true,
      },
      {
        href: "/inventory",
        label: "Estoque",
        icon: Car,
        permission: "vehicle:view",
      },
      {
        href: "/crm",
        label: "Clientes",
        icon: KanbanSquare,
        permission: "lead:view",
      },
      {
        href: "/agenda",
        label: "Agenda",
        icon: CalendarDays,
        permission: "appointment:view",
      },
    ],
  },
  {
    label: "Performance",
    items: [
      {
        href: "/goals",
        label: "Metas",
        icon: Target,
        permission: "goal:view",
      },
      {
        href: "/reports",
        label: "Relatórios",
        icon: BarChart3,
        permission: "report:view",
      },
      {
        href: "/marketing",
        label: "Marketing",
        icon: Megaphone,
        permission: "campaign:view",
      },
    ],
  },
  {
    label: "Configuração",
    items: [
      {
        href: "/cms",
        label: "Site",
        icon: Globe,
        permission: "cms:view",
      },
      {
        href: "/users",
        label: "Equipe",
        icon: Users,
        permission: "user:view",
      },
      {
        href: "/settings",
        label: "Ajustes",
        icon: Settings,
        permission: "settings:view",
      },
    ],
  },
];

/** True when `pathname` should light up `item` in the sidebar. */
export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
