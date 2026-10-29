'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ItemResult, AssessmentSessionPayload } from '@/types/contracts';
import { useLanguage } from '@/context/LanguageContext';

interface Props {
  difficulty: number;
  userId: string;
  onComplete: (payload: AssessmentSessionPayload) => void;
  onCancel: () => void;
  isPractice?: boolean;
}

export default function SpeedRTGame({ difficulty, userId, onComplete, onCancel, isPractice = false }: Props) {
  const { t } = useLanguage();
  const totalTrials = isPractice ? 10 : 35;
  const choiceCount = difficulty <= 0.5 ? 2 : difficulty <= 0.75 ? 3 : difficulty === 1.0 ? 4 : 6;
  const referenceRt = 380;

  const [gameState, setGameState] = useState<'countdown' | 'playing' | 'post'>('countdown');
  const [countdown, setCountdown] = useState<number>(3);
  const [currentTrial, setCurrentTrial] = useState(0);
  const [activeTarget, setActiveTarget] = useState<number | null>(null);

  const itemsRef = useRef<ItemResult[]>([]);
  const trialStartRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 3-2-1 Countdown
  useEffect(() => {
    if (gameState !== 'countdown') return;
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 800);
      return () => clearTimeout(timer);
    } else {
      setGameState('playing');
      startNextTrial(0);
    }
  }, [gameState, countdown]);

  // Keyboard accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return;
      const num = parseInt(e.key, 10);
      if (!isNaN(num) && num >= 1 && num <= choiceCount) {
        e.preventDefault();
        handleTargetClick(num - 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, activeTarget, choiceCount, currentTrial]);

  const startNextTrial = (trialIdx: number) => {
    if (trialIdx >= totalTrials) {
      finishGame();
      return;
    }
    setCurrentTrial(trialIdx);
    setActiveTarget(null);

    const isi = Math.floor(Math.random() * 500) + 400;
    setTimeout(() => {
      const targetIdx = Math.floor(Math.random() * choiceCount);
      setActiveTarget(targetIdx);
      trialStartRef.current = performance.now();

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        itemsRef.current.push({
          item_id: `speed_${trialIdx + 1}`,
          rt_ms: 1500,
          correct: false,
          difficulty
        });
        startNextTrial(trialIdx + 1);
      }, 1500);
    }, isi);
  };

  const handleTargetClick = (clickedIdx: number) => {
    if (activeTarget === null) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    const rt = Math.round(performance.now() - trialStartRef.current);
    const correct = clickedIdx === activeTarget;

    itemsRef.current.push({
      item_id: `speed_${currentTrial + 1}`,
      rt_ms: rt,
      correct,
      difficulty
    });

    startNextTrial(currentTrial + 1);
  };

  const finishGame = () => {
    setGameState('post');
  };

  const handlePostContinue = () => {
    const items = itemsRef.current;
    const correctItems = items.filter(i => i.correct);
    const rts = correctItems.map(i => i.rt_ms).sort((a, b) => a - b);
    const medianRt = rts.length ? rts[Math.floor(rts.length / 2)] : 600;

    const acc = items.length ? correctItems.length / items.length : 0.8;
    const rel = medianRt / referenceRt;

    const speedFactor = Math.max(0, Math.min(1.0, (1.6 - rel) / 0.9));
    const rawScore = Math.round(100.0 * speedFactor * Math.pow(acc, 2));

    const meanRt = correctItems.length ? Math.round(correctItems.reduce((a, b) => a + b.rt_ms, 0) / correctItems.length) : 500;
    const errorRate = 1.0 - acc;

    const payload: AssessmentSessionPayload = {
      privacy_mode: 'non_biometric',
      pseudonymous_user_id: userId,
      consent_id: `cst_${userId}`,
      session_id: `ses_${Date.now()}`,
      timestamp: Date.now() / 1000,
      dimension_id: 'processing_speed',
      task_id: 'speed_choice_rt',
      task_difficulty: difficulty,
      items,
      raw_score: rawScore,
      mean_rt_ms: meanRt,
      baseline_rt_ms: 380.0,
      error_rate: errorRate,
      isv: 45.0,
      behavior_indicators: {}
    };

    onComplete(payload);
  };

  return (
    <div className="relative min-h-[500px] flex flex-col justify-between bg-paper p-6">
      {/* Thin top progress hairline */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-hairline">
        {gameState === 'playing' && (
          <div
            className="h-full bg-terracotta transition-all duration-300"
            style={{ width: `${((currentTrial + 1) / totalTrials) * 100}%` }}
          />
        )}
      </div>

      {/* Header bar during play */}
      <div className="flex items-center justify-between text-xs text-muted-ink pt-2">
        <span>{t("games.choice_rt.name")}</span>
        <button
          type="button"
          onClick={onCancel}
          className="hover:text-ink transition-colors"
        >
          {t("common.quit")}
        </button>
      </div>

      {/* Countdown Screen */}
      {gameState === 'countdown' && (
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="font-serif text-7xl font-bold text-ink animate-pulse">
            {countdown > 0 ? countdown : "Go"}
          </div>
          <p className="text-sm text-muted-ink mt-4">{t("common.ready")}</p>
        </div>
      )}

      {/* In-Game Stimulus */}
      {gameState === 'playing' && (
        <div className="flex-1 flex flex-col items-center justify-center my-6">
          <p className="text-xs text-muted-ink mb-8">
            {t("games.choice_rt.cue")}
          </p>

          {/* Big Response Zones */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full max-w-md">
            {Array.from({ length: choiceCount }).map((_, idx) => {
              const isTarget = activeTarget === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleTargetClick(idx)}
                  className={`h-28 rounded-sm border transition-all text-xl font-serif font-bold flex flex-col items-center justify-center ${
                    isTarget
                      ? 'bg-terracotta text-white border-terracotta scale-105 shadow-md'
                      : 'bg-paper border-hairline hover:border-ink/50 text-muted-ink'
                  }`}
                >
                  <span>{idx + 1}</span>
                  <span className="text-[10px] font-sans font-normal text-muted-ink/80 mt-1">
                    {t("games.choice_rt.key_hint", { key: idx + 1 })}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Post Game Screen */}
      {gameState === 'post' && (
        <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto text-center space-y-4 py-8">
          <div className="font-serif text-2xl font-bold text-ink">
            {t("common.estimate_updated")}
          </div>
          <p className="text-sm text-muted-ink leading-relaxed">
            {t("games.choice_rt.post_summary")}
          </p>
          <button
            type="button"
            onClick={handlePostContinue}
            className="mt-6 px-8 py-3 bg-terracotta text-white font-medium rounded-sm hover:bg-terracotta/90 transition-colors text-sm"
          >
            {t("common.continue")}
          </button>
        </div>
      )}

      <div />
    </div>
  );
}