import { cache } from "react";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";

import { auth } from "@/lib/auth";
import { ForbiddenError, UnauthenticatedError } from "@/lib/errors";
import { hasPermission, type Permission } from "@/lib/rbac";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: Role;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
};

/**
 * `cache()` dedupes the session lookup across a single render pass, so a layout
 * and half a dozen server components can each ask for the user without paying
 * for repeated JWT verification.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth();
  if (!session?.user?.id) return null;

  return {
    id: session.user.id,
    name: session.user.name ?? "",
    email: session.user.email ?? "",
    image: session.user.image ?? null,
    role: session.user.role,
    organizationId: session.user.organizationId,
    organizationName: session.user.organizationName,
    organizationSlug: session.user.organizationSlug,
  };
});

/**
 * For server components: bounces to the sign-in screen when unauthenticated.
 * Server actions should use `requireUser` instead so the caller receives a
 * structured error rather than a redirect.
 */
export async function requireAuth(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** For server actions — throws instead of redirecting. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthenticatedError();
  return user;
}

/** Server-component guard that also enforces a capability. */
export async function requirePermission(
  permission: Permission,
): Promise<SessionUser> {
  const user = await requireAuth();
  if (!hasPermission(user.role, permission)) {
    redirect("/dashboard?denied=1");
  }
  return user;
}

export async function assertPermission(
  user: SessionUser,
  permission: Permission,
): Promise<void> {
  if (!hasPermission(user.role, permission)) {
    throw new ForbiddenError();
  }
}

/** Convenience predicate for conditional UI. */
export function can(user: SessionUser | null, permission: Permission): boolean {
  return Boolean(user && hasPermission(user.role, permission));
}
