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

/**
 * `next-auth/jwt` is only a re-export of `@auth/core/jwt`, so augmenting that
 * specifier would declare a new module rather than merge into the real `JWT`
 * interface — leaving every claim typed as `unknown`. Augment the source.
 */
declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: Role;
    organizationId: string;
    organizationName: string;
    organizationSlug: string;
  }
}

export {};
