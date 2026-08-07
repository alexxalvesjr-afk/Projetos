"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, Link2, Plug, RefreshCw, Unplug } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { formatRelative } from "@/lib/format";
import type { AdConnectionView } from "@/server/services/ads.service";
import {
  chooseAdAccount,
  disconnectAdAccount,
  syncAdAccount,
} from "@/server/actions/integrations.actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GoogleIcon, MetaIcon } from "@/components/marketing/provider-icons";

/**
 * Os botões de conectar Meta Ads e Google Ads.
 *
 * Conectar não abre um formulário de senha: manda o lojista autorizar na
 * própria plataforma e volta com um token de leitura. O CRM nunca vê a senha
 * do Facebook nem a do Google, e o acesso pode ser revogado de lá a qualquer
 * momento.
 */
export function AdConnections({
  connections,
  canManage,
}: {
  connections: AdConnectionView[];
  canManage: boolean;
}) {
  const [helpFor, setHelpFor] = React.useState<AdConnectionView | null>(null);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Contas de anúncio</CardTitle>
          <CardDescription>
            Conecte suas contas para ver investimento, custo por lead e retorno
            das campanhas aqui dentro.
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-3 sm:grid-cols-2">
          {connections.map((connection) => (
            <ConnectionRow
              key={connection.provider}
              connection={connection}
              canManage={canManage}
              onNeedsSetup={() => setHelpFor(connection)}
            />
          ))}
        </CardContent>
      </Card>

      <SetupDialog
        connection={helpFor}
        onOpenChange={(open) => !open && setHelpFor(null)}
      />
    </>
  );
}

function ConnectionRow({
  connection,
  canManage,
  onNeedsSetup,
}: {
  connection: AdConnectionView;
  canManage: boolean;
  onNeedsSetup: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [account, setAccount] = React.useState(connection.accountId ?? "");

  const slug = connection.provider === "META_ADS" ? "meta" : "google";
  const Icon = connection.provider === "META_ADS" ? MetaIcon : GoogleIcon;

  function run(
    action: () => Promise<{ ok: boolean; error?: string }>,
    success: string,
  ) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error ?? "Não foi possível concluir.");
        return;
      }
      toast.success(success);
      router.refresh();
    });
  }

  // Conta escolhida é o único estado em que há números para mostrar; as demais
  // etapas ficam explícitas para que ninguém fique olhando uma tela vazia sem
  // saber o que falta.
  const ready = connection.connected && Boolean(connection.accountId);

  return (
    <div className="flex flex-col gap-3 rounded-xl border p-4">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg border",
            connection.provider === "META_ADS" ? "text-[#0866FF]" : "",
          )}
        >
          <Icon className="size-5" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{connection.label}</p>
          <p className="text-muted-foreground truncate text-xs">
            {ready
              ? connection.accountName
              : connection.description}
          </p>
        </div>

        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
            ready
              ? "bg-success/12 text-success"
              : "bg-muted text-muted-foreground",
          )}
        >
          {ready ? "Conectado" : "Não conectado"}
        </span>
      </div>

      {connection.lastSyncError ? (
        <p className="text-destructive flex items-start gap-1.5 text-xs">
          <CircleAlert className="mt-px size-3.5 shrink-0" />
          {connection.lastSyncError}
        </p>
      ) : null}

      {ready && connection.currency && connection.currency !== "BRL" ? (
        <p className="text-warning flex items-start gap-1.5 text-xs">
          <CircleAlert className="mt-px size-3.5 shrink-0" />
          Esta conta gasta em {connection.currency}. Os valores aparecem sem
          conversão para real.
        </p>
      ) : null}

      {/* Autorizou, mas o login dá acesso a mais de uma conta: sem escolher,
          o CRM não teria como saber de qual conta puxar os números. */}
      {connection.connected && !connection.accountId ? (
        <div className="flex flex-col gap-2">
          <Select value={account} onValueChange={setAccount}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Escolha a conta de anúncios" />
            </SelectTrigger>
            <SelectContent>
              {connection.availableAccounts.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            size="sm"
            disabled={!account || pending || !canManage}
            loading={pending}
            onClick={() =>
              run(
                () =>
                  chooseAdAccount({
                    provider: connection.provider,
                    accountId: account,
                  }),
                "Conta escolhida. Buscando as campanhas…",
              )
            }
          >
            Usar esta conta
          </Button>
        </div>
      ) : null}

      <div className="mt-auto flex flex-wrap items-center gap-2">
        {!connection.connected ? (
          connection.configured ? (
            <Button asChild size="sm" disabled={!canManage}>
              <a href={`/api/integracoes/${slug}/conectar`}>
                <Link2 />
                Conectar {connection.label}
              </a>
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={onNeedsSetup}>
              <Plug />
              Configurar {connection.label}
            </Button>
          )
        ) : (
          <>
            <Button
              size="sm"
              variant="outline"
              disabled={pending || !canManage || !connection.accountId}
              loading={pending}
              onClick={() =>
                run(
                  () => syncAdAccount({ provider: connection.provider }),
                  "Campanhas atualizadas.",
                )
              }
            >
              <RefreshCw />
              Sincronizar
            </Button>

            <Button
              size="sm"
              variant="ghost"
              disabled={pending || !canManage}
              onClick={() =>
                run(
                  () => disconnectAdAccount({ provider: connection.provider }),
                  "Conta desconectada.",
                )
              }
            >
              <Unplug />
              Desconectar
            </Button>
          </>
        )}

        {connection.lastSyncedAt ? (
          <span className="text-muted-foreground ml-auto text-xs">
            {formatRelative(connection.lastSyncedAt)}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/**
 * O que fazer quando faltam as chaves da plataforma.
 *
 * Meta e Google exigem que quem hospeda o sistema crie um aplicativo e guarde
 * duas chaves — não há como o CRM pular essa etapa. Explicar isso aqui, com os
 * nomes exatos das variáveis, é melhor do que um botão desabilitado sem
 * motivo aparente.
 */
function SetupDialog({
  connection,
  onOpenChange,
}: {
  connection: AdConnectionView | null;
  onOpenChange: (open: boolean) => void;
}) {
  if (!connection) return null;

  const meta = connection.provider === "META_ADS";

  const steps = meta
    ? [
        "Entre em developers.facebook.com e crie um app do tipo “Empresa”.",
        "Adicione o produto “Login do Facebook” e, em Casos de uso, ative a permissão ads_read.",
        "Em Configurações → Básico, copie o ID do aplicativo e a Chave secreta.",
        "Em Login do Facebook → Configurações, cole o endereço de retorno abaixo em “URIs de redirecionamento OAuth válidos”.",
      ]
    : [
        "Entre em console.cloud.google.com, crie um projeto e ative a Google Ads API.",
        "Em Credenciais, crie um “ID do cliente OAuth” do tipo Aplicativo da Web e copie o ID e a chave.",
        "Cole o endereço de retorno abaixo em “URIs de redirecionamento autorizados”.",
        "Peça o token de desenvolvedor em ads.google.com → Ferramentas → Central de API. A aprovação do Google leva alguns dias.",
      ];

  const vars = meta
    ? ["META_ADS_CLIENT_ID", "META_ADS_CLIENT_SECRET"]
    : [
        "GOOGLE_ADS_CLIENT_ID",
        "GOOGLE_ADS_CLIENT_SECRET",
        "GOOGLE_ADS_DEVELOPER_TOKEN",
      ];

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Conectar {connection.label}</DialogTitle>
          <DialogDescription>
            Esta parte é feita uma única vez, por quem administra o sistema. As
            duas plataformas exigem um aplicativo próprio — não existe caminho
            que dispense isso.
          </DialogDescription>
        </DialogHeader>

        <ol className="list-decimal space-y-2 pl-5 text-sm">
          {steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
          <li>
            Na Vercel, em Settings → Environment Variables, crie:
            <ul className="text-muted-foreground mt-1 space-y-0.5">
              {vars.map((name) => (
                <li key={name} className="font-mono text-xs">
                  {name}
                </li>
              ))}
            </ul>
          </li>
          <li>Faça um novo deploy e o botão “Conectar” aparece aqui.</li>
        </ol>

        <div className="bg-muted rounded-lg p-3">
          <p className="text-muted-foreground text-xs font-medium">
            Endereço de retorno
          </p>
          <p className="mt-1 font-mono text-xs break-all">
            {typeof window === "undefined"
              ? ""
              : `${window.location.origin}/api/integracoes/${meta ? "meta" : "google"}/callback`}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
