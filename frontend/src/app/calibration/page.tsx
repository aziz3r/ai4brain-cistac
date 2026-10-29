"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "../../components/layout/Header";
import { useLanguage } from "../../context/LanguageContext";
import { AssessmentSessionPayload } from "@/types/contracts";

import { GameBriefing } from "../../components/games/GameBriefing";
import NBackGame from "../../components/games/NBackGame";
import FlankerGame from "../../components/games/FlankerGame";
import TaskSwitchingGame from "../../components/games/TaskSwitchingGame";
import SpeedRTGame from "../../components/games/SpeedRTGame";
import MatrixGame from "../../components/games/MatrixGame";

interface CalibrationTaskConfig {
  id: string;
  gameKey: "nback_spatial" | "flanker" | "task_switching" | "choice_rt" | "matrix_reasoning";
  skillKey: string;
}

const CALIBRATION_TASKS: CalibrationTaskConfig[] = [
  { id: "spatial_n_back", gameKey: "nback_spatial", skillKey: "working_memory" },
  { id: "flanker_arrows", gameKey: "flanker", skillKey: "inhibitory_control" },
  { id: "task_switching_cued", gameKey: "task_switching", skillKey: "cognitive_flexibility" },
  { id: "speed_choice_rt", gameKey: "choice_rt", skillKey: "processing_speed" },
  { id: "matrix_reasoning", gameKey: "matrix_reasoning", skillKey: "inductive_reasoning" },
];

export default function CalibrationPage() {
  const router = useRouter();
  const { t } = useLanguage();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewState, setViewState] = useState<"briefing" | "playing">("briefing");
  const [isPractice, setIsPractice] = useState(false);
  const [userId, setUserId] = useState<string>("cistac_user_01");

  useEffect(() => {
    const stored = localStorage.getItem("ai4brain_user_id");
    if (stored) setUserId(stored);
  }, []);

  const currentTask = CALIBRATION_TASKS[currentIndex];

  const handleStartGame = (practice: boolean) => {
    setIsPractice(practice);
    setViewState("playing");
  };

  const handleGameComplete = async (payload: AssessmentSessionPayload) => {
    try {
      await fetch("http://localhost:8000/assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {
      // Local fallback
    }

    const nextIdx = currentIndex + 1;
    if (nextIdx >= CALIBRATION_TASKS.length) {
      router.push("/results");
    } else {
      setCurrentIndex(nextIdx);
      setViewState("briefing");
    }
  };

  const handleSkip = () => {
    const nextIdx = currentIndex + 1;
    if (nextIdx >= CALIBRATION_TASKS.length) {
      router.push("/results");
    } else {
      setCurrentIndex(nextIdx);
      setViewState("briefing");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto px-6 py-8 flex flex-col justify-center">
        {/* Progress Header */}
        <div className="mb-6 flex items-center justify-between text-xs text-muted-ink pb-3 hairline-b">
          <span>
            {t("calibration.progress", { current: currentIndex + 1, total: CALIBRATION_TASKS.length })}
          </span>
          <button
            type="button"
            onClick={handleSkip}
            className="hover:text-ink underline transition-colors"
          >
            {t("common.skip")}
          </button>
        </div>

        {/* View Mode: Briefing vs Game */}
        <div className="bg-paper border border-hairline rounded-sm">
          {viewState === "briefing" ? (
            <GameBriefing
              gameKey={currentTask.gameKey}
              skillKey={currentTask.skillKey}
              onStartGame={handleStartGame}
              onQuit={() => router.push("/home")}
            />
          ) : (
            <>
              {currentTask.gameKey === "nback_spatial" && (
                <NBackGame
                  difficulty={1.0}
                  userId={userId}
                  isPractice={isPractice}
                  onComplete={handleGameComplete}
                  onCancel={() => setViewState("briefing")}
                />
              )}
              {currentTask.gameKey === "flanker" && (
                <FlankerGame
                  difficulty={1.0}
                  userId={userId}
                  isPractice={isPractice}
                  onComplete={handleGameComplete}
                  onCancel={() => setViewState("briefing")}
                />
              )}
              {currentTask.gameKey === "task_switching" && (
                <TaskSwitchingGame
                  difficulty={1.0}
                  userId={userId}
                  isPractice={isPractice}
                  onComplete={handleGameComplete}
                  onCancel={() => setViewState("briefing")}
                />
              )}
              {currentTask.gameKey === "choice_rt" && (
                <SpeedRTGame
                  difficulty={1.0}
                  userId={userId}
                  isPractice={isPractice}
                  onComplete={handleGameComplete}
                  onCancel={() => setViewState("briefing")}
                />
              )}
              {currentTask.gameKey === "matrix_reasoning" && (
                <MatrixGame
                  difficulty={1.0}
                  userId={userId}
                  isPractice={isPractice}
                  onComplete={handleGameComplete}
                  onCancel={() => setViewState("briefing")}
                />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
