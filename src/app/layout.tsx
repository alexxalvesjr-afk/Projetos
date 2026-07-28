import type { Metadata, Viewport } from "next";

import { Providers } from "@/components/providers";

import "./globals.css";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "Revend CRM — o sistema operacional da sua revenda",
    template: "%s · Revend CRM",
  },
  description:
    "Estoque, funil de vendas, metas e marketing em um só lugar. O CRM feito para revendas de veículos que querem crescer com previsibilidade.",
  keywords: [
    "CRM automotivo",
    "gestão de revenda",
    "software para revenda de veículos",
    "estoque de veículos",
    "funil de vendas automotivo",
  ],
  authors: [{ name: "Revend" }],
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: appUrl,
    siteName: "Revend CRM",
    title: "Revend CRM — o sistema operacional da sua revenda",
    description:
      "Estoque, funil de vendas, metas e marketing em um só lugar.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Revend CRM",
    description: "O sistema operacional da sua revenda de veículos.",
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
