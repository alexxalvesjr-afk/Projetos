import type { Role } from "@prisma/client";

/**
 * Permission catalogue.
 *
 * Permissions are `resource:action` strings rather than booleans on the user so
 * that roles stay declarative and a new capability is one entry, not a
 * migration. `ROLE_PERMISSIONS` is the single source of truth — the UI and the
 * server actions both read from it, so a hidden button and a rejected mutation
 * can never disagree.
 */
export const PERMISSIONS = [
  "dashboard:view",
  "dashboard:view_financials",

  "vehicle:view",
  "vehicle:create",
  "vehicle:update",
  "vehicle:delete",
  "vehicle:view_cost",

  "lead:view",
  "lead:view_all",
  "lead:create",
  "lead:update",
  "lead:delete",
  "lead:assign",

  "appointment:view",
  "appointment:create",
  "appointment:update",
  "appointment:delete",

  "sale:view",
  "sale:create",
  "sale:update",
  "sale:delete",

  "goal:view",
  "goal:manage",

  "report:view",
  "report:export",

  "campaign:view",
  "campaign:manage",

  "user:view",
  "user:create",
  "user:update",
  "user:delete",

  "settings:view",
  "settings:update",

  "cms:view",
  "cms:update",

  "audit:view",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const SALESPERSON_PERMISSIONS: Permission[] = [
  "dashboard:view",
  "vehicle:view",
  "lead:view",
  "lead:create",
  "lead:update",
  "appointment:view",
  "appointment:create",
  "appointment:update",
  "appointment:delete",
  "sale:view",
  "sale:create",
  "goal:view",
  "report:view",
];

const MANAGER_PERMISSIONS: Permission[] = [
  ...SALESPERSON_PERMISSIONS,
  "dashboard:view_financials",
  "vehicle:create",
  "vehicle:update",
  "vehicle:delete",
  "vehicle:view_cost",
  "lead:view_all",
  "lead:delete",
  "lead:assign",
  "sale:update",
  "goal:manage",
  "report:export",
  "campaign:view",
  "campaign:manage",
  "user:view",
  "cms:view",
  "cms:update",
  "settings:view",
];

const ADMIN_PERMISSIONS: Permission[] = [
  ...MANAGER_PERMISSIONS,
  "sale:delete",
  "user:create",
  "user:update",
  "user:delete",
  "settings:update",
  "audit:view",
];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  OWNER: PERMISSIONS,
  ADMIN: ADMIN_PERMISSIONS,
  MANAGER: MANAGER_PERMISSIONS,
  SALESPERSON: SALESPERSON_PERMISSIONS,
  VIEWER: [
    "dashboard:view",
    "vehicle:view",
    "lead:view",
    "appointment:view",
    "sale:view",
    "goal:view",
    "report:view",
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function hasAnyPermission(
  role: Role,
  permissions: Permission[],
): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

export function hasAllPermissions(
  role: Role,
  permissions: Permission[],
): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

/**
 * Salespeople only see their own pipeline. Anyone with `lead:view_all` sees the
 * whole floor. Returns the `assignedToId` filter to merge into a query, or
 * `undefined` when no narrowing applies.
 */
export function leadVisibilityFilter(
  role: Role,
  userId: string,
): { assignedToId: string } | undefined {
  return hasPermission(role, "lead:view_all")
    ? undefined
    : { assignedToId: userId };
}

/** Ordered for pickers — most privileged first. */
export const ROLE_ORDER: Role[] = [
  "OWNER",
  "ADMIN",
  "MANAGER",
  "SALESPERSON",
  "VIEWER",
];

export const ROLE_LABELS: Record<Role, string> = {
  OWNER: "Proprietário",
  ADMIN: "Administrador",
  MANAGER: "Gerente",
  SALESPERSON: "Vendedor",
  VIEWER: "Visualizador",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  OWNER: "Acesso irrestrito, incluindo faturamento e exclusão da conta.",
  ADMIN: "Gerencia usuários, configurações e todos os módulos operacionais.",
  MANAGER: "Comanda estoque, pipeline, metas e marketing da loja.",
  SALESPERSON: "Trabalha a própria carteira de leads e registra vendas.",
  VIEWER: "Somente leitura, ideal para sócios e contabilidade.",
};

/**
 * A user may never grant a role above their own — this blocks privilege
 * escalation through the user-management screen.
 */
export function canAssignRole(actor: Role, target: Role): boolean {
  return ROLE_ORDER.indexOf(actor) < ROLE_ORDER.indexOf(target);
}
