import Link from "next/link";
import { CircleCheck, TriangleAlert } from "lucide-react";

import { formatRelative } from "@/lib/format";
import { dealerSiteUrl } from "@/lib/dealer-site";

/**
 * Diz, na própria tela de estoque, se o site da revenda está lendo o CRM.
 *
 * O site é hospedado fora daqui e busca os carros pelo navegador de quem o
 * visita. Quando essa ligação cai — a linha do script sai do ar, o endereço
 * muda —, cadastrar um carro continua funcionando e ele simplesmente não
 * aparece lá; nada no CRM denunciaria o problema. Este aviso troca essa
 * investigação silenciosa por uma frase: a última vez que alguém leu o
 * estoque, e de onde.
 *
 * Some da tela assim que a leitura é recente, para não virar ruído fixo.
 */
export function SiteStatus({
  lastReadAt,
  lastOrigin,
}: {
  lastReadAt: Date | null;
  lastOrigin: string | null;
}) {
  // Uma visita nas últimas 24h é prova de que a ligação está de pé. Abaixo
  // disso não há alarme a dar: um site pouco visitado passa horas sem leitura.
  const recent =
    lastReadAt && Date.now() - lastReadAt.getTime() < 24 * 60 * 60 * 1000;

  if (recent) {
    return (
      <p className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-xs">
        <CircleCheck className="text-success size-3.5" />
        Seu site leu o estoque {formatRelative(lastReadAt)}
        {lastOrigin ? ` — ${lastOrigin.replace(/^https?:\/\//, "")}` : ""}.
      </p>
    );
  }

  return (
    <div className="border-warning/30 bg-warning/10 flex flex-wrap items-start gap-3 rounded-xl border p-4">
      <TriangleAlert className="text-warning mt-0.5 size-4.5 shrink-0" />

      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm font-medium">
          {lastReadAt
            ? `Seu site não busca o estoque desde ${formatRelative(lastReadAt)}.`
            : "Seu site ainda não buscou o estoque aqui."}
        </p>
        <p className="text-muted-foreground text-sm">
          Os carros cadastrados só aparecem em{" "}
          <a
            href={dealerSiteUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            {dealerSiteUrl().replace(/^https?:\/\//, "")}
          </a>{" "}
          depois que o site carrega uma linha do CRM. Enquanto ela não estiver
          lá, cadastrar um veículo não muda nada no site.
        </p>
      </div>

      <Link
        href="/inventory/publicar-no-site"
        className="bg-foreground text-background shrink-0 rounded-lg px-3 py-2 text-sm font-medium"
      >
        Ver como ligar
      </Link>
    </div>
  );
}
