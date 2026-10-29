"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Header } from "../../components/layout/Header";
import { Footer } from "../../components/layout/Footer";
import { useLanguage } from "../../context/LanguageContext";

const API_BASE = "http://localhost:8000";

interface DemoPersonaConfig {
  id: string;
  key: "steady_improver" | "variable_responder" | "fatigue_pattern";
  stats: {
    memory: string;
    focus: string;
    speed: string;
  };
}

const DEMO_PERSONAS: DemoPersonaConfig[] = [
  {
    id: "persona_steady_improver",
    key: "steady_improver",
    stats: { memory: "78 / 100", focus: "82 / 100", speed: "84 / 100" },
  },
  {
    id: "persona_variable_responder",
    key: "variable_responder",
    stats: { memory: "62 / 100", focus: "58 / 100", speed: "64 / 100" },
  },
  {
    id: "persona_fatigue_pattern",
    key: "fatigue_pattern",
    stats: { memory: "65 / 100", focus: "52 / 100", speed: "59 / 100" },
  },
];

export default function DemoPersonasPage() {
  const router = useRouter();
  const { t } = useLanguage();

  const handleSelectPersona = async (personaId: string) => {
    localStorage.setItem("ai4brain_user_id", personaId);

    try {
      await fetch(`${API_BASE}/consent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: personaId,
          retention_days: 90,
          acknowledged_non_clinical: true,
        }),
      });
    } catch {
      // Local fallback
    }

    router.push("/home");
  };

  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto px-6 py-12 sm:py-20 space-y-12">
        <div className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-terracotta">
            {t("demo.header_badge")}
          </div>
          <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-ink">
            {t("demo.title")}
          </h1>
          <p className="text-base sm:text-lg text-muted-ink leading-relaxed max-w-2xl">
            {t("demo.subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 hairline-t">
          {DEMO_PERSONAS.map((p) => {
            const name = t(`demo.personas.${p.key}.name`);
            const tagline = t(`demo.personas.${p.key}.tagline`);
            const desc = t(`demo.personas.${p.key}.desc`);
            const uncertainty = t(`demo.personas.${p.key}.uncertainty`);

            return (
              <div
                key={p.id}
                className="bg-paper p-6 border border-hairline rounded-sm flex flex-col justify-between space-y-4 hover:border-ink/50 transition-colors"
              >
                <div className="space-y-3">
                  <div className="font-serif font-bold text-lg text-ink">
                    {name}
                  </div>
                  <div className="text-xs font-medium text-teal">
                    {tagline}
                  </div>
                  <p className="text-xs text-muted-ink leading-relaxed">
                    {desc}
                  </p>

                  <div className="pt-2 border-t border-hairline text-[11px] space-y-1 text-muted-ink font-mono">
                    <div>{t("demo.stat_memory")} {p.stats.memory}</div>
                    <div>{t("demo.stat_focus")} {p.stats.focus}</div>
                    <div>{t("demo.stat_speed")} {p.stats.speed}</div>
                    <div className="text-ink font-semibold">{uncertainty}</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleSelectPersona(p.id)}
                  className="w-full py-2.5 px-4 bg-paper border border-ink text-ink font-medium rounded-sm hover:bg-ink hover:text-white transition-colors text-xs"
                >
                  {t("demo.load_persona")}
                </button>
              </div>
            );
          })}
        </div>
      </main>

      <Footer />
    </div>
  );
}
