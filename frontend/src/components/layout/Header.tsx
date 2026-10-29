"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "../brand/Wordmark";
import { useLanguage } from "../../context/LanguageContext";

export function Header() {
  const pathname = usePathname();
  const { language, setLanguage, t } = useLanguage();

  return (
    <header className="w-full hairline-b bg-paper/95 backdrop-blur-sm sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
        <Wordmark />

        {/* Minimal Editorial Navigation */}
        <nav className="flex items-center gap-6 text-[15px]">
          <Link
            href="/home"
            className={`transition-colors hover:text-terracotta ${
              pathname === "/home" || pathname === "/calibration"
                ? "text-ink font-semibold"
                : "text-muted-ink"
            }`}
          >
            {t("nav.play")}
          </Link>
          <Link
            href="/profile"
            className={`transition-colors hover:text-terracotta ${
              pathname === "/profile" ? "text-ink font-semibold" : "text-muted-ink"
            }`}
          >
            {t("nav.profile")}
          </Link>
          <Link
            href="/how-it-works"
            className={`transition-colors hover:text-terracotta ${
              pathname === "/how-it-works" ? "text-ink font-semibold" : "text-muted-ink"
            }`}
          >
            {t("nav.how_it_works")}
          </Link>

          {/* Language Switch: text toggle FR | EN with accessible names and aria-pressed */}
          <div className="flex items-center gap-1.5 pl-3 border-l border-hairline text-sm">
            <button
              type="button"
              onClick={() => setLanguage("fr")}
              aria-pressed={language === "fr"}
              className={`px-1.5 py-0.5 rounded-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-terracotta ${
                language === "fr"
                  ? "text-terracotta font-semibold underline underline-offset-4"
                  : "text-muted-ink hover:text-ink"
              }`}
            >
              FR
            </button>
            <span className="text-hairline">|</span>
            <button
              type="button"
              onClick={() => setLanguage("en")}
              aria-pressed={language === "en"}
              className={`px-1.5 py-0.5 rounded-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-terracotta ${
                language === "en"
                  ? "text-terracotta font-semibold underline underline-offset-4"
                  : "text-muted-ink hover:text-ink"
              }`}
            >
              EN
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
}
