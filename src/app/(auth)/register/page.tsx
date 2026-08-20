import type { Metadata } from "next";
import Link from "next/link";

import { BRAND } from "@/lib/brand";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = {
  title: "Criar conta",
  description: `Crie a conta da sua revenda no ${BRAND.product} em menos de um minuto.`,
};

export default function RegisterPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-[-0.03em]">
          Comece agora
        </h1>
        <p className="text-muted-foreground text-sm">
          Crie a conta da sua loja. Leva menos de um minuto e não pedimos cartão.
        </p>
      </div>

      <RegisterForm />

      <p className="text-muted-foreground text-center text-sm">
        Já tem conta?{" "}
        <Link
          href="/login"
          className="text-foreground font-medium underline-offset-4 hover:underline"
        >
          Entrar
        </Link>
      </p>
    </div>
  );
}
