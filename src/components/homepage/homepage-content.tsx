"use client";

import { SiteTopNav } from "@/components/site/site-top-nav";
import { HeroSection } from "./hero-section";
import { UniverseMap } from "./universe-map";
import { RoleRouter } from "./role-router";
import { HowLLPWorks } from "./how-llp-works";
import { ServicesHighlight } from "./services-highlight";
import { HeadhuntingHighlight } from "./headhunting-highlight";
import { PricingPreview } from "./pricing-preview";
import { TrackRequest } from "./track-request";
import { CtaBand } from "./cta-band";
import { HomepageFooter } from "./homepage-footer";
import { HomepageCodexStyles } from "./codex-styles";

export function HomepageContent() {
  return (
    <div className="hp-codex min-h-screen" style={{ background: "transparent" }}>
      <HomepageCodexStyles />

      {/* Fixed page-level scaffolding */}
      <div aria-hidden className="hp-bg-scaffold">
        <div className="hp-bg-grid" />
        <div className="hp-bg-grain" />
        <div className="hp-bg-margin" />
      </div>
      <div aria-hidden className="hp-bg-watermark" />

      <SiteTopNav />
      <main className="relative z-10">
        <HeroSection />
        <UniverseMap />
        <RoleRouter />
        <HowLLPWorks />
        <ServicesHighlight />
        <HeadhuntingHighlight />
        <PricingPreview />
        <TrackRequest />
        <CtaBand />
      </main>
      <HomepageFooter />
    </div>
  );
}
