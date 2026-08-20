import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Car,
  Check,
  Globe,
  KanbanSquare,
  ShieldCheck,
  Target,
} from "lucide-react";

import { BRAND } from "@/lib/brand";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";

export const metadata: Metadata = {
  title: `${BRAND.product} — ${BRAND.tagline}`,
  description:
    "Estoque, funil de vendas, metas, marketing e site publicados a partir de um só lugar. Feito para a operação de veículos premium e embarcações da Duboss Motors.",
};

export const revalidate = 3600;

const FEATURES = [
  {
    icon: Car,
    title: "Estoque com margem à vista",
    body: "Custo, preparação, comissão e lucro previsto calculados enquanto você digita o preço. Nada de planilha paralela.",
  },
  {
    icon: KanbanSquare,
    title: "Funil que a equipe usa",
    body: "Kanban com arrastar e soltar, histórico automático e botões de WhatsApp, ligação e e-mail que registram a interação sozinhos.",
  },
  {
    icon: Globe,
    title: "Site sempre sincronizado",
    body: "Cadastrou, entra no ar com URL amigável e SEO pronto. Vendeu, sai do ar na hora. Zero trabalho duplo.",
  },
  {
    icon: BarChart3,
    title: "Relatórios que respondem",
    body: "Faturamento, margem, ROI, custo por lead, conversão e giro de estoque — com exportação para Excel e PDF.",
  },
  {
    icon: Target,
    title: "Metas e ranking",
    body: "Meta da loja e por vendedor, com marcador de ritmo que mostra se o mês fecha antes do dia 30.",
  },
  {
    icon: CalendarDays,
    title: "Agenda integrada",
    body: "Visitas, test drives e entregas ligados ao lead e ao veículo, visíveis para todo o time.",
  },
];

const STATS = [
  { value: "41 dias", label: "giro médio de estoque" },
  { value: "3,2×", label: "ROAS médio em mídia paga" },
  { value: "27%", label: "taxa de conversão do funil" },
];

export default async function LandingPage() {
  // Link straight to a live storefront when one exists — the product selling
  // itself is more convincing than a screenshot.
  const demoStore = await db.organization
    .findFirst({
      where: { websiteSettings: { published: true } },
      select: { slug: true, name: true },
      orderBy: { createdAt: "asc" },
    })
    .catch(() => null);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="glass sticky top-0 z-40 border-b">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Logo />
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="ghost">
              <Link href="/login">Entrar</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Criar conta</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden border-b">
          <div aria-hidden className="grid-backdrop absolute inset-0 opacity-40" />
          <div
            aria-hidden
            className="bg-primary/12 absolute -top-40 left-1/2 size-[36rem] -translate-x-1/2 rounded-full blur-3xl"
          />

          <div className="relative mx-auto w-full max-w-4xl px-4 py-24 text-center sm:px-6 lg:py-32">
            <Badge variant="outline" className="mb-6 backdrop-blur-sm">
              <ShieldCheck className="size-3" />
              Feito para revendas de veículos
            </Badge>

            <h1 className="text-4xl font-semibold tracking-[-0.045em] text-balance sm:text-6xl">
              A revenda inteira
              <br />
              <span className="text-gradient">em uma tela só.</span>
            </h1>

            <p className="text-muted-foreground mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-pretty">
              Do primeiro clique no anúncio até a assinatura do contrato. Estoque,
              funil, agenda, metas, marketing e site — sem planilha paralela e sem
              lead esquecido no WhatsApp.
            </p>

            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg">
                <Link href="/register">
                  Começar grátis
                  <ArrowRight />
                </Link>
              </Button>
              {demoStore ? (
                <Button asChild size="lg" variant="outline">
                  <Link href={`/loja/${demoStore.slug}`}>
                    Ver site de exemplo
                  </Link>
                </Button>
              ) : null}
            </div>

            <p className="text-muted-foreground mt-4 text-xs">
              Sem cartão de crédito · Configuração em menos de um minuto
            </p>
          </div>
        </section>

        {/* Stats */}
        <section className="bg-sidebar border-b">
          <div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-12 sm:grid-cols-3 sm:px-6">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl font-semibold tracking-[-0.03em]">
                  {stat.value}
                </p>
                <p className="text-muted-foreground mt-1 text-sm">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-[-0.035em] text-balance sm:text-4xl">
              Tudo o que a operação precisa, sem o que ela não usa
            </h2>
            <p className="text-muted-foreground mt-4 leading-relaxed">
              Cada módulo foi desenhado a partir da rotina real de uma loja de
              seminovos — não de um CRM genérico adaptado.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="bg-card group rounded-2xl border p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
              >
                <div className="bg-primary/10 text-primary mb-4 flex size-11 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105">
                  <feature.icon className="size-5" />
                </div>
                <h3 className="mb-2 font-semibold tracking-[-0.01em]">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Security */}
        <section className="bg-sidebar border-y">
          <div className="mx-auto grid w-full max-w-5xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center">
            <div className="space-y-4">
              <Badge variant="outline">Segurança</Badge>
              <h2 className="text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
                Cada pessoa vê exatamente o que deve ver
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Permissões por função, trilha de auditoria completa e isolamento
                total entre lojas. O vendedor trabalha a própria carteira; o dono
                enxerga a operação inteira.
              </p>
            </div>

            <ul className="space-y-3">
              {[
                "Controle de acesso por função (RBAC)",
                "Registro de auditoria com autor, IP e horário",
                "Custos e margens visíveis só para quem precisa",
                "Rate limiting e validação em todas as ações",
                "Proteção contra XSS, CSRF e injeção de fórmula",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm">
                  <Check
                    className="text-success mt-0.5 size-4 shrink-0"
                    strokeWidth={2.5}
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto w-full max-w-3xl px-4 py-24 text-center sm:px-6">
          <h2 className="text-3xl font-semibold tracking-[-0.035em] text-balance sm:text-4xl">
            Pronto para girar o estoque mais rápido?
          </h2>
          <p className="text-muted-foreground mx-auto mt-4 max-w-xl leading-relaxed">
            Crie sua conta e cadastre o primeiro veículo em menos de cinco
            minutos. Seu site entra no ar junto.
          </p>
          <Button asChild size="lg" className="mt-8">
            <Link href="/register">
              Criar conta grátis
              <ArrowRight />
            </Link>
          </Button>
        </section>
      </main>

      <footer className="border-t">
        <div className="text-muted-foreground mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-8 text-sm sm:px-6">
          <Logo />
          <p className="text-xs">
            © {new Date().getFullYear()} {BRAND.company}. {BRAND.footer}
          </p>
        </div>
      </footer>
    </div>
  );
}
