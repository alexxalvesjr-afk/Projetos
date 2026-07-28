"use client";

import * as React from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { ChevronsUpDown, LogOut, Settings, UserRound } from "lucide-react";
import type { Role } from "@prisma/client";

import { ROLE_LABELS } from "@/lib/rbac";
import { UserAvatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu({
  name,
  email,
  image,
  role,
}: {
  name: string;
  email: string;
  image: string | null;
  role: Role;
}) {
  const [signingOut, setSigningOut] = React.useState(false);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="hover:bg-accent flex items-center gap-2 rounded-lg p-1 pr-2 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <UserAvatar name={name} image={image} className="size-8" />
          <span className="hidden min-w-0 text-left sm:block">
            <span className="block max-w-32 truncate text-sm font-medium leading-tight">
              {name}
            </span>
            <span className="text-muted-foreground block text-[11px] leading-tight">
              {ROLE_LABELS[role]}
            </span>
          </span>
          <ChevronsUpDown className="text-muted-foreground hidden size-3.5 shrink-0 sm:block" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="normal-case">
          <span className="flex items-center gap-2.5 py-1">
            <UserAvatar name={name} image={image} className="size-9" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium tracking-normal">
                {name}
              </span>
              <span className="text-muted-foreground block truncate text-xs font-normal tracking-normal lowercase">
                {email}
              </span>
            </span>
          </span>
        </DropdownMenuLabel>

        <div className="px-2.5 pb-2">
          <Badge variant="secondary" size="sm">
            {ROLE_LABELS[role]}
          </Badge>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/settings/profile">
            <UserRound />
            Meu perfil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings />
            Configurações
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          variant="destructive"
          disabled={signingOut}
          onSelect={(event) => {
            event.preventDefault();
            setSigningOut(true);
            void signOut({ callbackUrl: "/login" });
          }}
        >
          <LogOut />
          {signingOut ? "Saindo…" : "Sair"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
