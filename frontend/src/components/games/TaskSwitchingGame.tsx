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

export default function TaskSwitchingGame({ difficulty, userId, onComplete, onCancel, isPractice = false }: Props) {
  const { t } = useLanguage();
  const totalTrials = isPractice ? 10 : 36;
  const ctiMs = Math.max(150, 1000 - (difficulty - 0.5) * 550);

  const [gameState, setGameState] = useState<'countdown' | 'cue' | 'target' | 'post'>('countdown');
  const [countdown, setCountdown] = useState<number>(3);
  const [currentTrial, setCurrentTrial] = useState(0);
  const [currentTask, setCurrentTask] = useState<'parity' | 'magnitude'>('parity');
  const [currentDigit, setCurrentDigit] = useState<number>(3);
  const [isSwitch, setIsSwitch] = useState<boolean>(false);

  const prevTaskRef = useRef<'parity' | 'magnitude'>('parity');
  const itemsRef = useRef<ItemResult[]>([]);
  const trialStartRef = useRef<number>(0);

  // 3-2-1 Countdown
  useEffect(() => {
    if (gameState !== 'countdown') return;
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 800);
      return () => clearTimeout(timer);
    } else {
      startNextTrial(0);
    }
  }, [gameState, countdown]);

  const startNextTrial = (trialIdx: number) => {
    if (trialIdx >= totalTrials) {
      finishGame();
      return;
    }
    setCurrentTrial(trialIdx);

    const nextTask = Math.random() < 0.5 ? 'parity' : 'magnitude';
    const switched = trialIdx > 0 && nextTask !== prevTaskRef.current;
    setIsSwitch(switched);
    setCurrentTask(nextTask);

    const digits = [1, 2, 3, 4, 6, 7, 8, 9];
    const nextDigit = digits[Math.floor(Math.random() * digits.length)];
    setCurrentDigit(nextDigit);

    setGameState('cue');
    setTimeout(() => {
      setGameState('target');
      trialStartRef.current = performance.now();
    }, ctiMs);
  };

  const handleResponse = (choice: 'left' | 'right') => {
    if (gameState !== 'target') return;
    const rt = Math.round(performance.now() - trialStartRef.current);

    let isCorrect = false;
    if (currentTask === 'parity') {
      // Left = Odd, Right = Even
      const isOdd = currentDigit % 2 !== 0;
      isCorrect = (choice === 'left' && isOdd) || (choice === 'right' && !isOdd);
    } else {
      // Left = < 5, Right = > 5
      const isSmaller = currentDigit < 5;
      isCorrect = (choice === 'left' && isSmaller) || (choice === 'right' && !isSmaller);
    }

    itemsRef.current.push({
      item_id: `switch_${currentTrial + 1}`,
      rt_ms: rt,
      correct: isCorrect,
      condition: isSwitch ? 'switch' : 'repeat',
      difficulty
    });

    prevTaskRef.current = currentTask;
    startNextTrial(currentTrial + 1);
  };

  const finishGame = () => {
    setGameState('post');
  };

  const handlePostContinue = () => {
    const items = itemsRef.current;
    const repeatTrials = items.filter(i => i.condition === 'repeat' && i.correct);
    const switchTrials = items.filter(i => i.condition === 'switch' && i.correct);

    const rtRepeat = repeatTrials.length ? repeatTrials.reduce((a, b) => a + b.rt_ms, 0) / repeatTrials.length : 500;
    const rtSwitch = switchTrials.length ? switchTrials.reduce((a, b) => a + b.rt_ms, 0) / switchTrials.length : 650;

    const switchCostMs = Math.max(0, rtSwitch - rtRepeat);
    const scRel = rtRepeat > 0 ? switchCostMs / rtRepeat : 0.3;
    const allSwitches = items.filter(i => i.condition === 'switch');
    const accSwitch = allSwitches.length ? switchTrials.length / allSwitches.length : 0.8;

    const rawScore = Math.round(100.0 * Math.max(0, Math.min(1.0, 1.0 - (scRel / 0.6))) * accSwitch);

    const correctItems = items.filter(i => i.correct);
    const meanRt = correctItems.length ? Math.round(correctItems.reduce((a, b) => a + b.rt_ms, 0) / correctItems.length) : 580;
    const errorRate = 1.0 - (correctItems.length / items.length);

    const payload: AssessmentSessionPayload = {
      privacy_mode: 'non_biometric',
      pseudonymous_user_id: userId,
      consent_id: `cst_${userId}`,
      session_id: `ses_${Date.now()}`,
      timestamp: Date.now() / 1000,
      dimension_id: 'cognitive_flexibility',
      task_id: 'task_switching_cued',
      task_difficulty: difficulty,
      items,
      raw_score: rawScore,
      mean_rt_ms: meanRt,
      baseline_rt_ms: 550.0,
      error_rate: errorRate,
      isv: 70.0,
      behavior_indicators: {}
    };

    onComplete(payload);
  };

  return (
    <div className="relative min-h-[500px] flex flex-col justify-between bg-paper p-6">
      {/* Thin top progress hairline */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-hairline">
        {(gameState === 'cue' || gameState === 'target') && (
          <div
            className="h-full bg-terracotta transition-all duration-300"
            style={{ width: `${((currentTrial + 1) / totalTrials) * 100}%` }}
          />
        )}
      </div>

      {/* Header bar during play */}
      <div className="flex items-center justify-between text-xs text-muted-ink pt-2">
        <span>{t("games.task_switching.name")}</span>
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
      {(gameState === 'cue' || gameState === 'target') && (
        <div className="flex-1 flex flex-col items-center justify-center my-6">
          {/* Cue and Digit */}
          <div
            className={`w-36 h-36 border-2 transition-all flex items-center justify-center ${
              currentTask === 'parity'
                ? 'rounded-full border-teal bg-teal/5'
                : 'rounded-sm border-terracotta bg-terracotta/5'
            }`}
          >
            {gameState === 'target' ? (
              <span className="font-serif text-6xl font-bold text-ink">{currentDigit}</span>
            ) : (
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-ink">
                {currentTask === 'parity' ? t("games.task_switching.cue_parity_short") : t("games.task_switching.cue_magnitude_short")}
              </span>
            )}
          </div>

          <div className="mt-4 text-xs font-medium text-muted-ink">
            {currentTask === 'parity'
              ? t("games.task_switching.cue_parity")
              : t("games.task_switching.cue_magnitude")}
          </div>

          {/* Big Response Zones */}
          <div className="grid grid-cols-2 gap-4 w-full max-w-sm mt-8">
            <button
              type="button"
              onClick={() => handleResponse('left')}
              className="py-5 bg-paper border border-ink hover:bg-ink hover:text-white text-ink text-base font-medium rounded-sm transition-all active:scale-[0.98] flex flex-col items-center justify-center"
            >
              <span>{currentTask === 'parity' ? t("common.odd") : t("common.smaller_5")}</span>
              <span className="text-[11px] font-normal text-muted-ink mt-1">
                {t("common.left_key")}
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleResponse('right')}
              className="py-5 bg-paper border border-ink hover:bg-ink hover:text-white text-ink text-base font-medium rounded-sm transition-all active:scale-[0.98] flex flex-col items-center justify-center"
            >
              <span>{currentTask === 'parity' ? t("common.even") : t("common.larger_5")}</span>
              <span className="text-[11px] font-normal text-muted-ink mt-1">
                {t("common.right_key")}
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
            {t("games.task_switching.post_summary")}
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