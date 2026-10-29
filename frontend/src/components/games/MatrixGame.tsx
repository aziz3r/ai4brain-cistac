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

interface MatrixItem {
  id: number;
  grid: string[];
  options: string[];
  correctIndex: number;
  ruleDescription: string;
}

export default function MatrixGame({ difficulty, userId, onComplete, onCancel, isPractice = false }: Props) {
  const { t } = useLanguage();
  const totalItems = isPractice ? 3 : 6;
  const timeLimitMs = Math.max(12000, 25000 - difficulty * 5000);

  const [gameState, setGameState] = useState<'countdown' | 'playing' | 'post'>('countdown');
  const [countdown, setCountdown] = useState<number>(3);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [items, setItems] = useState<MatrixItem[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  const resultsRef = useRef<ItemResult[]>([]);
  const itemStartRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Generate geometric items
  useEffect(() => {
    const generated: MatrixItem[] = [
      {
        id: 1,
        grid: ['●', '▲', '●', '?'],
        options: ['▲', '■', '◆', '●'],
        correctIndex: 0,
        ruleDescription: 'horizontal_alternation'
      },
      {
        id: 2,
        grid: ['■', '■', '◆', '?'],
        options: ['●', '◆', '▲', '★'],
        correctIndex: 1,
        ruleDescription: 'row_shape_repetition'
      },
      {
        id: 3,
        grid: ['▲', '◆', '◆', '?'],
        options: ['▲', '■', '●', '★'],
        correctIndex: 0,
        ruleDescription: 'diagonal_symmetry'
      },
      {
        id: 4,
        grid: ['●', '◆', '▲', '?'],
        options: ['■', '●', '◆', '▲'],
        correctIndex: 0,
        ruleDescription: 'polygon_progression'
      },
      {
        id: 5,
        grid: ['■', '▲', '●', '?'],
        options: ['◆', '▲', '●', '■'],
        correctIndex: 0,
        ruleDescription: 'cyclic_permutation'
      },
      {
        id: 6,
        grid: ['◆', '●', '▲', '?'],
        options: ['■', '◆', '●', '★'],
        correctIndex: 0,
        ruleDescription: 'combined_rule'
      }
    ];
    setItems(generated.slice(0, totalItems));
  }, [totalItems]);

  // 3-2-1 Countdown
  useEffect(() => {
    if (gameState !== 'countdown') return;
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 800);
      return () => clearTimeout(timer);
    } else {
      setGameState('playing');
      showItem(0);
    }
  }, [gameState, countdown]);

  const showItem = (idx: number) => {
    if (idx >= totalItems) {
      finishGame();
      return;
    }
    setCurrentIndex(idx);
    setSelectedOption(null);
    itemStartRef.current = performance.now();

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      recordAnswer(-1, timeLimitMs);
      showItem(idx + 1);
    }, timeLimitMs);
  };

  const handleOptionClick = (optIdx: number) => {
    if (selectedOption !== null) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    setSelectedOption(optIdx);
    const rt = Math.round(performance.now() - itemStartRef.current);
    recordAnswer(optIdx, rt);

    setTimeout(() => {
      showItem(currentIndex + 1);
    }, 400);
  };

  const recordAnswer = (optIdx: number, rt: number) => {
    const cur = items[currentIndex];
    const isCorrect = optIdx === cur?.correctIndex;
    resultsRef.current.push({
      item_id: `matrix_${currentIndex + 1}`,
      rt_ms: rt,
      correct: isCorrect,
      difficulty
    });
  };

  const finishGame = () => {
    setGameState('post');
  };

  const handlePostContinue = () => {
    const res = resultsRef.current;
    const correctCount = res.filter(r => r.correct).length;
    const acc = res.length ? correctCount / res.length : 0.5;

    // Guessing correction: 100 * clip((p - 1/4) / (3/4))
    const correctedScore = Math.max(0, Math.min(1.0, (acc - 0.25) / 0.75));
    const rawScore = Math.round(100.0 * correctedScore);

    const rts = res.map(r => r.rt_ms);
    const meanRt = rts.length ? Math.round(rts.reduce((a, b) => a + b, 0) / rts.length) : 8000;
    const errorRate = 1.0 - acc;

    const payload: AssessmentSessionPayload = {
      privacy_mode: 'non_biometric',
      pseudonymous_user_id: userId,
      consent_id: `cst_${userId}`,
      session_id: `ses_${Date.now()}`,
      timestamp: Date.now() / 1000,
      dimension_id: 'inductive_reasoning',
      task_id: 'matrix_reasoning',
      task_difficulty: difficulty,
      items: res,
      raw_score: rawScore,
      mean_rt_ms: meanRt,
      baseline_rt_ms: 12000.0,
      error_rate: errorRate,
      isv: 1200.0,
      behavior_indicators: {}
    };

    onComplete(payload);
  };

  const currentItem = items[currentIndex];

  return (
    <div className="relative min-h-[500px] flex flex-col justify-between bg-paper p-6">
      {/* Thin top progress hairline */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-hairline">
        {gameState === 'playing' && (
          <div
            className="h-full bg-terracotta transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / totalItems) * 100}%` }}
          />
        )}
      </div>

      {/* Header bar during play */}
      <div className="flex items-center justify-between text-xs text-muted-ink pt-2">
        <span>{t("games.matrix_reasoning.name")} · Puzzle {currentIndex + 1}/{totalItems}</span>
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
      {gameState === 'playing' && currentItem && (
        <div className="flex-1 flex flex-col items-center justify-center my-6">
          <p className="text-xs text-muted-ink mb-6">
            {t("games.matrix_reasoning.cue")}
          </p>

          {/* 2x2 Matrix */}
          <div className="grid grid-cols-2 gap-3 w-56 h-56 p-3 bg-paper border border-hairline rounded-sm mb-8">
            {currentItem.grid.map((cell, idx) => (
              <div
                key={idx}
                className={`flex items-center justify-center font-serif text-3xl border rounded-sm ${
                  cell === '?'
                    ? 'border-dashed border-teal text-teal font-bold bg-teal/5'
                    : 'border-hairline text-ink bg-paper'
                }`}
              >
                {cell}
              </div>
            ))}
          </div>

          {/* Big Options Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-md">
            {currentItem.options.map((opt, optIdx) => {
              const isSelected = selectedOption === optIdx;
              return (
                <button
                  key={optIdx}
                  type="button"
                  onClick={() => handleOptionClick(optIdx)}
                  className={`h-16 rounded-sm border transition-all font-serif text-2xl flex items-center justify-center ${
                    isSelected
                      ? 'bg-teal text-white border-teal'
                      : 'bg-paper border-ink hover:bg-ink hover:text-white text-ink active:scale-95'
                  }`}
                >
                  {opt}
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
            {t("games.matrix_reasoning.post_summary")}
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