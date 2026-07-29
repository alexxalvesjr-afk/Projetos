import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Facebook, Instagram, MapPin, MessageCircle, Phone, Youtube } from "lucide-react";

import { db } from "@/lib/db";
import { whatsappLink } from "@/lib/utils";
import { formatPhone } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shared/theme-toggle";

export const revalidate = 300;

async function getStore(slug: string) {
  return db.organization.findUnique({
    where: { slug },
    include: { websiteSettings: true },
  });
}

/**
 * Public storefront chrome.
 *
 * Rendered statically with a 5-minute revalidation window; every inventory
 * mutation additionally calls `revalidatePath` on these routes, so a sold car
 * disappears immediately rather than waiting out the window.
 */
export default async function StoreLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const store = await getStore(slug);

  // An unpublished site should 404 for the public, not render an empty shell.
  if (!store || store.websiteSettings?.published === false) notFound();

  const socials = [
    { url: store.instagramUrl, icon: Instagram, label: "Instagram" },
    { url: store.facebookUrl, icon: Facebook, label: "Facebook" },
    { url: store.youtubeUrl, icon: Youtube, label: "YouTube" },
  ].filter((item) => Boolean(item.url));

  const nav = [
    { href: `/loja/${slug}`, label: "Início" },
    { href: `/loja/${slug}/estoque`, label: "Estoque" },
    { href: `/loja/${slug}#sobre`, label: "Sobre" },
    { href: `/loja/${slug}#contato`, label: "Contato" },
  ];

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="glass sticky top-0 z-40 border-b">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-6 px-4 sm:px-6">
          <Link href={`/loja/${slug}`} className="flex items-center gap-2.5">
            {store.logoUrl ? (
              <Image
                src={store.logoUrl}
                alt={store.name}
                width={36}
                height={36}
                className="size-9 rounded-lg object-contain"
              />
            ) : (
              <span
                className="flex size-9 items-center justify-center rounded-lg text-sm font-bold text-white"
                style={{ backgroundColor: store.brandColor }}
              >
                {store.name.slice(0, 2).toUpperCase()}
              </span>
            )}
            <span className="text-[15px] font-semibold tracking-[-0.02em]">
              {store.name}
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            {store.whatsapp ? (
              <Button asChild size="sm">
                <a
                  href={whatsappLink(
                    store.whatsapp,
                    `Olá! Vi o site da ${store.name} e gostaria de mais informações.`,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle />
                  <span className="hidden sm:inline">Falar no WhatsApp</span>
                </a>
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer id="contato" className="bg-sidebar border-t">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3">
          <div className="space-y-3">
            <p className="text-base font-semibold">{store.name}</p>
            {store.legalName ? (
              <p className="text-muted-foreground text-sm">{store.legalName}</p>
            ) : null}
            {store.taxId ? (
              <p className="text-muted-foreground text-xs">
                CNPJ {store.taxId}
              </p>
            ) : null}
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold">Contato</p>
            <ul className="text-muted-foreground space-y-2 text-sm">
              {store.phone ? (
                <li className="flex items-center gap-2">
                  <Phone className="size-3.5 shrink-0" />
                  <a href={`tel:${store.phone}`} className="hover:text-foreground">
                    {formatPhone(store.phone)}
                  </a>
                </li>
              ) : null}
              {store.whatsapp ? (
                <li className="flex items-center gap-2">
                  <MessageCircle className="size-3.5 shrink-0" />
                  <a
                    href={whatsappLink(store.whatsapp)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-foreground"
                  >
                    {formatPhone(store.whatsapp)}
                  </a>
                </li>
              ) : null}
              {store.addressLine ? (
                <li className="flex items-start gap-2">
                  <MapPin className="mt-0.5 size-3.5 shrink-0" />
                  <span>
                    {store.addressLine}
                    {store.city ? `, ${store.city}` : ""}
                    {store.state ? ` — ${store.state}` : ""}
                  </span>
                </li>
              ) : null}
            </ul>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold">Siga a loja</p>
            <div className="flex gap-2">
              {socials.map((social) => (
                <Button
                  key={social.label}
                  asChild
                  variant="outline"
                  size="icon"
                  aria-label={social.label}
                >
                  <a
                    href={social.url!}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <social.icon className="size-4" />
                  </a>
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t">
          <div className="text-muted-foreground mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-5 text-xs sm:px-6">
            <p>
              © {new Date().getFullYear()} {store.name}. Todos os direitos
              reservados.
            </p>
            <p>
              Feito com{" "}
              <Link href="/" className="text-foreground font-medium hover:underline">
                Mypremium CRM
              </Link>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
