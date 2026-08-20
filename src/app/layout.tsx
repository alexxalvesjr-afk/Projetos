import type { Metadata, Viewport } from "next";

import { BRAND } from "@/lib/brand";
import { Providers } from "@/components/providers";

import "./globals.css";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: `${BRAND.product} — ${BRAND.tagline}`,
    template: `%s · ${BRAND.product}`,
  },
  description:
    "Estoque, funil de vendas, metas e marketing em um só lugar. O sistema que roda o dia a dia da Duboss Motors — veículos premium e embarcações.",
  keywords: [
    "CRM automotivo",
    "gestão de revenda",
    "software para revenda de veículos",
    "estoque de veículos",
    "funil de vendas automotivo",
  ],
  authors: [{ name: BRAND.company }],
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: appUrl,
    siteName: BRAND.product,
    title: `${BRAND.product} — ${BRAND.tagline}`,
    description:
      "Estoque, funil de vendas, metas e marketing em um só lugar.",
  },
  twitter: {
    card: "summary_large_image",
    title: BRAND.product,
    description: `O sistema operacional da ${BRAND.company}.`,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0d12" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // `suppressHydrationWarning` is required by next-themes, which sets the
    // theme class on <html> before React hydrates.
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
