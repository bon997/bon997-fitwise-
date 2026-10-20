import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { LogoStrip, Stats } from "@/components/landing/Proof";
import { HowItWorks, Testimonials, FinalCta, Footer } from "@/components/landing/Sections";
import { FaqSection } from "@/components/marketing/FaqList";
import { JsonLd, siteUrl } from "@/components/seo/JsonLd";
import { getLocale } from "@/i18n/server";

export default async function LandingPage() {
  const sv = (await getLocale()) === "sv";
  const url = siteUrl();
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            { "@type": "WebSite", "@id": `${url}/#website`, name: "Fitwise", url, inLanguage: ["sv", "en"] },
            {
              "@type": "WebApplication",
              name: "Fitwise",
              url,
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web",
              inLanguage: ["sv", "en"],
              description: sv
                ? "Ladda upp ditt CV en gång. Fitwise jämför varje jobb med dina kompetenser, visar vad som saknas och skriver utkast till personligt brev."
                : "Upload your resume once. Fitwise scores every job against your skills, explains the gaps, and drafts the cover letter.",
              offers: { "@type": "Offer", price: "0", priceCurrency: "SEK" },
            },
          ],
        }}
      />
      <Navbar />
      <main>
        <Hero />
        <LogoStrip />
        <Stats />
        <HowItWorks />
        <Testimonials />
        <div className="h-20" />
        <FaqSection />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
