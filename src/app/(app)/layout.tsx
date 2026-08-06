import { db } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

/**
 * Authenticated application shell.
 *
 * The sidebar is rendered once here rather than per page, so navigating
 * between modules only swaps the content region — the chrome never remounts
 * and the active-item animation stays continuous.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();

  const notifications = await db.notification.findMany({
    where: { userId: user.id },
    orderBy: [{ read: "asc" }, { createdAt: "desc" }],
    take: 12,
    select: {
      id: true,
      type: true,
      title: true,
      body: true,
      link: true,
      read: true,
      createdAt: true,
    },
  });

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar
        role={user.role}
        organizationName={user.organizationName}
        className="hidden lg:flex"
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          user={{
            name: user.name,
            email: user.email,
            image: user.image,
            role: user.role,
          }}
          organizationName={user.organizationName}
          notifications={notifications}
        />

        <main className="scrollbar-thin flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
