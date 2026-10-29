"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "../../context/LanguageContext";
import { SkillIcon } from "../brand/SkillIllustrations";

export interface GameBriefingProps {
  gameKey: "nback_spatial" | "flanker" | "task_switching" | "choice_rt" | "matrix_reasoning";
  skillKey: string;
  onStartGame: (isPractice: boolean) => void;
  onQuit?: () => void;
}

export function GameBriefing({
  gameKey,
  skillKey,
  onStartGame,
  onQuit,
}: GameBriefingProps) {
  const { t } = useLanguage();
  const [animStep, setAnimStep] = useState(0);

  // 8-second looping demo cycle (4 steps of 2s each)
  useEffect(() => {
    const timer = setInterval(() => {
      setAnimStep((prev) => (prev + 1) % 4);
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  const gameName = t(`games.${gameKey}.name`);
  const gameHow = t(`games.${gameKey}.how`, { n: 1 });
  const gameTrains = t(`games.${gameKey}.trains`);
  const gameTip = t(`games.${gameKey}.tip`);
  const skillWhat = t(`skills.${skillKey}.what`);
  const skillExample = t(`skills.${skillKey}.example`);

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      {onQuit && (
        <div className="flex justify-end pb-4">
          <button
            type="button"
            onClick={onQuit}
            className="text-xs text-muted-ink hover:text-ink transition-colors"
          >
            {t("common.quit")}
          </button>
        </div>
      )}

      {/* Header with Skill Icon */}
      <div className="flex items-center gap-3 mb-2">
        <SkillIcon skillKey={skillKey} size={28} className="text-terracotta" />
        <span className="text-xs font-medium uppercase tracking-wider text-muted-ink">
          {gameTrains}
        </span>
      </div>

      <h1 className="font-serif text-3xl sm:text-4xl font-bold text-ink mb-3 tracking-tight">
        {gameName}
      </h1>

      {/* Functional skill context & everyday example */}
      <div className="p-4 bg-teal/10 rounded-sm mb-6 text-sm">
        <div className="font-semibold text-ink mb-1">{skillWhat}</div>
        <p className="text-muted-ink text-xs leading-relaxed">
          <span className="font-medium text-ink/80">{t("common.example_label")} </span>
          {skillExample}
        </p>
      </div>

      {/* How to play */}
      <div className="space-y-4 mb-8">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-ink mb-1">
            {t("games.rules_title")}
          </h2>
          <p className="text-base text-ink leading-relaxed">
            {gameHow}
          </p>
        </div>

        {/* Animated 8-second demo */}
        <div className="p-6 bg-paper border border-hairline rounded-sm flex flex-col items-center justify-center min-h-[160px]">
          <div className="text-[11px] text-muted-ink uppercase tracking-wider mb-3">
            {t("games.demo_title")}
          </div>

          {/* Animated Mini Demo per Game */}
          {gameKey === "nback_spatial" && (
            <div className="grid grid-cols-3 gap-2 w-32 h-32">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => {
                const isLit = (animStep === 0 && i === 2) || (animStep === 2 && i === 2) || (animStep === 1 && i === 6);
                return (
                  <div
                    key={i}
                    className={`rounded-sm border border-hairline transition-colors duration-300 ${
                      isLit ? "bg-teal" : "bg-paper"
                    }`}
                  />
                );
              })}
            </div>
          )}

          {gameKey === "flanker" && (
            <div className="flex flex-col items-center gap-3">
              <div className="text-3xl font-bold tracking-widest text-ink">
                {animStep % 2 === 0 ? "→ → → → →" : "← ← → ← ←"}
              </div>
              <div className="text-xs font-medium text-terracotta">
                {animStep % 2 === 0 ? t("games.flanker.demo_middle_right") : t("games.flanker.demo_middle_right_ignore")}
              </div>
            </div>
          )}

          {gameKey === "task_switching" && (
            <div className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-full border-2 border-teal flex items-center justify-center text-2xl font-serif font-bold text-ink">
                7
              </div>
              <div className="text-xs text-muted-ink">
                {t("games.task_switching.demo_cue")}
              </div>
            </div>
          )}

          {gameKey === "choice_rt" && (
            <div className="flex items-center gap-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`w-12 h-12 rounded-sm border border-hairline flex items-center justify-center font-bold transition-colors ${
                    animStep % 3 === i ? "bg-terracotta text-white" : "bg-paper text-muted-ink"
                  }`}
                >
                  {i + 1}
                </div>
              ))}
            </div>
          )}

          {gameKey === "matrix_reasoning" && (
            <div className="grid grid-cols-2 gap-2 w-28 h-28">
              <div className="border border-hairline flex items-center justify-center font-serif text-lg">■</div>
              <div className="border border-hairline flex items-center justify-center font-serif text-lg">▲</div>
              <div className="border border-hairline flex items-center justify-center font-serif text-lg">■</div>
              <div className="border border-dashed border-teal flex items-center justify-center font-serif text-lg text-teal font-bold">
                ▲ ?
              </div>
            </div>
          )}
        </div>

        {/* Tip */}
        <div className="text-xs text-muted-ink italic border-l-2 border-terracotta pl-3 py-1">
          {gameTip}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-4 pt-4 border-t border-hairline">
        <button
          type="button"
          onClick={() => onStartGame(false)}
          className="w-full sm:w-auto px-8 py-3 bg-terracotta text-white font-medium rounded-sm hover:bg-terracotta/90 transition-colors shadow-sm text-sm"
        >
          {t("common.start")}
        </button>
        <button
          type="button"
          onClick={() => onStartGame(true)}
          className="w-full sm:w-auto px-6 py-3 border border-hairline text-ink font-medium rounded-sm hover:border-ink/40 transition-colors text-sm"
        >
          {t("common.practice")}
        </button>
      </div>
    </div>
  );
}