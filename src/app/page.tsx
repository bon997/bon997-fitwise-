import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { LogoStrip, Stats } from "@/components/landing/Proof";
import { HowItWorks, Testimonials, FinalCta, Footer } from "@/components/landing/Sections";
import { FaqSection } from "@/components/marketing/FaqList";

export default function LandingPage() {
  return (
    <>
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
