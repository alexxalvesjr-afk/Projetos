import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, UserRound } from "lucide-react";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { hasPermission } from "@/lib/rbac";
import { formatPhone } from "@/lib/format";
import { dealerSiteUrl } from "@/lib/dealer-site";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UserDialog } from "@/components/users/user-dialog";

export const metadata: Metadata = {
  title: "Configurações",
  description: "Dados da empresa e contas de acesso.",
};

/** Uma linha do resumo. Campo vazio vira "—", nunca um espaço em branco. */
function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b py-2.5 last:border-b-0">
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className="truncate text-right text-sm font-medium">
        {value?.trim() ? value : "—"}
      </dd>
    </div>
  );
}

/**
 * Configurações da loja — somente leitura.
 *
 * Os dados da empresa são acertados na contratação e não mudam pelo painel,
 * então a tela mostra o que está valendo em vez de oferecer um formulário que
 * o servidor recusaria de qualquer forma. O que sobra de acionável aqui é o
 * que o dono realmente precisa: criar os acessos da equipe.
 */
export default async function SettingsPage() {
  const user = await requirePermission("settings:view");

  const organization = await db.organization.findUnique({
    where: { id: user.organizationId },
  });
  if (!organization) notFound();

  const canInvite = hasPermission(user.role, "user:create");
  const endereco = [
    organization.addressLine,
    organization.city,
    organization.state,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-6">
      <PageHeader title="Configurações">
        <Button asChild variant="outline">
          <Link href="/settings/profile">
            <UserRound />
            Meu perfil
          </Link>
        </Button>
      </PageHeader>

      {/* Contas de acesso vem primeiro: é a única ação da tela. */}
      <Card>
        <CardHeader>
          <CardTitle>Contas de acesso</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-muted-foreground text-sm">
            Crie o acesso de gerente, balcão e vendedores.
          </p>

          <div className="flex flex-wrap items-center gap-2">
            {canInvite ? <UserDialog actorRole={user.role} /> : null}
            <Button asChild variant="outline">
              <Link href="/users">
                Ver equipe
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dados da loja</CardTitle>
        </CardHeader>
        <CardContent>
          <dl>
            <Row label="Nome" value={organization.name} />
            <Row label="Razão social" value={organization.legalName} />
            <Row label="CNPJ" value={organization.taxId} />
            <Row label="E-mail" value={organization.email} />
            <Row label="Telefone" value={formatPhone(organization.phone)} />
            <Row label="WhatsApp" value={formatPhone(organization.whatsapp)} />
            <Row label="Endereço" value={endereco} />
            <Row label="Site" value={dealerSiteUrl().replace(/^https?:\/\//, "")} />
          </dl>

          <p className="text-muted-foreground mt-4 text-sm">
            Para alterar qualquer um destes dados, fale com quem administra o
            sistema.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
