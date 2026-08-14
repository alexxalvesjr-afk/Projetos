import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { UserRound } from "lucide-react";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { hasPermission } from "@/lib/rbac";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { OrganizationForm } from "@/components/settings/organization-form";
import { dealerSiteUrl } from "@/lib/dealer-site";

export const metadata: Metadata = {
  title: "Configurações",
  description: "Dados da empresa, marca e integrações.",
};

export default async function SettingsPage() {
  const user = await requirePermission("settings:view");

  const organization = await db.organization.findUnique({
    where: { id: user.organizationId },
  });
  if (!organization) notFound();

  const canEdit = hasPermission(user.role, "settings:update");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações"
      >
        <Button asChild variant="outline">
          <Link href="/settings/profile">
            <UserRound />
            Meu perfil
          </Link>
        </Button>
      </PageHeader>

      {!canEdit ? (
        <Alert variant="info">
          <AlertDescription>
            Você tem acesso de leitura a estas configurações. Peça a um
            administrador para alterá-las.
          </AlertDescription>
        </Alert>
      ) : null}

      {/* A read-only role sees the same layout with inputs disabled by the
          server action, which will reject the mutation anyway. */}
      <fieldset disabled={!canEdit} className="contents">
        <OrganizationForm
          storeUrl={dealerSiteUrl()}
          defaults={{
            name: organization.name,
            legalName: organization.legalName ?? "",
            taxId: organization.taxId ?? "",
            email: organization.email ?? "",
            phone: organization.phone ?? "",
            whatsapp: organization.whatsapp ?? "",
            addressLine: organization.addressLine ?? "",
            city: organization.city ?? "",
            state: organization.state ?? "",
            postalCode: organization.postalCode ?? "",
            logoUrl: organization.logoUrl ?? "",
            brandColor: organization.brandColor,
            instagramUrl: organization.instagramUrl ?? "",
            facebookUrl: organization.facebookUrl ?? "",
            youtubeUrl: organization.youtubeUrl ?? "",
            tiktokUrl: organization.tiktokUrl ?? "",
          }}
        />
      </fieldset>
    </div>
  );
}
