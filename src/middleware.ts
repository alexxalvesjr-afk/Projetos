import NextAuth from "next-auth";

import { authConfig } from "@/lib/auth.config";

/**
 * Edge middleware built from the auth-only half of the config, so no Node-only
 * dependency (bcrypt, Prisma) is pulled into the edge bundle.
 */
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  /**
   * Guard the authenticated application and the auth screens only. The public
   * storefront, API routes, static assets and metadata files are deliberately
   * excluded so that marketing pages stay fully cacheable and crawlable.
   */
  matcher: [
    "/dashboard/:path*",
    "/inventory/:path*",
    "/crm/:path*",
    "/agenda/:path*",
    "/goals/:path*",
    "/reports/:path*",
    "/marketing/:path*",
    "/users/:path*",
    "/settings/:path*",
    "/login",
    "/register",
  ],
};
