import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { getLocale } from "@/i18n/server";
import { LocaleProvider } from "@/i18n/client";
import { defineT } from "@/i18n/config";
import { siteUrl } from "@/components/seo/JsonLd";

const META = defineT({
  en: {
    title: "Fitwise — AI job matching that tells you where you fit",
    description: "Upload your resume once. Fitwise scores every job against your skills, explains the gaps, and drafts the cover letter.",
  },
  sv: {
    title: "Fitwise — AI-matchning som visar var du passar in",
    description: "Ladda upp ditt CV en gång. Fitwise jämför varje jobb med dina kompetenser, visar vad som saknas och skriver utkast till personligt brev.",
  },
});

// Self-hosted (Latin incl. å ä ö) so pages never wait on Google Fonts and text doesn't jump when fonts load.
const inter = localFont({
  src: "./fonts/inter-latin-var.woff2",
  weight: "100 900",
  display: "swap",
  variable: "--font-inter",
});
const instrumentSerif = localFont({
  src: [
    { path: "./fonts/instrument-serif-latin.woff2", weight: "400", style: "normal" },
    { path: "./fonts/instrument-serif-latin-italic.woff2", weight: "400", style: "italic" },
  ],
  display: "swap",
  variable: "--font-instrument-serif",
});

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const { title, description } = META[locale];
  return {
    metadataBase: new URL(siteUrl()),
    title,
    description,
    openGraph: { type: "website", siteName: "Fitwise", title, description, locale: locale === "sv" ? "sv_SE" : "en_GB" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export const viewport: Viewport = { themeColor: "#1d6b52" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${inter.variable} ${instrumentSerif.variable}`}>
      <body>
        <LocaleProvider locale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
