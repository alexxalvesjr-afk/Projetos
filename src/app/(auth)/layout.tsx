import Link from "next/link";
import { Quote, ShieldCheck, TrendingUp, Zap } from "lucide-react";

import { Logo } from "@/components/shared/logo";

const HIGHLIGHTS = [
  {
    icon: TrendingUp,
    title: "Margem por veículo, em tempo real",
    body: "Custo, preparação e comissão entram na conta automaticamente.",
  },
  {
    icon: Zap,
    title: "Estoque e site sempre sincronizados",
    body: "Vendeu, sai do ar. Cadastrou, entra no ar — sem trabalho duplo.",
  },
  {
    icon: ShieldCheck,
    title: "Permissões por função",
    body: "Cada vendedor vê a própria carteira. Você vê a loja inteira.",
  },
];

/**
 * Split auth layout: the form on the left, proof on the right. The right panel
 * collapses below `lg` so mobile users get a focused, single-column form.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh">
      <div className="flex w-full flex-col px-6 py-8 lg:w-[52%] lg:px-12 xl:px-20">
        <Link href="/" className="w-fit">
          <Logo />
        </Link>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">{children}</div>
        </div>

        <p className="text-muted-foreground text-center text-xs">
          © {new Date().getFullYear()} Revend · Feito para quem vive de girar
          estoque.
        </p>
      </div>

      {/* Proof panel */}
      <div className="bg-sidebar relative hidden overflow-hidden border-l lg:flex lg:w-[48%] lg:flex-col lg:justify-center lg:px-14 xl:px-20">
        <div aria-hidden className="grid-backdrop absolute inset-0 opacity-40" />
        <div
          aria-hidden
          className="bg-primary/12 absolute -top-32 -right-24 size-96 rounded-full blur-3xl"
        />
        <div
          aria-hidden
          className="absolute -bottom-40 -left-20 size-96 rounded-full bg-[var(--chart-6)]/10 blur-3xl"
        />

        <div className="relative max-w-md space-y-10">
          <div className="space-y-4">
            <h2 className="text-3xl font-semibold tracking-[-0.035em] text-balance">
              A revenda inteira em uma tela só.
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Do primeiro clique no anúncio até a assinatura do contrato — sem
              planilha paralela, sem lead esquecido no WhatsApp.
            </p>
          </div>

          <ul className="space-y-5">
            {HIGHLIGHTS.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-3.5">
                <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-xl">
                  <Icon className="size-4.5" />
                </span>
                <span className="space-y-0.5">
                  <span className="block text-sm font-medium">{title}</span>
                  <span className="text-muted-foreground block text-sm leading-relaxed">
                    {body}
                  </span>
                </span>
              </li>
            ))}
          </ul>

          <figure className="bg-card/60 space-y-3 rounded-2xl border p-5 backdrop-blur-sm">
            <Quote className="text-primary size-5" />
            <blockquote className="text-sm leading-relaxed">
              Cortamos o tempo médio de estoque de 74 para 41 dias no primeiro
              trimestre. A diferença foi enxergar o capital parado todo dia, não
              no fechamento do mês.
            </blockquote>
            <figcaption className="text-muted-foreground text-xs">
              <span className="text-foreground font-medium">Marina Duarte</span>
              {" · "}
              Sócia-fundadora, Revend Motors
            </figcaption>
          </figure>
        </div>
      </div>
    </div>
  );
}
