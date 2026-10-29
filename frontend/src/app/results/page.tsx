"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Header } from "../../components/layout/Header";
import { Footer } from "../../components/layout/Footer";
import { useLanguage } from "../../context/LanguageContext";
import { SkillRangeList, SkillDimensionData } from "../../components/dashboard/SkillRangeList";
import { HelpTooltip } from "../../components/ui/HelpTooltip";

const DEFAULT_DIMENSIONS: SkillDimensionData[] = [
  { id: "working_memory", nameKey: "working_memory", mu: 68.0, sigma: 7.2, session_count: 1 },
  { id: "selective_attention", nameKey: "selective_attention", mu: 74.0, sigma: 5.8, session_count: 1 },
  { id: "cognitive_flexibility", nameKey: "cognitive_flexibility", mu: 62.0, sigma: 8.5, session_count: 1 },
  { id: "processing_speed", nameKey: "processing_speed", mu: 81.0, sigma: 4.9, session_count: 1 },
  { id: "inductive_reasoning", nameKey: "inductive_reasoning", mu: 70.0, sigma: 6.4, session_count: 1 },
];

export default function ResultsPage() {
  const { t, language } = useLanguage();
  const [dimensions, setDimensions] = useState<SkillDimensionData[]>(DEFAULT_DIMENSIONS);
  const [coachNote, setCoachNote] = useState<string>("");
  const [, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const userId = localStorage.getItem("ai4brain_user_id") || "cistac_user_01";
      try {
        const res = await fetch(`http://localhost:8000/brain-twin/${userId}`);
        if (res.ok) {
          const profile = await res.json();
          if (profile.dimensions) {
            const mapped: SkillDimensionData[] = Object.entries(profile.dimensions).map(
              ([key, val]: [string, any]) => ({
                id: key,
                nameKey: key,
                mu: val.mu,
                sigma: val.sigma,
                session_count: val.session_count,
              })
            );
            setDimensions(mapped);
          }
        }

        // Fetch coach recommendation with reactive language parameter
        const coachRes = await fetch(`http://localhost:8000/coach/recommendation/${userId}?language=${language}`);
        if (coachRes.ok) {
          const coachData = await coachRes.json();
          setCoachNote(coachData.explanation?.plain_language_reason || "");
        }
      } catch {
        // Use default seeded data
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [language]);

  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto px-6 py-12 sm:py-20 space-y-16">
        {/* Hero Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-teal">
              {t("results.calibration_complete")}
            </span>
          </div>
          <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-ink">
            {t("results.title")}
          </h1>
          <p className="text-base sm:text-lg text-muted-ink leading-relaxed max-w-2xl">
            {t("stats.profile_note")}
          </p>
        </div>

        {/* 1.7 Main View: Range Line Per Skill */}
        <section className="space-y-6">
          <div className="flex items-center justify-between pb-2 hairline-b">
            <div className="flex items-center gap-2">
              <h2 className="font-serif text-2xl font-bold text-ink">
                {t("results.skills_estimates_title")}
              </h2>
              <HelpTooltip type="range" />
            </div>
          </div>

          <SkillRangeList dimensions={dimensions} />
        </section>

        {/* Coach First Analysis Note */}
        <section className="hairline-t pt-8 space-y-4">
          <h2 className="font-serif text-xl font-bold text-ink flex items-center gap-2">
            <span>{t("coach.name")}</span>
          </h2>
          <div className="p-5 bg-teal/10 rounded-sm border-l-2 border-teal text-sm leading-relaxed text-ink">
            {coachNote || t("results.default_coach_note")}
          </div>
        </section>

        {/* Action Button */}
        <div className="hairline-t pt-8 flex flex-col sm:flex-row items-center gap-4">
          <Link
            href="/home"
            className="w-full sm:w-auto px-8 py-3.5 bg-terracotta text-white font-medium rounded-sm hover:bg-terracotta/90 transition-colors shadow-sm text-center text-sm"
          >
            {t("coach.cta_start")}
          </Link>
          <Link
            href="/profile"
            className="w-full sm:w-auto px-6 py-3.5 border border-hairline text-ink font-medium rounded-sm hover:border-ink/40 transition-colors text-center text-sm"
          >
            {t("nav.profile")}
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
