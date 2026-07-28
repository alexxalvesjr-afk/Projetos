import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/rbac";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UserAvatar } from "@/components/ui/avatar";
import { ProfileForm } from "@/components/settings/profile-form";

export const metadata: Metadata = { title: "Meu perfil" };

export default async function ProfilePage() {
  const session = await requireAuth();

  const user = await db.user.findUniqueOrThrow({
    where: { id: session.id },
    select: {
      name: true,
      email: true,
      image: true,
      phone: true,
      jobTitle: true,
      role: true,
      createdAt: true,
      lastLoginAt: true,
      commissionRate: true,
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="text-muted-foreground -ml-2 mb-2"
        >
          <Link href="/settings">
            <ArrowLeft />
            Configurações
          </Link>
        </Button>
        <PageHeader
          title="Meu perfil"
          description="Seus dados pessoais e nível de acesso."
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ProfileForm
            defaults={{
              name: user.name,
              phone: user.phone ?? "",
              jobTitle: user.jobTitle ?? "",
            }}
          />
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Conta</CardTitle>
            <CardDescription>Informações somente leitura.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <UserAvatar
                name={user.name}
                image={user.image}
                className="size-12"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{user.name}</p>
                <p className="text-muted-foreground truncate text-xs">
                  {user.email}
                </p>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Função</span>
                <Badge>{ROLE_LABELS[user.role]}</Badge>
              </div>
              <p className="text-muted-foreground text-xs leading-relaxed">
                {ROLE_DESCRIPTIONS[user.role]}
              </p>
            </div>

            <div className="space-y-2 border-t pt-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Comissão</span>
                <span className="tabular font-medium">
                  {user.commissionRate > 0 ? `${user.commissionRate}%` : "—"}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Membro desde</span>
                <span className="font-medium">{formatDate(user.createdAt)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Último acesso</span>
                <span className="font-medium">
                  {formatDate(user.lastLoginAt)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
