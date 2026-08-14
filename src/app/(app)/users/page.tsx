import type { Metadata } from "next";
import { Suspense } from "react";
import { History, ShieldCheck } from "lucide-react";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import {
  hasPermission,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  ROLE_ORDER,
  ROLE_PERMISSIONS,
} from "@/lib/rbac";
import { formatDate, formatRelative } from "@/lib/format";
import { describeAuditAction } from "@/lib/audit";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/ui/avatar";
import { UserDialog } from "@/components/users/user-dialog";
import { UserRowActions } from "@/components/users/user-row-actions";

export const metadata: Metadata = {
  title: "Equipe",
  description: "Usuários, permissões e registro de atividades.",
};

export const dynamic = "force-dynamic";

const ROLE_VARIANTS: Record<string, "default" | "info" | "warning" | "secondary" | "outline"> = {
  OWNER: "default",
  ADMIN: "info",
  MANAGER: "warning",
  SALESPERSON: "secondary",
  VIEWER: "outline",
};

async function Team() {
  const user = await requirePermission("user:view");
  const canManage = hasPermission(user.role, "user:update");
  const canAudit = hasPermission(user.role, "audit:view");

  const [members, auditLogs] = await Promise.all([
    db.user.findMany({
      where: { organizationId: user.organizationId },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      include: {
        _count: { select: { assignedLeads: true, sales: true } },
      },
    }),
    canAudit
      ? db.auditLog.findMany({
          where: { organizationId: user.organizationId },
          orderBy: { createdAt: "desc" },
          take: 60,
          include: { user: { select: { id: true, name: true, image: true } } },
        })
      : Promise.resolve([]),
  ]);

  return (
    <Tabs defaultValue="members" className="space-y-4">
      <TabsList>
        <TabsTrigger value="members">Usuários</TabsTrigger>
        <TabsTrigger value="permissions">Permissões</TabsTrigger>
        {canAudit ? <TabsTrigger value="activity">Atividades</TabsTrigger> : null}
      </TabsList>

      {/* Members ---------------------------------------------------------- */}
      <TabsContent value="members">
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Função</TableHead>
                <TableHead className="text-right">Leads</TableHead>
                <TableHead className="text-right">Vendas</TableHead>
                <TableHead className="text-right">Comissão</TableHead>
                <TableHead>Último acesso</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>

            <TableBody>
              {members.map((member) => (
                <TableRow
                  key={member.id}
                  className={member.isActive ? undefined : "opacity-55"}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        name={member.name}
                        image={member.image}
                        className="size-9 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 text-sm font-medium">
                          <span className="truncate">{member.name}</span>
                          {!member.isActive ? (
                            <Badge variant="outline" size="sm">
                              Inativo
                            </Badge>
                          ) : null}
                        </p>
                        <p className="text-muted-foreground truncate text-xs">
                          {member.jobTitle ?? member.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge variant={ROLE_VARIANTS[member.role]} size="sm">
                      {ROLE_LABELS[member.role]}
                    </Badge>
                  </TableCell>

                  <TableCell className="tabular text-right text-sm">
                    {member._count.assignedLeads}
                  </TableCell>
                  <TableCell className="tabular text-right text-sm">
                    {member._count.sales}
                  </TableCell>
                  <TableCell className="tabular text-right text-sm">
                    {member.commissionRate > 0
                      ? `${member.commissionRate}%`
                      : "—"}
                  </TableCell>

                  <TableCell className="text-muted-foreground text-sm">
                    {member.lastLoginAt
                      ? formatRelative(member.lastLoginAt)
                      : "Nunca"}
                  </TableCell>

                  <TableCell>
                    {canManage ? (
                      <UserRowActions
                        actorRole={user.role}
                        member={{
                          id: member.id,
                          name: member.name,
                          role: member.role,
                          jobTitle: member.jobTitle,
                          commissionRate: member.commissionRate,
                          isActive: member.isActive,
                        }}
                      />
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </TabsContent>

      {/* Permission matrix ------------------------------------------------ */}
      <TabsContent value="permissions">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {ROLE_ORDER.map((role) => (
            <Card key={role}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="text-primary size-4" />
                  {ROLE_LABELS[role]}
                </CardTitle>
                <CardDescription>{ROLE_DESCRIPTIONS[role]}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-2 text-xs font-medium">
                  {ROLE_PERMISSIONS[role].length} permissões
                </p>
                <div className="flex flex-wrap gap-1">
                  {ROLE_PERMISSIONS[role].slice(0, 14).map((permission) => (
                    <Badge key={permission} variant="secondary" size="sm">
                      {permission}
                    </Badge>
                  ))}
                  {ROLE_PERMISSIONS[role].length > 14 ? (
                    <Badge variant="outline" size="sm">
                      +{ROLE_PERMISSIONS[role].length - 14}
                    </Badge>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </TabsContent>

      {/* Audit log -------------------------------------------------------- */}
      {canAudit ? (
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Registro de atividades</CardTitle>
            </CardHeader>
            <CardContent>
              {auditLogs.length === 0 ? (
                <EmptyState
                  compact
                  icon={History}
                  title="Nenhuma atividade registrada"
                  description="Ações da equipe aparecem aqui automaticamente."
                />
              ) : (
                <ul className="divide-y">
                  {auditLogs.map((log) => (
                    <li
                      key={log.id}
                      className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                    >
                      {log.user ? (
                        <UserAvatar
                          name={log.user.name}
                          image={log.user.image}
                          className="size-7 shrink-0"
                        />
                      ) : (
                        <span className="bg-muted size-7 shrink-0 rounded-full" />
                      )}

                      <p className="min-w-0 flex-1 text-sm">
                        <span className="font-medium">
                          {log.user?.name ?? "Sistema"}
                        </span>{" "}
                        <span className="text-muted-foreground">
                          {describeAuditAction(log.action)}
                        </span>{" "}
                        <span className="text-muted-foreground">
                          ({log.entity})
                        </span>
                      </p>

                      <span className="text-muted-foreground shrink-0 text-xs">
                        {log.ipAddress ? `${log.ipAddress} · ` : ""}
                        {formatDate(log.createdAt, "short")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      ) : null}
    </Tabs>
  );
}

export default async function UsersPage() {
  const user = await requirePermission("user:view");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Equipe"
      >
        {hasPermission(user.role, "user:create") ? (
          <UserDialog actorRole={user.role} />
        ) : null}
      </PageHeader>

      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <Team />
      </Suspense>
    </div>
  );
}
