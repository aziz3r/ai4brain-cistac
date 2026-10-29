"use client";

import React, { useState, useRef, useEffect } from "react";
import { useLanguage } from "../../context/LanguageContext";

interface HelpTooltipProps {
  type?: "score" | "range" | "projection" | "custom";
  customTitle?: string;
  customBody?: string;
  className?: string;
}

export function HelpTooltip({
  type = "score",
  customTitle,
  customBody,
  className = "",
}: HelpTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();

  let title = customTitle || "";
  let body = customBody || "";

  if (type === "score") {
    title = t("stats.score_title");
    body = t("stats.score_body");
  } else if (type === "range") {
    title = t("stats.range_title");
    body = t("stats.range_body");
  } else if (type === "projection") {
    title = t("stats.projection_title");
    body = t("stats.projection_body");
  }

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className={`relative inline-block align-middle ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={t("common.help_tooltip_label")}
        className="w-4 h-4 rounded-full border border-hairline text-muted-ink hover:text-ink hover:border-ink/50 text-[10px] font-sans font-medium flex items-center justify-center transition-colors focus:outline-none focus:ring-1 focus:ring-terracotta"
      >
        ?
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label={title}
          className="absolute z-50 w-72 p-3.5 bg-paper text-ink rounded shadow-lg border border-hairline text-xs leading-relaxed left-1/2 -translate-x-1/2 bottom-full mb-2 animate-fadeIn"
        >
          <div className="font-serif font-bold text-sm text-ink mb-1">{title}</div>
          <p className="text-muted-ink text-[13px]">{body}</p>
          <div className="w-2 h-2 bg-paper border-r border-b border-hairline transform rotate-45 absolute -bottom-1.5 left-1/2 -translate-x-1/2" />
        </div>
      )}
    </div>
  );
}