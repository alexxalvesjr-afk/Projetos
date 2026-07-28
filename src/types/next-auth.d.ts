import type { Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";

/**
 * Augments the session/JWT with the tenant and role claims that every
 * authorisation decision in the app depends on.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      organizationId: string;
      organizationName: string;
      organizationSlug: string;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    organizationId: string;
    organizationName: string;
    organizationSlug: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    organizationId: string;
    organizationName: string;
    organizationSlug: string;
  }
}

export {};
