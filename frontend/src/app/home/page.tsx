"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Header } from "../../components/layout/Header";
import { Footer } from "../../components/layout/Footer";
import { useLanguage } from "../../context/LanguageContext";
import { SkillRangeList, SkillDimensionData } from "../../components/dashboard/SkillRangeList";
import { BrainTwinState, CoachRecommendationPayload, AssessmentSessionPayload } from "@/types/contracts";

import { GameBriefing } from "../../components/games/GameBriefing";
import NBackGame from "../../components/games/NBackGame";
import FlankerGame from "../../components/games/FlankerGame";
import TaskSwitchingGame from "../../components/games/TaskSwitchingGame";
import SpeedRTGame from "../../components/games/SpeedRTGame";
import MatrixGame from "../../components/games/MatrixGame";

const API_BASE = "http://localhost:8000";

const DEFAULT_DIMENSIONS: SkillDimensionData[] = [
  { id: "working_memory", nameKey: "working_memory", mu: 50.0, sigma: 25.0, session_count: 0 },
  { id: "inhibitory_control", nameKey: "inhibitory_control", mu: 50.0, sigma: 25.0, session_count: 0 },
  { id: "cognitive_flexibility", nameKey: "cognitive_flexibility", mu: 50.0, sigma: 25.0, session_count: 0 },
  { id: "processing_speed", nameKey: "processing_speed", mu: 50.0, sigma: 25.0, session_count: 0 },
  { id: "inductive_reasoning", nameKey: "inductive_reasoning", mu: 50.0, sigma: 25.0, session_count: 0 },
];

function HomeContent() {
  const { t, language } = useLanguage();
  const searchParams = useSearchParams();
  const isForcedNew = searchParams.get("new") === "true";

  const [userId, setUserId] = useState<string>("cistac_user_01");
  const [brainTwin, setBrainTwin] = useState<BrainTwinState | null>(null);
  const [recommendation, setRecommendation] = useState<CoachRecommendationPayload | null>(null);
  const [activeTask, setActiveTask] = useState<{
    gameKey: "nback_spatial" | "flanker" | "task_switching" | "choice_rt" | "matrix_reasoning";
    skillKey: string;
    difficulty: number;
  } | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [showExplanation, setShowExplanation] = useState<boolean>(false);

  useEffect(() => {
    const stored = localStorage.getItem("ai4brain_user_id") || "cistac_user_01";
    setUserId(stored);
    if (!isForcedNew) {
      fetchData(stored);
    }
  }, [isForcedNew, language]);

  const fetchData = async (uid: string) => {
    try {
      const [resTwin, resCoach] = await Promise.all([
        fetch(`${API_BASE}/brain-twin/${uid}`),
        fetch(`${API_BASE}/coach/recommendation/${uid}?language=${language}`)
      ]);
      if (resTwin.ok) setBrainTwin(await resTwin.json());
      if (resCoach.ok) setRecommendation(await resCoach.json());
    } catch {
      // Fallback
    }
  };

  const handleAssessmentComplete = async (payload: AssessmentSessionPayload) => {
    setIsPlaying(false);
    setActiveTask(null);

    try {
      await fetch(`${API_BASE}/assessment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      fetchData(userId);
    } catch {
      // Fallback
    }
  };

  const totalSessions = (!isForcedNew && brainTwin)
    ? Object.values(brainTwin.dimensions).reduce((acc, d) => acc + d.session_count, 0)
    : 0;

  const isNewUser = totalSessions === 0;

  const dimensionsData: SkillDimensionData[] = brainTwin && !isForcedNew
    ? Object.entries(brainTwin.dimensions).map(([key, val]: [string, any]) => ({
        id: key,
        nameKey: key,
        mu: val.mu,
        sigma: val.sigma,
        session_count: val.session_count,
      }))
    : DEFAULT_DIMENSIONS;

  const launchRecommendedTask = () => {
    const taskId = recommendation?.task_id || "spatial_n_back";
    let gameKey: any = "nback_spatial";
    let skillKey = "working_memory";

    if (taskId.includes("flanker")) {
      gameKey = "flanker";
      skillKey = "inhibitory_control";
    } else if (taskId.includes("switch")) {
      gameKey = "task_switching";
      skillKey = "cognitive_flexibility";
    } else if (taskId.includes("speed") || taskId.includes("choice")) {
      gameKey = "choice_rt";
      skillKey = "processing_speed";
    } else if (taskId.includes("matrix")) {
      gameKey = "matrix_reasoning";
      skillKey = "inductive_reasoning";
    }

    setActiveTask({
      gameKey,
      skillKey,
      difficulty: recommendation?.calibrated_difficulty || 1.0
    });
    setIsPlaying(false); // Show briefing first!
  };

  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink">
      <Header />

      {/* Game Modal / Active Screen */}
      {activeTask && (
        <div className="fixed inset-0 z-50 bg-paper/95 backdrop-blur-sm overflow-y-auto flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-paper border border-hairline rounded-sm">
            {!isPlaying ? (
              <GameBriefing
                gameKey={activeTask.gameKey}
                skillKey={activeTask.skillKey}
                onStartGame={() => setIsPlaying(true)}
                onQuit={() => setActiveTask(null)}
              />
            ) : (
              <>
                {activeTask.gameKey === "nback_spatial" && (
                  <NBackGame
                    difficulty={activeTask.difficulty}
                    userId={userId}
                    onComplete={handleAssessmentComplete}
                    onCancel={() => setActiveTask(null)}
                  />
                )}
                {activeTask.gameKey === "flanker" && (
                  <FlankerGame
                    difficulty={activeTask.difficulty}
                    userId={userId}
                    onComplete={handleAssessmentComplete}
                    onCancel={() => setActiveTask(null)}
                  />
                )}
                {activeTask.gameKey === "task_switching" && (
                  <TaskSwitchingGame
                    difficulty={activeTask.difficulty}
                    userId={userId}
                    onComplete={handleAssessmentComplete}
                    onCancel={() => setActiveTask(null)}
                  />
                )}
                {activeTask.gameKey === "choice_rt" && (
                  <SpeedRTGame
                    difficulty={activeTask.difficulty}
                    userId={userId}
                    onComplete={handleAssessmentComplete}
                    onCancel={() => setActiveTask(null)}
                  />
                )}
                {activeTask.gameKey === "matrix_reasoning" && (
                  <MatrixGame
                    difficulty={activeTask.difficulty}
                    userId={userId}
                    onComplete={handleAssessmentComplete}
                    onCancel={() => setActiveTask(null)}
                  />
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Main Page Body */}
      <main className="flex-1 max-w-4xl mx-auto px-6 py-12 sm:py-16 space-y-16">
        {isNewUser ? (
          /* State A: Fresh User */
          <div className="space-y-12">
            <section className="space-y-6 max-w-2xl">
              <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-ink">
                {t("home.welcome_title")}
              </h1>
              <p className="text-lg text-muted-ink leading-relaxed">
                {t("coach.first_run")}
              </p>

              <div>
                <Link
                  href="/calibration"
                  className="inline-flex items-center justify-center px-8 py-4 bg-terracotta text-white font-medium rounded-sm hover:bg-terracotta/90 transition-colors shadow-sm text-base"
                >
                  {t("coach.cta_start")}
                </Link>
              </div>
            </section>

            <section className="pt-8 hairline-t space-y-6">
              <h2 className="font-serif text-xl font-bold text-ink">
                {t("home.pending_skills_title")}
              </h2>
              <SkillRangeList dimensions={dimensionsData} />
            </section>
          </div>
        ) : (
          /* State B: Returning User */
          <div className="space-y-14">
            {/* Coach Next 90 Seconds Card */}
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-terracotta">
                    {t("coach.name")}
                  </span>
                  <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-ink mt-1">
                    {t("coach.next_title")}
                  </h1>
                </div>
                <div className="text-right">
                  <div className="font-serif text-2xl font-bold text-ink">{totalSessions}</div>
                  <div className="text-xs text-muted-ink">{t("home.sessions_completed")}</div>
                </div>
              </div>

              {/* Coach Reason Text */}
              <div className="p-6 bg-teal/10 rounded-sm border-l-2 border-teal space-y-4">
                <p className="text-base text-ink leading-relaxed font-sans">
                  {recommendation?.explanation?.plain_language_reason ||
                    t("home.default_coach_reason")}
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={launchRecommendedTask}
                    className="px-6 py-2.5 bg-terracotta text-white text-sm font-medium rounded-sm hover:bg-terracotta/90 transition-colors shadow-sm"
                  >
                    {t("home.launch_exercise")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowExplanation(!showExplanation)}
                    className="px-4 py-2.5 border border-hairline text-ink text-sm font-medium rounded-sm hover:border-ink/40 transition-colors"
                  >
                    {showExplanation ? t("home.hide_details") : t("coach.ask_why")}
                  </button>
                </div>

                {showExplanation && recommendation && (
                  <div className="pt-4 mt-2 border-t border-teal/20 text-xs space-y-2 text-muted-ink font-sans">
                    <p>
                      <strong className="text-ink">{t("home.uncertainty_label")}</strong>{" "}
                      {recommendation.explanation.uncertainty_note}
                    </p>
                    {recommendation.explanation.counterfactual && (
                      <p>
                        <strong className="text-ink">{t("home.counterfactual_label")}</strong>{" "}
                        {recommendation.explanation.counterfactual}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* Current Range Lines */}
            <section className="space-y-6 pt-4 hairline-t">
              <div className="flex items-center justify-between pb-2">
                <h2 className="font-serif text-2xl font-bold text-ink">
                  {t("home.current_profile_title")}
                </h2>
                <Link
                  href="/profile"
                  className="text-xs text-muted-ink hover:text-ink underline transition-colors"
                >
                  {t("home.view_details_link")}
                </Link>
              </div>

              <SkillRangeList dimensions={dimensionsData} />
            </section>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-paper" />}>
      <HomeContent />
    </Suspense>
  );
}
