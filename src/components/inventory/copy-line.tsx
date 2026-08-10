"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

/**
 * Um trecho para copiar sem risco de errar.
 *
 * Selecionar código com o dedo, no celular, quase sempre traz um caractere a
 * mais ou a menos — e uma tag de script com um caractere sobrando não carrega,
 * sem dizer por quê. O botão elimina a etapa manual.
 */
export function CopyLine({ value }: { value: string }) {
  const [copied, setCopied] = React.useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success("Copiado.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Navegador sem permissão de área de transferência (http, iOS antigo):
      // seleciona o texto para que copiar continue possível à mão.
      toast.error("Não consegui copiar. Selecione o texto e copie.");
    }
  }

  return (
    <div className="bg-muted flex items-start gap-2 rounded-lg p-3">
      <code className="min-w-0 flex-1 font-mono text-xs break-all select-all">
        {value}
      </code>
      <button
        type="button"
        onClick={copy}
        aria-label="Copiar"
        className="hover:bg-background shrink-0 rounded-md p-1.5 transition-colors"
      >
        {copied ? (
          <Check className="text-success size-4" />
        ) : (
          <Copy className="size-4" />
        )}
      </button>
    </div>
  );
}
