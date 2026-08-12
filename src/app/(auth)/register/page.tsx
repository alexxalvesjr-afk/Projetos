import type { Metadata } from "next";
import Link from "next/link";

import { RegisterForm } from "./register-form";

export const metadata: Metadata = {
  title: "Criar conta",
  description: "Ative a conta da revenda no Mypremium CRM com o código de acesso.",
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ codigo?: string }>;
}) {
  // Um link com ?codigo=... já vem preenchido — o dono do sistema salva um
  // atalho e só digita o resto a cada revenda nova, sem ter que lembrar nem
  // repassar o código toda vez.
  const { codigo } = await searchParams;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-[-0.03em]">
          Ativar conta da revenda
        </h1>
        <p className="text-muted-foreground text-sm">
          O cadastro não é público — é preciso o código de acesso fornecido
          por quem administra o sistema.
        </p>
      </div>

      <RegisterForm defaultCode={codigo ?? ""} />

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
