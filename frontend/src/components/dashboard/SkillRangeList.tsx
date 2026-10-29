"use client";

import React from "react";
import { useLanguage } from "../../context/LanguageContext";
import { SkillIcon } from "../brand/SkillIllustrations";
import { HelpTooltip } from "../ui/HelpTooltip";

export interface SkillDimensionData {
  id: string;
  nameKey: string; // e.g. "working_memory"
  mu: number;
  sigma: number;
  session_count: number;
}

interface SkillRangeListProps {
  dimensions: SkillDimensionData[];
  className?: string;
}

export function SkillRangeList({ dimensions, className = "" }: SkillRangeListProps) {
  const { t, formatNumber } = useLanguage();

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between pb-2 hairline-b text-xs text-muted-ink uppercase tracking-wider">
        <div className="flex items-center gap-1.5">
          <span>{t("nav.play")} · {t("skills.header_badge")}</span>
          <HelpTooltip type="range" />
        </div>
        <div className="hidden sm:flex items-center justify-between w-64 pr-2">
          <span>0</span>
          <span>50</span>
          <span>100</span>
        </div>
      </div>

      <div className="divide-y divide-hairline">
        {dimensions.map((dim) => {
          const isMeasured = dim.session_count > 0;
          const skillKey = dim.nameKey || dim.id;
          const skillName = t(`skills.${skillKey}.name`);
          const skillWhat = t(`skills.${skillKey}.what`);

          // Estimate range
          const lower = Math.max(0, dim.mu - 1.96 * dim.sigma);
          const upper = Math.min(100, dim.mu + 1.96 * dim.sigma);

          // Range badge logic
          let badgeText = t("stats.not_measured");
          let badgeColor = "text-muted-ink border-hairline";
          if (isMeasured) {
            if (dim.sigma > 12) {
              badgeText = t("stats.badge_early");
              badgeColor = "text-terracotta border-terracotta/40";
            } else if (dim.sigma >= 6) {
              badgeText = t("stats.badge_clearer");
              badgeColor = "text-teal border-teal/40";
            } else {
              badgeText = t("stats.badge_stable");
              badgeColor = "text-ink border-ink/40";
            }
          }

          return (
            <div key={dim.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {/* Left Column: Skill Name + What it does */}
              <div className="flex items-start gap-3.5 sm:w-72">
                <div className="pt-0.5 flex-shrink-0">
                  <SkillIcon skillKey={skillKey} size={24} className="text-teal" />
                </div>
                <div>
                  <div className="font-serif font-bold text-base text-ink flex items-center gap-2">
                    <span>{skillName}</span>
                    <span className={`text-[11px] font-sans font-normal px-2 py-0.5 rounded-full border ${badgeColor}`}>
                      {badgeText}
                    </span>
                  </div>
                  <p className="text-xs text-muted-ink leading-relaxed mt-0.5">
                    {skillWhat}
                  </p>
                </div>
              </div>

              {/* Right Column: 0-100 Range Axis */}
              <div className="flex-1 sm:max-w-md flex flex-col justify-center">
                <div className="relative h-6 flex items-center">
                  {/* Axis line */}
                  <div
                    className={`w-full h-[1.5px] ${
                      isMeasured ? "bg-hairline" : "border-b border-dashed border-hairline"
                    }`}
                  />

                  {isMeasured && (
                    <>
                      {/* Shaded Range Band */}
                      <div
                        className="absolute h-3 bg-teal/20 rounded-sm transition-all duration-500"
                        style={{
                          left: `${lower}%`,
                          width: `${Math.max(4, upper - lower)}%`,
                        }}
                      />

                      {/* Best Estimate Dot (mu) */}
                      <div
                        className="absolute w-3 h-3 bg-teal rounded-full -ml-1.5 shadow-sm transition-all duration-500 flex items-center justify-center"
                        style={{ left: `${dim.mu}%` }}
                        title={`${skillName}: ${formatNumber(Math.round(dim.mu))} / 100`}
                      >
                        <div className="w-1 h-1 bg-paper rounded-full" />
                      </div>
                    </>
                  )}
                </div>

                {/* Numbers and interval */}
                <div className="flex items-center justify-between text-xs text-muted-ink pt-1">
                  {isMeasured ? (
                    <>
                      <span className="font-medium text-ink">
                        {formatNumber(Math.round(dim.mu))}
                        <span className="text-[11px] text-muted-ink font-normal"> / 100</span>
                      </span>
                      <span className="text-[11px] font-sans text-muted-ink">
                        [{formatNumber(Math.round(lower))} – {formatNumber(Math.round(upper))}]
                      </span>
                    </>
                  ) : (
                    <span className="text-[11px] text-muted-ink italic">
                      {t("stats.not_measured")}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}