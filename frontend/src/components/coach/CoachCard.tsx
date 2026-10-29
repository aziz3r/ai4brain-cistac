'use client';

import React, { useState } from 'react';
import { CoachRecommendationPayload } from '@/types/contracts';
import { Volume2, VolumeX, ShieldCheck, HelpCircle, ArrowRight, Sliders, Check, Sparkles } from 'lucide-react';
import { getTaskName, getDifficultyBadge } from '@/utils/labels';

interface Props {
  recommendation: CoachRecommendationPayload | null;
  totalSessions: number;
  onAction: (action: 'accept' | 'ask_why' | 'challenge' | 'modify', data?: any) => void;
  onLaunchTask: (taskId: string, difficulty: number) => void;
  onStartCalibration?: () => void;
  isOfflineMode?: boolean;
}

export default function CoachCard({
  recommendation,
  totalSessions,
  onAction,
  onLaunchTask,
  onStartCalibration,
  isOfflineMode = true
}: Props) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showCounterfactual, setShowCounterfactual] = useState(false);
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [selectedAltTask, setSelectedAltTask] = useState<string>('');
  const [challengeReason, setChallengeReason] = useState<string>('');

  if (!recommendation) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex items-center justify-center text-slate-500 text-sm">
        Loading coach advice...
      </div>
    );
  }

  const { explanation, motivational_note, task_id, calibrated_difficulty } = recommendation;
  const friendlyTaskName = getTaskName(task_id);
  const diffBadge = getDifficultyBadge(calibrated_difficulty);

  // Layer D Bonus: Web Speech API voice
  const handleSpeak = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const text = `${explanation.plain_language_reason} ${motivational_note}`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const handleAskWhy = () => {
    setShowCounterfactual(true);
    onAction('ask_why', { explanation_opened: true });
  };

  const submitChallenge = () => {
    onAction('challenge', {
      chosen_task: selectedAltTask || task_id,
      has_reason: !!challengeReason.trim(),
      reason_text: challengeReason
    });
    setShowChallengeModal(false);
  };

  // 1. Cold start copy when no sessions have been completed yet
  if (totalSessions === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/50 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
              N
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Nova • Learning Coach
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Personalized guide for everyday thinking growth
              </p>
            </div>
          </div>
          <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> Non-Clinical
          </span>
        </div>

        <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 text-slate-800 dark:text-slate-200 text-sm leading-relaxed">
          <p className="font-semibold text-indigo-900 dark:text-indigo-300 mb-1">
            Welcome! Let&apos;s build your profile first.
          </p>
          <p className="text-slate-600 dark:text-slate-300 text-xs">
            Five short games, about 6 minutes in total. This gives Nova a solid starting estimate across all five functional areas.
          </p>
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-slate-400">
            {isOfflineMode ? 'Coach running in offline mode' : 'AI coach connected'}
          </span>
          {onStartCalibration && (
            <button
              onClick={onStartCalibration}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 flex items-center gap-2 transition"
            >
              <span>Start calibration</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // 2. Normal coach recommendation card
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
            N
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Nova • Learning Coach
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Adaptive feedback based on your recent practice
            </p>
          </div>
        </div>

        {/* Listen Voice button */}
        <button
          onClick={handleSpeak}
          title="Listen with voice synthesis"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs text-slate-700 dark:text-slate-300 font-medium transition"
        >
          {isSpeaking ? (
            <>
              <VolumeX className="w-3.5 h-3.5 text-rose-500" />
              <span>Mute</span>
            </>
          ) : (
            <>
              <Volume2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Listen</span>
            </>
          )}
        </button>
      </div>

      {/* Target exercise display without raw IDs */}
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Recommended practice
            </span>
            <span className="font-bold text-slate-900 dark:text-white text-base">
              {friendlyTaskName}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <span>Difficulty: {diffBadge.label}</span>
              <span className="text-amber-500">{'●'.repeat(diffBadge.dots)}</span>
            </span>
            <span className="text-slate-500 dark:text-slate-400">about 2 min</span>
          </div>
        </div>

        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed pt-1">
          {explanation.plain_language_reason}
        </p>

        {showCounterfactual && explanation.counterfactual && (
          <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-xs text-indigo-700 dark:text-indigo-300">
            <span className="font-semibold">Alternative view:</span> {explanation.counterfactual}
          </div>
        )}
      </div>

      {/* Uncertainty & Motivational quote */}
      <div className="flex flex-col sm:flex-row gap-2.5 text-xs">
        <div className="flex-1 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
          <span className="font-medium text-slate-700 dark:text-slate-300">Estimate reliability:</span>{' '}
          {explanation.uncertainty_note}
        </div>
        <div className="flex-1 p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300 italic flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{motivational_note}</span>
        </div>
      </div>

      {/* Action buttons (feeds Critical Verification V in collaboration score) */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2">
          {!showCounterfactual && (
            <button
              onClick={handleAskWhy}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition"
            >
              <HelpCircle className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Ask why</span>
            </button>
          )}

          <button
            onClick={() => setShowChallengeModal(true)}
            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-500" />
            <span>Challenge choice</span>
          </button>
        </div>

        <button
          onClick={() => {
            onAction('accept', { dwell_time_s: 4.5, explanation_opened: showCounterfactual });
            onLaunchTask(task_id, calibrated_difficulty);
          }}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/25 flex items-center gap-2 transition"
        >
          <span>Play {friendlyTaskName}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Challenge Chooser Modal */}
      {showChallengeModal && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs space-y-3">
          <div className="font-semibold text-amber-900 dark:text-amber-200">
            Tell Nova what you would prefer instead:
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
              Pick another game:
            </label>
            <select
              value={selectedAltTask}
              onChange={(e) => setSelectedAltTask(e.target.value)}
              className="w-full p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
            >
              <option value="">Keep {friendlyTaskName}</option>
              <option value="spatial_n_back">Grid Memory (Memory)</option>
              <option value="flanker_arrows">Arrow Focus (Focus)</option>
              <option value="task_switching_cued">Rule Switch (Flexibility)</option>
              <option value="speed_choice_rt">Quick Reaction (Speed)</option>
              <option value="matrix_reasoning">Pattern Puzzle (Reasoning)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
              Optional reason (helps Nova learn your preference):
            </label>
            <input
              type="text"
              placeholder="e.g. Feeling a bit tired, want something lighter..."
              value={challengeReason}
              onChange={(e) => setChallengeReason(e.target.value)}
              className="w-full p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={() => setShowChallengeModal(false)}
              className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={submitChallenge}
              className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" /> Submit preference
            </button>
          </div>
        </div>
      )}

      {/* Offline indicator footer */}
      {isOfflineMode && (
        <div className="text-[11px] text-slate-400 text-right">
          Coach running in offline mode
        </div>
      )}
    </div>
  );
}
