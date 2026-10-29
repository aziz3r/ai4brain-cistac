"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Header } from "../../components/layout/Header";
import { Footer } from "../../components/layout/Footer";
import { useLanguage } from "../../context/LanguageContext";

export default function HowItWorksPage() {
  const { t } = useLanguage();
  const [showMath, setShowMath] = useState(false);

  const sections = [
    {
      title: t("how_it_works_page.s1_title"),
      body: t("how_it_works_page.s1_body"),
    },
    {
      title: t("how_it_works_page.s2_title"),
      body: t("how_it_works_page.s2_body"),
    },
    {
      title: t("how_it_works_page.s3_title"),
      body: t("how_it_works_page.s3_body"),
    },
    {
      title: t("how_it_works_page.s4_title"),
      body: t("how_it_works_page.s4_body"),
    },
    {
      title: t("how_it_works_page.s5_title"),
      body: t("how_it_works_page.s5_body"),
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink">
      <Header />

      <main className="flex-1 max-w-3xl mx-auto px-6 py-12 sm:py-20 space-y-12">
        {/* Editorial Heading */}
        <div className="space-y-4">
          <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-ink">
            {t("how_it_works_page.title")}
          </h1>
          <p className="text-lg text-muted-ink leading-relaxed">
            {t("how_it_works_page.subtitle")}
          </p>
        </div>

        {/* 5 Numbered Explanatory Sections */}
        <div className="space-y-10 hairline-t pt-8">
          {sections.map((sec, idx) => (
            <section key={idx} className="space-y-2">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-ink">
                {sec.title}
              </h2>
              <p className="text-base text-muted-ink leading-relaxed">
                {sec.body}
              </p>
            </section>
          ))}
        </div>

        {/* Expandable Mathematical Appendix for Evaluators */}
        <section className="hairline-t pt-8">
          <button
            type="button"
            onClick={() => setShowMath(!showMath)}
            className="flex items-center justify-between w-full text-left font-serif font-bold text-lg text-ink hover:text-terracotta transition-colors py-2"
          >
            <span>{t("common.scientific_details")}</span>
            <span className="text-sm font-sans font-normal text-muted-ink">
              {showMath ? t("common.collapse") : t("common.expand")}
            </span>
          </button>

          {showMath && (
            <div className="mt-4 p-5 bg-paper border border-hairline rounded-sm space-y-4 text-xs font-mono text-muted-ink leading-relaxed">
              <div>
                <span className="font-bold text-ink">{t("how_it_works_page.math_kalman_title")}</span>
                <p className="mt-1">P = σ² + Q (Q = 2.5), K = P / (P + R), μ_post = μ + K(y - μ), σ²_post = (1 - K)P</p>
              </div>
              <div>
                <span className="font-bold text-ink">{t("how_it_works_page.math_damping_title")}</span>
                <p className="mt-1">{t("how_it_works_page.math_damping_cond")}</p>
              </div>
              <div>
                <span className="font-bold text-ink">{t("how_it_works_page.math_collab_title")}</span>
                <p className="mt-1">{t("how_it_works_page.math_shrinkage")}</p>
              </div>
            </div>
          )}
        </section>

        {/* CTA */}
        <div className="pt-8 hairline-t flex items-center justify-between">
          <Link
            href="/consent"
            className="inline-flex items-center justify-center px-8 py-3.5 bg-terracotta text-white font-medium rounded-sm hover:bg-terracotta/90 transition-colors shadow-sm text-base"
          >
            {t("common.start")}
          </Link>
          <Link
            href="/"
            className="text-sm text-muted-ink hover:text-ink transition-colors"
          >
            {t("common.back")}
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
