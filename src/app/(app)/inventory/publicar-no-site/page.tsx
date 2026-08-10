import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { requirePermission } from "@/lib/session";
import { dealerSiteUrl } from "@/lib/dealer-site";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CopyLine } from "@/components/inventory/copy-line";

export const metadata: Metadata = { title: "Publicar o estoque no site" };

/**
 * As instruções ficam dentro do CRM, e não num arquivo de documentação, porque
 * é aqui que a dúvida aparece — no momento em que o lojista cadastra um carro
 * e ele não surge no site. Um link para um repositório não resolveria isso.
 */
export default async function PublicarNoSitePage() {
  await requirePermission("vehicle:view");

  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ).replace(/\/+$/, "");
  const linha = `<script src="${appUrl}/estoque-mypremium.js" defer></script>`;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="text-muted-foreground -ml-2 mb-2"
        >
          <Link href="/inventory">
            <ArrowLeft />
            Voltar ao estoque
          </Link>
        </Button>

        <PageHeader
          title="Publicar o estoque no site"
          description="Uma linha, uma vez. Depois disso, todo carro cadastrado aqui aparece no site sozinho."
        />
      </div>

      <Card>
        <CardContent className="space-y-5 p-6">
          <div className="space-y-2">
            <h2 className="text-sm font-semibold">1. Copie esta linha</h2>
            <CopyLine value={linha} />
          </div>

          <div className="space-y-2">
            <h2 className="text-sm font-semibold">
              2. Cole no fim do HTML do site
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Ela vai logo antes de <code className="text-xs">&lt;/body&gt;</code>,
              na última linha da página. Se você não edita os arquivos do site,
              peça a quem o construiu — é uma linha, no fim do arquivo.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-sm font-semibold">
              Se o site está na Netlify e você não tem os arquivos
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              No painel da Netlify: <strong>Site configuration</strong> →{" "}
              <strong>Build &amp; deploy</strong> →{" "}
              <strong>Post processing</strong> →{" "}
              <strong>Snippet injection</strong> → <strong>Add snippet</strong>.
              Escolha <em>Insert before &lt;/body&gt;</em> e cole a linha.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-6">
          <h2 className="text-sm font-semibold">Onde os carros vão aparecer</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Os carros entram embaixo do título{" "}
            <strong>“Nossos carros”</strong>, “Estoque” ou “Veículos” do seu
            site. Não existindo nenhum desses títulos, nada é desenhado — o
            script nunca cria seção nova nem mexe no resto da página.
          </p>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Para escolher o ponto exato, coloque no HTML, onde os carros devem
            entrar:
          </p>
          <CopyLine value={'<div id="estoque-mypremium"></div>'} />
          <p className="text-muted-foreground text-sm leading-relaxed">
            Nesse caso o que estiver dentro dessa div é substituído pelo estoque
            real — é assim que os carros de exemplo do site saem de cena.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-6">
          <h2 className="text-sm font-semibold">Conferir se funcionou</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Volte a esta tela depois de abrir{" "}
            <a
              href={dealerSiteUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2"
            >
              o site
            </a>{" "}
            no navegador. O aviso amarelo no estoque some e vira “Seu site leu o
            estoque agora” — é o CRM registrando que o site realmente pediu os
            carros.
          </p>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Para ver os dados que o site recebe:
          </p>
          <CopyLine
            value={`${appUrl}/api/publico/veiculos?loja=mypremium-motors`}
          />
        </CardContent>
      </Card>
    </div>
  );
}
