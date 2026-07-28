import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Entrar",
  description: "Acesse o painel da sua revenda no Revend CRM.",
};

/** Matches the form's geometry so nothing shifts when it hydrates. */
function LoginFormFallback() {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-9.5 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-14" />
        <Skeleton className="h-9.5 w-full" />
      </div>
      <Skeleton className="h-11 w-full" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-[-0.03em]">
          Bem-vindo de volta
        </h1>
        <p className="text-muted-foreground text-sm">
          Entre para acompanhar estoque, funil e metas da sua loja.
        </p>
      </div>

      {/* The form reads `callbackUrl` from the query string, which opts it out
          of prerendering unless it sits behind a boundary. */}
      <Suspense fallback={<LoginFormFallback />}>
        <LoginForm />
      </Suspense>

      <p className="text-muted-foreground text-center text-sm">
        Ainda não tem conta?{" "}
        <Link
          href="/register"
          className="text-foreground font-medium underline-offset-4 hover:underline"
        >
          Criar conta grátis
        </Link>
      </p>
    </div>
  );
}
