import { PageShell } from "@/components/marketing/PageShell";
import { site } from "@/lib/site";
import { FAQ } from "@/lib/faq-data";
import { FaqList, faqFacts } from "@/components/marketing/FaqList";
import { getLocale } from "@/i18n/server";
import { defineT } from "@/i18n/config";

const T = defineT({
  en: {
    metaTitle: "FAQ — Fitwise",
    metaDescription: "How Fitwise scores your fit, where jobs come from, what happens to your resume, and more.",
    eyebrow: "FAQ",
    title: "Questions, answered.",
    stillTitle: "Still have a question?",
    emailUs: "Email us at",
    weRead: "We read everything.",
    noInbox: "We're setting up a support inbox. In the meantime, everything about your data can be managed from your Profile page.",
  },
  sv: {
    metaTitle: "Vanliga frågor — Fitwise",
    metaDescription: "Hur Fitwise räknar ut din matchning, var jobben kommer ifrån, vad som händer med ditt CV och mer.",
    eyebrow: "Vanliga frågor",
    title: "Frågor och svar.",
    stillTitle: "Har du fler frågor?",
    emailUs: "Mejla oss på",
    weRead: "Vi läser allt.",
    noInbox: "Vi håller på att sätta upp en supportadress. Under tiden kan du hantera allt om din data från din profilsida.",
  },
});

export async function generateMetadata() {
  const t = T[await getLocale()];
  return { title: t.metaTitle, description: t.metaDescription };
}

export default async function FaqPage() {
  const locale = await getLocale();
  const t = T[locale];
  return (
    <PageShell eyebrow={t.eyebrow} title={t.title} narrow>
      <FaqList items={FAQ[locale](await faqFacts())} openFirst />

      <section id="contact" className="mt-12 scroll-mt-24 rounded-2xl border border-line bg-white p-6">
        <h2 className="text-lg font-semibold">{t.stillTitle}</h2>
        <p className="mt-2 text-ink-2">
          {site.contactEmail ? (
            <>
              {t.emailUs}{" "}
              <a href={`mailto:${site.contactEmail}`} className="text-accent underline underline-offset-2">{site.contactEmail}</a>.{" "}
              {t.weRead}
            </>
          ) : (
            t.noInbox
          )}
        </p>
      </section>
    </PageShell>
  );
}
