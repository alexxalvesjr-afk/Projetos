import { redirect } from "next/navigation";

/**
 * The product has no marketing landing page — the front door is the sign-in
 * screen. Middleware already bounces an authenticated visitor from `/login`
 * to the dashboard, so this single hop serves both logged-in and logged-out
 * visitors without needing to read the session here.
 */
export default function RootPage() {
  redirect("/login");
}
