"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, SquareArrowOutUpRight } from "lucide-react";
import type { Role } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip } from "@/components/ui/tooltip";
import { Sidebar } from "@/components/layout/sidebar";
import { CommandPalette } from "@/components/layout/command-palette";
import {
  NotificationsMenu,
  type NotificationItem,
} from "@/components/layout/notifications-menu";
import { UserMenu } from "@/components/layout/user-menu";
import { ThemeToggle } from "@/components/shared/theme-toggle";

/**
 * Absolute address of the dealership's public storefront.
 *
 * A relative href would resolve against whatever host the admin happens to be
 * on — a Vercel preview build, a branch deployment, localhost — and open a copy
 * of the site rather than the one customers see. NEXT_PUBLIC_APP_URL is the
 * canonical public origin, so the button lands on the real site from any of
 * them. Falls back to the relative path when the variable is unset, which is
 * the correct behaviour locally and never worse than what it replaced.
 */
function storefrontUrl(slug: string): string {
  const origin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "");
  return origin ? `${origin}/loja/${slug}` : `/loja/${slug}`;
}

export function Topbar({
  user,
  organizationName,
  organizationSlug,
  notifications,
}: {
  user: { name: string; email: string; image: string | null; role: Role };
  organizationName: string;
  organizationSlug: string;
  notifications: NotificationItem[];
}) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <header className="glass sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b px-4 sm:px-6">
      {/* Mobile navigation drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Abrir menu"
          >
            <Menu className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0" showClose={false}>
          <Sidebar
            role={user.role}
            organizationName={organizationName}
            collapsible={false}
            onNavigate={() => setMobileOpen(false)}
            className="w-full border-r-0"
          />
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 items-center gap-3">
        <CommandPalette role={user.role} />
      </div>

      <div className="flex items-center gap-1">
        <Tooltip content="Abrir site público">
          <Button variant="ghost" size="icon" asChild>
            <Link
              href={storefrontUrl(organizationSlug)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Abrir site público"
            >
              <SquareArrowOutUpRight className="size-4.5" />
            </Link>
          </Button>
        </Tooltip>

        <NotificationsMenu initialItems={notifications} />
        <ThemeToggle />

        <div className="bg-border mx-1.5 h-6 w-px" />

        <UserMenu
          name={user.name}
          email={user.email}
          image={user.image}
          role={user.role}
        />
      </div>
    </header>
  );
}
