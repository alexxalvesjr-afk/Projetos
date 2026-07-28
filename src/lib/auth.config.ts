import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe half of the Auth.js configuration.
 *
 * Middleware runs on the edge runtime, where bcrypt and the Prisma client are
 * unavailable. Everything here is pure data/object manipulation so the same
 * config can be reused by `middleware.ts` to decode the JWT and gate routes,
 * while `auth.ts` layers the Credentials provider on top for the Node runtime.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },

  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh the token at most once a day
  },

  trustHost: true,

  callbacks: {
    /**
     * Copies tenant + role claims onto the token at sign-in. `trigger:
     * "update"` lets a profile edit refresh the name without re-authenticating.
     */
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
        token.organizationId = user.organizationId;
        token.organizationName = user.organizationName;
        token.organizationSlug = user.organizationSlug;
      }

      if (trigger === "update" && session?.user?.name) {
        token.name = session.user.name as string;
      }

      return token;
    },

    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.organizationId = token.organizationId;
        session.user.organizationName = token.organizationName;
        session.user.organizationSlug = token.organizationSlug;
      }
      return session;
    },

    /**
     * Route gate used by middleware. Returning `false` for a protected route
     * makes Auth.js redirect to the sign-in page with a callback URL; returning
     * an explicit `Response` lets us bounce authenticated users away from the
     * auth screens without bouncing them straight back again.
     */
    authorized({ auth, request }) {
      const isLoggedIn = Boolean(auth?.user);
      const { pathname } = request.nextUrl;

      const isAuthPage =
        pathname.startsWith("/login") || pathname.startsWith("/register");

      if (isAuthPage) {
        if (isLoggedIn) {
          return Response.redirect(new URL("/dashboard", request.nextUrl));
        }
        return true;
      }

      return isLoggedIn;
    },
  },

  providers: [],
} satisfies NextAuthConfig;
