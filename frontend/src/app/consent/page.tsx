"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "../../components/layout/Header";
import { Footer } from "../../components/layout/Footer";
import { useLanguage } from "../../context/LanguageContext";

const API_BASE = "http://localhost:8000";

export default function ConsentPage() {
  const router = useRouter();
  const { t } = useLanguage();

  const [retentionDays, setRetentionDays] = useState<number>(90);
  const [accepted, setAccepted] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accepted) return;

    setIsSubmitting(true);
    const userId = "cistac_user_" + Math.random().toString(36).substring(2, 9);
    localStorage.setItem("ai4brain_user_id", userId);

    try {
      await fetch(`${API_BASE}/consent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          retention_days: retentionDays,
          acknowledged_non_clinical: true,
        }),
      });
    } catch {
      // Local fallback for offline/demo
    }

    router.push("/calibration");
  };

  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink">
      <Header />

      <main className="flex-1 max-w-2xl mx-auto px-6 py-12 sm:py-20 space-y-10">
        <div className="space-y-3">
          <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-ink">
            {t("privacy.title")}
          </h1>
          <p className="text-base sm:text-lg text-muted-ink leading-relaxed">
            {t("privacy.body")}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8 hairline-t pt-8">
          {/* Data collected breakdown */}
          <div className="space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-ink">
              {t("consent.recorded_data_title")}
            </h2>
            <div className="divide-y divide-hairline text-sm">
              <div className="py-2.5 flex justify-between items-center">
                <span>{t("consent.row_rt_answers")}</span>
                <span className="text-teal font-medium">{t("consent.status_recorded")}</span>
              </div>
              <div className="py-2.5 flex justify-between items-center">
                <span>{t("consent.row_chat")}</span>
                <span className="text-teal font-medium">{t("consent.status_recorded")}</span>
              </div>
              <div className="py-2.5 flex justify-between items-center text-muted-ink">
                <span>{t("consent.row_camera_mic")}</span>
                <span className="text-muted-ink">{t("consent.status_never_used")}</span>
              </div>
              <div className="py-2.5 flex justify-between items-center text-muted-ink">
                <span>{t("consent.row_personal_id")}</span>
                <span className="text-muted-ink">{t("consent.status_not_requested")}</span>
              </div>
            </div>
          </div>

          {/* Retention period */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-ink">
              {t("consent.retention_label")}
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[30, 90, 365].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setRetentionDays(days)}
                  className={`py-3 px-4 rounded-sm border text-sm font-medium transition-all ${
                    retentionDays === days
                      ? "border-ink bg-ink text-white"
                      : "border-hairline bg-paper text-ink hover:border-ink/40"
                  }`}
                >
                  {days} {t("consent.days_unit")}
                </button>
              ))}
            </div>
          </div>

          {/* Mandatory Checkbox */}
          <div className="p-4 bg-paper border border-hairline rounded-sm">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="mt-1 w-4 h-4 accent-terracotta rounded"
              />
              <span className="text-sm text-ink leading-relaxed">
                {t("consent.acknowledge_check")}
              </span>
            </label>
          </div>

          {/* Single Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={!accepted || isSubmitting}
              className="w-full sm:w-auto px-10 py-4 bg-terracotta text-white font-medium rounded-sm hover:bg-terracotta/90 transition-colors shadow-sm text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? t("consent.submitting") : t("consent.submit_btn")}
            </button>
          </div>
        </form>
      </main>

      <Footer />
    </div>
  );
}
