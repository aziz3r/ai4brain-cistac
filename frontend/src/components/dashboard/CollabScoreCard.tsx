"use client";

import React from "react";
import { CollaborationScoreState } from "@/types/contracts";
import { useLanguage } from "../../context/LanguageContext";
import { HelpTooltip } from "../ui/HelpTooltip";

interface Props {
  collab?: CollaborationScoreState;
  recResponseCount?: number;
}

export default function CollabScoreCard({ collab }: Props) {
  const { t, formatNumber } = useLanguage();

  const totalEvents = collab?.total_events || 0;
  const isUnlocked = totalEvents >= 4;

  const components = [
    { key: "C", score: collab?.components?.clarification?.score ?? 50 },
    { key: "V", score: collab?.components?.critical_verification?.score ?? 50 },
    { key: "I", score: collab?.components?.iteration?.score ?? 50 },
    { key: "A", score: collab?.components?.autonomy?.score ?? 50 },
    { key: "R", score: collab?.components?.responsible_use?.score ?? 50 },
  ];

  return (
    <div className="space-y-6 pt-8 hairline-t">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="font-serif text-2xl font-bold text-ink">
            {t("collab.title")}
          </h2>
          <HelpTooltip
            type="custom"
            customTitle={t("collab.title")}
            customBody={t("collab.intro")}
          />
        </div>
        <p className="text-sm text-muted-ink mt-1 max-w-xl leading-relaxed">
          {t("collab.intro")}
        </p>
      </div>

      {!isUnlocked ? (
        <div className="p-6 bg-paper border border-dashed border-hairline rounded-sm text-center">
          <p className="text-sm text-muted-ink">
            {t("collab.locked")}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Overall score indicator */}
          <div className="flex items-baseline gap-3">
            <span className="font-serif text-4xl font-bold text-ink">
              {formatNumber(Math.round(collab?.overall_score || 50))}
            </span>
            <span className="text-xs text-muted-ink">/ 100</span>
            <span className="text-xs text-muted-ink ml-auto">
              [{formatNumber(Math.round(collab?.ci_95_lower || 40))} – {formatNumber(Math.round(collab?.ci_95_upper || 60))}]
            </span>
          </div>

          {/* 5 Components List */}
          <div className="divide-y divide-hairline">
            {components.map(({ key, score }) => {
              const name = t(`collab.${key}.name`);
              const what = t(`collab.${key}.what`);

              return (
                <div key={key} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="sm:max-w-md">
                    <div className="font-medium text-sm text-ink">
                      {name} ({key})
                    </div>
                    <p className="text-xs text-muted-ink mt-0.5">
                      {what}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 sm:w-48 justify-end">
                    <div className="w-24 h-1.5 bg-hairline rounded-full overflow-hidden">
                      <div
                        className="h-full bg-teal transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono font-medium text-ink w-8 text-right">
                      {formatNumber(Math.round(score))}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}