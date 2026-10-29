"use client";

import React from "react";
import Link from "next/link";
import { useLanguage } from "../../context/LanguageContext";

export function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="w-full hairline-t bg-paper mt-20 py-12 text-[14px] text-muted-ink">
      <div className="max-w-5xl mx-auto px-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="max-w-xl text-ink/80 leading-relaxed">
            {t("app.not_medical")}
          </p>
          <div className="flex items-center gap-6 text-[14px]">
            <Link href="/privacy" className="hover:text-terracotta transition-colors">
              {t("nav.privacy")}
            </Link>
            <Link href="/demo" className="hover:text-terracotta transition-colors">
              {t("nav.evaluators")}
            </Link>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-6 border-t border-hairline text-xs text-muted-ink">
          <span>AI4BRAIN · IEEE CISTAC 1.0 Challenge</span>
          <span>Adaptive Non-Clinical Cognitive Twin</span>
        </div>
      </div>
    </footer>
  );
}