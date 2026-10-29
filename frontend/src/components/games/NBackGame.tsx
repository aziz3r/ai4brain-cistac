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

export default function NBackGame({ difficulty, userId, onComplete, onCancel, isPractice = false }: Props) {
  const { t } = useLanguage();
  const nBackLevel = difficulty <= 0.75 ? 1 : difficulty === 1.0 ? 2 : 3;
  const totalTrials = isPractice ? 8 : 24;
  const displayTimeMs = Math.max(1200, 2400 - difficulty * 500);

  const [gameState, setGameState] = useState<'countdown' | 'playing' | 'post'>('countdown');
  const [countdown, setCountdown] = useState(3);
  const [currentStep, setCurrentStep] = useState(0);
  const [activeCell, setActiveCell] = useState<number | null>(null);
  const [userRespondedMatch, setUserRespondedMatch] = useState(false);

  const sequenceRef = useRef<number[]>([]);
  const itemsRef = useRef<ItemResult[]>([]);
  const stepStartRef = useRef<number>(0);

  // 3-2-1 Countdown in Fraunces serif
  useEffect(() => {
    if (gameState !== 'countdown') return;
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 800);
      return () => clearTimeout(timer);
    } else {
      startGame();
    }
  }, [gameState, countdown]);

  // Keyboard accessibility: Spacebar or Enter = Match
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return;
      if (e.code === 'Space' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handleMatchClick();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, activeCell, userRespondedMatch, currentStep]);

  const generateSequence = () => {
    const seq: number[] = [];
    for (let i = 0; i < totalTrials; i++) {
      if (i >= nBackLevel && Math.random() < 0.35) {
        seq.push(seq[i - nBackLevel]);
      } else {
        const randCell = Math.floor(Math.random() * 9);
        seq.push(randCell);
      }
    }
    sequenceRef.current = seq;
  };

  const startGame = () => {
    generateSequence();
    itemsRef.current = [];
    setCurrentStep(0);
    setGameState('playing');
    showStep(0);
  };

  const showStep = (stepIdx: number) => {
    if (stepIdx >= totalTrials) {
      finishGame();
      return;
    }
    setCurrentStep(stepIdx);
    setActiveCell(sequenceRef.current[stepIdx]);
    setUserRespondedMatch(false);
    stepStartRef.current = performance.now();

    setTimeout(() => {
      setActiveCell(null);
    }, displayTimeMs * 0.6);

    setTimeout(() => {
      const isTarget = stepIdx >= nBackLevel && sequenceRef.current[stepIdx] === sequenceRef.current[stepIdx - nBackLevel];
      itemsRef.current.push({
        item_id: `trial_${stepIdx + 1}`,
        rt_ms: 0,
        correct: !isTarget,
        condition: `${nBackLevel}-back`,
        difficulty
      });
      showStep(stepIdx + 1);
    }, displayTimeMs);
  };

  const handleMatchClick = () => {
    if (userRespondedMatch || activeCell === null) return;
    setUserRespondedMatch(true);
    const rt = Math.round(performance.now() - stepStartRef.current);
    const isTarget = currentStep >= nBackLevel && sequenceRef.current[currentStep] === sequenceRef.current[currentStep - nBackLevel];

    if (itemsRef.current.length > currentStep) {
      itemsRef.current[currentStep] = {
        item_id: `trial_${currentStep + 1}`,
        rt_ms: rt,
        correct: isTarget,
        condition: `${nBackLevel}-back`,
        difficulty
      };
    }
  };

  const finishGame = () => {
    setGameState('post');
  };

  const handlePostContinue = () => {
    const items = itemsRef.current;
    const hits = items.filter(i => i.correct && i.rt_ms > 0).length;
    const falseAlarms = items.filter(i => !i.correct && i.rt_ms > 0).length;
    const targetCount = items.filter((_, idx) => idx >= nBackLevel && sequenceRef.current[idx] === sequenceRef.current[idx - nBackLevel]).length;
    const nonTargetCount = items.length - targetCount;

    const hitRate = Math.min(0.99, Math.max(0.01, targetCount ? hits / targetCount : 0.5));
    const faRate = Math.min(0.99, Math.max(0.01, nonTargetCount ? falseAlarms / nonTargetCount : 0.05));

    const invNorm = (p: number) => {
      const a = [2.515517, 0.802853, 0.010328];
      const b = [1.432788, 0.189269, 0.001308];
      const tVal = Math.sqrt(-2.0 * Math.log(p <= 0.5 ? p : 1.0 - p));
      const num = a[0] + a[1] * tVal + a[2] * tVal * tVal;
      const den = 1.0 + b[0] * tVal + b[1] * tVal * tVal + b[2] * tVal * tVal * tVal;
      const z = tVal - num / den;
      return p <= 0.5 ? -z : z;
    };

    const dPrime = Math.max(0, invNorm(hitRate) - invNorm(faRate));
    const rawScore = Math.round(100.0 * Math.min(1.0, dPrime / 3.4));

    const correctRts = items.filter(i => i.correct && i.rt_ms > 0).map(i => i.rt_ms);
    const meanRt = correctRts.length ? Math.round(correctRts.reduce((a, b) => a + b, 0) / correctRts.length) : 550;
    const errorRate = 1.0 - (items.filter(i => i.correct).length / items.length);

    const payload: AssessmentSessionPayload = {
      privacy_mode: 'non_biometric',
      pseudonymous_user_id: userId,
      consent_id: `cst_${userId}`,
      session_id: `ses_${Date.now()}`,
      timestamp: Date.now() / 1000,
      dimension_id: 'working_memory',
      task_id: 'spatial_n_back',
      task_difficulty: difficulty,
      items,
      raw_score: rawScore,
      mean_rt_ms: meanRt,
      baseline_rt_ms: 500.0,
      error_rate: errorRate,
      isv: 85.0,
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
            style={{ width: `${((currentStep + 1) / totalTrials) * 100}%` }}
          />
        )}
      </div>

      {/* Header bar during play */}
      <div className="flex items-center justify-between text-xs text-muted-ink pt-2">
        <span>{t("games.nback_spatial.name")} · N={nBackLevel}</span>
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
          <div className="grid grid-cols-3 gap-3 w-64 h-64 p-3 bg-paper border border-hairline rounded-sm">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((idx) => {
              const isLit = activeCell === idx;
              return (
                <div
                  key={idx}
                  className={`rounded-sm border border-hairline transition-all duration-150 flex items-center justify-center ${
                    isLit ? 'bg-teal border-teal shadow-sm scale-95' : 'bg-paper'
                  }`}
                />
              );
            })}
          </div>

          {/* Big Response Zone */}
          <div className="mt-8 w-full max-w-sm">
            <button
              type="button"
              onClick={handleMatchClick}
              disabled={userRespondedMatch}
              className={`w-full py-4 text-center font-medium text-base rounded-sm border transition-all ${
                userRespondedMatch
                  ? 'bg-teal text-white border-teal'
                  : 'bg-paper border-ink hover:bg-ink hover:text-white text-ink active:scale-[0.98]'
              }`}
            >
              {userRespondedMatch ? "✓ " + t("common.same") : t("common.same")}
            </button>
            <p className="text-center text-xs text-muted-ink mt-2">
              {t("common.space_key")} / {t("common.enter_key")}
            </p>
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
            {t("games.nback_spatial.post_summary")}
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