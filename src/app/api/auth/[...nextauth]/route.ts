import { handlers } from "@/lib/auth";

/**
 * Auth.js HTTP endpoints (`/api/auth/*`).
 *
 * Server-side `signIn`/`auth()` work without this, which is why its absence is
 * invisible to a type check and a build — but the client helpers do not:
 * `signOut()` from the user menu, `useSession().update()` after a profile edit,
 * and CSRF token issuance all POST here.
 */
export const { GET, POST } = handlers;
