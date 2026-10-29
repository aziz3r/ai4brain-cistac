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

export default function FlankerGame({ difficulty, userId, onComplete, onCancel, isPractice = false }: Props) {
  const { t } = useLanguage();
  const totalTrials = isPractice ? 10 : 40;
  const incongruentProb = Math.min(0.70, 0.40 + (difficulty - 0.5) * 0.20);
  const deadlineMs = Math.max(1000, 1800 - (difficulty - 0.5) * 450);

  const [gameState, setGameState] = useState<'countdown' | 'playing' | 'post'>('countdown');
  const [countdown, setCountdown] = useState<number>(3);
  const [currentTrial, setCurrentTrial] = useState(0);
  const [stimulus, setStimulus] = useState<string>('');
  const [centerDirection, setCenterDirection] = useState<'left' | 'right'>('left');
  const [condition, setCondition] = useState<'congruent' | 'incongruent'>('congruent');

  const itemsRef = useRef<ItemResult[]>([]);
  const trialStartRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

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
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        handleResponse('left');
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        handleResponse('right');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, centerDirection, currentTrial]);

  const startNextTrial = (trialIdx: number) => {
    if (trialIdx >= totalTrials) {
      finishGame();
      return;
    }
    setCurrentTrial(trialIdx);

    const isLeft = Math.random() < 0.5;
    const isIncongruent = Math.random() < incongruentProb;

    const center = isLeft ? '←' : '→';
    const flankers = isIncongruent ? (isLeft ? '→' : '←') : center;
    const stim = `${flankers}  ${flankers}  ${center}  ${flankers}  ${flankers}`;

    setStimulus(stim);
    setCenterDirection(isLeft ? 'left' : 'right');
    setCondition(isIncongruent ? 'incongruent' : 'congruent');
    trialStartRef.current = performance.now();

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      itemsRef.current.push({
        item_id: `flanker_${trialIdx + 1}`,
        rt_ms: deadlineMs,
        correct: false,
        condition: isIncongruent ? 'incongruent' : 'congruent',
        difficulty
      });
      startNextTrial(trialIdx + 1);
    }, deadlineMs);
  };

  const handleResponse = (chosenDir: 'left' | 'right') => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const rt = Math.round(performance.now() - trialStartRef.current);
    const correct = chosenDir === centerDirection;

    itemsRef.current.push({
      item_id: `flanker_${currentTrial + 1}`,
      rt_ms: rt,
      correct,
      condition,
      difficulty
    });

    startNextTrial(currentTrial + 1);
  };

  const finishGame = () => {
    setGameState('post');
  };

  const handlePostContinue = () => {
    const items = itemsRef.current;
    const cong = items.filter(i => i.condition === 'congruent' && i.correct);
    const incong = items.filter(i => i.condition === 'incongruent' && i.correct);

    const rtCong = cong.length ? cong.reduce((a, b) => a + b.rt_ms, 0) / cong.length : 400;
    const rtIncong = incong.length ? incong.reduce((a, b) => a + b.rt_ms, 0) / incong.length : 520;

    const interferenceCost = Math.max(0, rtIncong - rtCong);
    const allIncong = items.filter(i => i.condition === 'incongruent');
    const accIncong = allIncong.length ? incong.length / allIncong.length : 0.8;

    const rawScore = Math.round(100.0 * Math.max(0, Math.min(1.0, 1.0 - (interferenceCost / 250.0))) * accIncong);

    const correctItems = items.filter(i => i.correct);
    const meanRt = correctItems.length ? Math.round(correctItems.reduce((a, b) => a + b.rt_ms, 0) / correctItems.length) : 480;
    const errorRate = 1.0 - (correctItems.length / items.length);

    const payload: AssessmentSessionPayload = {
      privacy_mode: 'non_biometric',
      pseudonymous_user_id: userId,
      consent_id: `cst_${userId}`,
      session_id: `ses_${Date.now()}`,
      timestamp: Date.now() / 1000,
      dimension_id: 'selective_attention',
      task_id: 'flanker_arrows',
      task_difficulty: difficulty,
      items,
      raw_score: rawScore,
      mean_rt_ms: meanRt,
      baseline_rt_ms: 450.0,
      error_rate: errorRate,
      isv: 65.0,
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
        <span>{t("games.flanker.name")}</span>
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
          <div className="font-serif text-5xl sm:text-6xl font-bold tracking-widest text-ink select-none py-10 px-8">
            {stimulus}
          </div>
          <p className="text-xs text-muted-ink mb-8">
            {t("games.flanker.cue")}
          </p>

          {/* Big Response Zones */}
          <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
            <button
              type="button"
              onClick={() => handleResponse('left')}
              className="py-5 bg-paper border border-ink hover:bg-ink hover:text-white text-ink text-xl font-bold rounded-sm transition-all active:scale-[0.98] flex flex-col items-center justify-center"
            >
              <span>←</span>
              <span className="text-[11px] font-normal text-muted-ink mt-1">
                {t("common.left_key")} (A)
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleResponse('right')}
              className="py-5 bg-paper border border-ink hover:bg-ink hover:text-white text-ink text-xl font-bold rounded-sm transition-all active:scale-[0.98] flex flex-col items-center justify-center"
            >
              <span>→</span>
              <span className="text-[11px] font-normal text-muted-ink mt-1">
                {t("common.right_key")} (D)
              </span>
            </button>
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
            {t("games.flanker.post_summary")}
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