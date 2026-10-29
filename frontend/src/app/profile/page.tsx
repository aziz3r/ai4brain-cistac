"use client";

import React, { useState, useEffect } from "react";
import { Header } from "../../components/layout/Header";
import { Footer } from "../../components/layout/Footer";
import { useLanguage } from "../../context/LanguageContext";
import { SkillRangeList, SkillDimensionData } from "../../components/dashboard/SkillRangeList";
import ProjectionConeChart from "../../components/dashboard/ProjectionConeChart";
import CollabScoreCard from "../../components/dashboard/CollabScoreCard";
import { BrainTwinState } from "@/types/contracts";

const API_BASE = "http://localhost:8000";

const DEFAULT_DIMENSIONS: SkillDimensionData[] = [
  { id: "working_memory", nameKey: "working_memory", mu: 50.0, sigma: 25.0, session_count: 0 },
  { id: "inhibitory_control", nameKey: "inhibitory_control", mu: 50.0, sigma: 25.0, session_count: 0 },
  { id: "cognitive_flexibility", nameKey: "cognitive_flexibility", mu: 50.0, sigma: 25.0, session_count: 0 },
  { id: "processing_speed", nameKey: "processing_speed", mu: 50.0, sigma: 25.0, session_count: 0 },
  { id: "inductive_reasoning", nameKey: "inductive_reasoning", mu: 50.0, sigma: 25.0, session_count: 0 },
];

export default function ProfilePage() {
  const { t, formatNumber } = useLanguage();
  const [brainTwin, setBrainTwin] = useState<BrainTwinState | null>(null);
  const [showScientistPanel, setShowScientistPanel] = useState<boolean>(false);

  useEffect(() => {
    const userId = localStorage.getItem("ai4brain_user_id") || "cistac_user_01";
    fetchProfile(userId);
  }, []);

  const fetchProfile = async (uid: string) => {
    try {
      const res = await fetch(`${API_BASE}/brain-twin/${uid}`);
      if (res.ok) {
        setBrainTwin(await res.json());
      }
    } catch {
      // Local fallback
    }
  };

  const dimensionsData: SkillDimensionData[] = brainTwin?.dimensions
    ? Object.entries(brainTwin.dimensions).map(([key, val]: [string, any]) => ({
        id: key,
        nameKey: key,
        mu: val.mu,
        sigma: val.sigma,
        session_count: val.session_count,
      }))
    : DEFAULT_DIMENSIONS;

  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto px-6 py-12 sm:py-16 space-y-16">
        {/* Title */}
        <div className="space-y-3">
          <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-ink">
            {t("nav.profile")}
          </h1>
          <p className="text-base sm:text-lg text-muted-ink leading-relaxed max-w-2xl">
            {t("stats.profile_note")}
          </p>
        </div>

        {/* 1. Skill Range Lines */}
        <section className="space-y-6">
          <div className="pb-2 hairline-b">
            <h2 className="font-serif text-2xl font-bold text-ink">
              {t("profile.current_estimates")}
            </h2>
          </div>
          <SkillRangeList dimensions={dimensionsData} />
        </section>

        {/* 2. Projection Path */}
        <section>
          <ProjectionConeChart projectionCone={brainTwin?.projection_cone} />
        </section>

        {/* 3. Collaboration Score Card */}
        <section>
          <CollabScoreCard collab={brainTwin?.collaboration_score} />
        </section>

        {/* 4. For evaluators & scientists panel */}
        <section className="hairline-t pt-8">
          <button
            type="button"
            onClick={() => setShowScientistPanel(!showScientistPanel)}
            className="flex items-center justify-between w-full text-left font-serif font-bold text-lg text-ink hover:text-terracotta transition-colors py-2"
          >
            <span>{t("profile.scientists_panel_title")}</span>
            <span className="text-sm font-sans font-normal text-muted-ink">
              {showScientistPanel ? t("common.collapse") : t("common.expand")}
            </span>
          </button>

          {showScientistPanel && (
            <div className="mt-4 p-5 bg-paper border border-hairline rounded-sm space-y-4 text-xs font-mono text-muted-ink leading-relaxed">
              <p className="font-sans text-xs text-muted-ink">
                {t("profile.scientists_desc")}
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-hairline text-ink">
                      <th className="py-2 pr-4 font-semibold">{t("profile.th_skill")}</th>
                      <th className="py-2 pr-4 font-semibold">{t("profile.th_mu")}</th>
                      <th className="py-2 pr-4 font-semibold">{t("profile.th_sigma")}</th>
                      <th className="py-2 pr-4 font-semibold">{t("profile.th_ci")}</th>
                      <th className="py-2 font-semibold">{t("profile.th_sessions")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {dimensionsData.map((d) => (
                      <tr key={d.id}>
                        <td className="py-2 pr-4 text-ink font-sans font-medium">{t(`skills.${d.nameKey}.name`)}</td>
                        <td className="py-2 pr-4">{formatNumber(d.mu, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td>
                        <td className="py-2 pr-4">{formatNumber(d.sigma, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td>
                        <td className="py-2 pr-4">
                          [{formatNumber(Math.max(0, d.mu - 1.96 * d.sigma), { minimumFractionDigits: 1, maximumFractionDigits: 1 })} – {formatNumber(Math.min(100, d.mu + 1.96 * d.sigma), { minimumFractionDigits: 1, maximumFractionDigits: 1 })}]
                        </td>
                        <td className="py-2">{d.session_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
