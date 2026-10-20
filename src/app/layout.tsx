import type { Metadata } from "next";
import "./globals.css";
import { getLocale } from "@/i18n/server";
import { LocaleProvider } from "@/i18n/client";
import { defineT } from "@/i18n/config";

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

export async function generateMetadata(): Promise<Metadata> {
  return META[await getLocale()];
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <LocaleProvider locale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
