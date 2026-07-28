import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <Logo />

      <div className="bg-muted text-muted-foreground flex size-14 items-center justify-center rounded-2xl border">
        <Compass className="size-6" strokeWidth={1.6} />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-[-0.03em]">
          Página não encontrada
        </h1>
        <p className="text-muted-foreground max-w-sm text-sm leading-relaxed text-balance">
          O endereço não existe ou o conteúdo saiu do ar — veículos vendidos são
          removidos automaticamente do site.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        <Button asChild variant="outline">
          <Link href="/">
            <ArrowLeft />
            Início
          </Link>
        </Button>
        <Button asChild>
          <Link href="/dashboard">Ir para o painel</Link>
        </Button>
      </div>
    </div>
  );
}
