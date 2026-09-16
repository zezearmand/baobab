import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const siteUrl = "https://baobabweb.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Baobabweb — Studio digital à Dakar",
  description:
    "Baobabweb conçoit des expériences web, produits et automatisations IA qui font grandir les entreprises. Design, développement et performance, de Dakar au monde.",
  keywords: [
    "agence web Dakar",
    "développement web Sénégal",
    "studio digital",
    "création site internet Dakar",
    "IA et automatisation",
  ],
  openGraph: {
    title: "Baobabweb — Studio digital à Dakar",
    description: "Des expériences digitales qui font grandir les entreprises. Dakar → The World.",
    url: siteUrl,
    siteName: "Baobabweb",
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Baobabweb — Studio digital à Dakar",
    description: "Des expériences digitales qui font grandir les entreprises. Dakar → The World.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${spaceGrotesk.variable} ${inter.variable} h-full`}>
      <body className="min-h-full">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
