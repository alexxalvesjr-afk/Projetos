"use client";

import * as React from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Root error boundary. The raw message is logged but never rendered — it can
 * carry stack traces or query fragments — so the user sees a stable digest they
 * can quote to support instead.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("[boundary] unhandled error", error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="bg-destructive/10 text-destructive flex size-14 items-center justify-center rounded-2xl">
        <TriangleAlert className="size-6" />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-[-0.03em]">
          Algo deu errado
        </h1>
        <p className="text-muted-foreground max-w-sm text-sm leading-relaxed text-balance">
          Encontramos um problema ao carregar esta página. Tente novamente — se
          persistir, nossa equipe já foi notificada.
        </p>
        {error.digest ? (
          <p className="text-muted-foreground font-mono text-xs">
            Código: {error.digest}
          </p>
        ) : null}
      </div>

      <Button onClick={reset}>
        <RotateCcw />
        Tentar novamente
      </Button>
    </div>
  );
}
