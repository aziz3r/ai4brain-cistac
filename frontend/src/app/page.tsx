"use client";

import React from "react";
import Link from "next/link";
import { Header } from "../components/layout/Header";
import { Footer } from "../components/layout/Footer";
import { useLanguage } from "../context/LanguageContext";
import { SkillIcon } from "../components/brand/SkillIllustrations";

const SKILL_KEYS = [
  "working_memory",
  "inhibitory_control",
  "cognitive_flexibility",
  "processing_speed",
  "inductive_reasoning",
];

export default function LandingPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto px-6 py-16 sm:py-24 space-y-24">
        {/* Section 1: Headline & Pitch */}
        <section className="space-y-6 max-w-2xl">
          <h1 className="font-serif text-4xl sm:text-6xl font-bold tracking-tight text-ink leading-[1.1]">
            {t("app.tagline")}
          </h1>
          <p className="text-lg sm:text-xl text-muted-ink leading-relaxed">
            {t("app.pitch")}
          </p>

          <div className="pt-4 flex flex-col sm:flex-row sm:items-center gap-5">
            <Link
              href="/consent"
              className="inline-flex items-center justify-center px-8 py-3.5 bg-terracotta text-white font-medium rounded-sm hover:bg-terracotta/90 transition-colors shadow-sm text-base"
            >
              {t("common.start")}
            </Link>
            <Link
              href="/how-it-works"
              className="text-sm text-muted-ink hover:text-ink underline underline-offset-4 transition-colors"
            >
              {t("common.details_link")}
            </Link>
          </div>
        </section>

        {/* Section 2: How it works (3 steps, numbered, large) */}
        <section className="space-y-8 pt-8 hairline-t">
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink tracking-tight">
            {t("how_it_works_page.title")}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[0, 1, 2].map((idx) => {
              const stepText = t(`app.steps.${idx}`);
              return (
                <div key={idx} className="space-y-3">
                  <div className="font-serif text-3xl sm:text-4xl font-bold text-terracotta/80">
                    0{idx + 1}
                  </div>
                  <p className="text-base text-ink leading-relaxed">
                    {stepText}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Section 3: The Five Skills List */}
        <section className="space-y-8 pt-8 hairline-t">
          <div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink tracking-tight">
              {t("how_it_works_page.s1_title")}
            </h2>
            <p className="text-sm text-muted-ink mt-1">
              {t("how_it_works_page.s1_body")}
            </p>
          </div>

          <div className="divide-y divide-hairline">
            {SKILL_KEYS.map((key) => {
              const name = t(`skills.${key}.name`);
              const what = t(`skills.${key}.what`);
              const example = t(`skills.${key}.example`);

              return (
                <div key={key} className="py-6 flex flex-col sm:flex-row sm:items-baseline gap-4 sm:gap-8">
                  <div className="flex items-center gap-3 sm:w-56 flex-shrink-0">
                    <SkillIcon skillKey={key} size={24} className="text-teal" />
                    <span className="font-serif font-bold text-lg text-ink">
                      {name}
                    </span>
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <p className="text-base text-ink font-medium">
                      {what}
                    </p>
                    <p className="text-sm text-muted-ink leading-relaxed">
                      <span className="text-ink/80 font-medium">{t("common.example_label")} </span>
                      {example}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Section 4: Privacy Line & Start CTA */}
        <section className="pt-8 hairline-t space-y-6">
          <p className="text-sm sm:text-base text-muted-ink max-w-2xl leading-relaxed">
            {t("app.not_medical")}
          </p>

          <div className="flex items-center gap-6">
            <Link
              href="/consent"
              className="inline-flex items-center justify-center px-8 py-3.5 bg-terracotta text-white font-medium rounded-sm hover:bg-terracotta/90 transition-colors shadow-sm text-base"
            >
              {t("common.start")}
            </Link>
            <Link
              href="/how-it-works"
              className="text-sm text-muted-ink hover:text-ink underline underline-offset-4 transition-colors"
            >
              {t("common.details_link")}
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}