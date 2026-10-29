'use client';

import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { BrainTwinState, CognitiveDimensionId } from '@/types/contracts';
import { getDimensionLabel, formatScore, formatRange } from '@/utils/labels';
import { PlayCircle, TrendingUp } from 'lucide-react';

interface Props {
  state: BrainTwinState;
  onPlayFirstGame?: (dimId: CognitiveDimensionId) => void;
}

export default function BrainTwinHistoryChart({ state, onPlayFirstGame }: Props) {
  const [selectedDim, setSelectedDim] = useState<CognitiveDimensionId>('working_memory');
  const dimState = state.dimensions[selectedDim];

  const chartData = (dimState?.history || []).map((h) => {
    const ci_low = Math.max(0, Math.round((h.mu_post - 1.96 * h.sigma_post)));
    const ci_high = Math.min(100, Math.round((h.mu_post + 1.96 * h.sigma_post)));
    return {
      session: `Game ${h.session_index}`,
      mu: Math.round(h.mu_post),
      raw: Math.round(h.raw_score),
      ci_low,
      ci_high,
      sigma: h.sigma_post,
      outlier: h.outlier_damped
    };
  });

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col h-[380px]">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div>
          <h3 className="text-sm font-semibold tracking-wide text-slate-900 dark:text-white">
            Skill History & Range
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Shaded region shows how your estimate range narrows with practice.
          </p>
        </div>

        {/* Friendly dimension pills */}
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs">
          {Object.entries(state.dimensions).map(([id, d]) => (
            <button
              key={id}
              onClick={() => setSelectedDim(id as CognitiveDimensionId)}
              className={`px-2.5 py-1 rounded-md font-medium transition ${
                selectedDim === id
                  ? 'bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              {getDimensionLabel(id)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 w-full min-h-0">
        {chartData.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700">
            <TrendingUp className="w-10 h-10 text-indigo-400 dark:text-indigo-500 mb-2" />
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              No practice games recorded for {getDimensionLabel(selectedDim)} yet
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
              Complete a 60–90 second training game to generate your first estimate range.
            </p>
            {onPlayFirstGame && (
              <button
                onClick={() => onPlayFirstGame(selectedDim)}
                className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md shadow-indigo-600/20 flex items-center gap-2 transition"
              >
                <PlayCircle className="w-4 h-4" /> Play your first game
              </button>
            )}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="historyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-800" />
              <XAxis dataKey="session" stroke="#94a3b8" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} stroke="#94a3b8" tick={{ fontSize: 11 }} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white border border-slate-700 p-2.5 rounded-xl shadow-xl text-xs space-y-1">
                        <div className="font-bold text-indigo-300">{d.session}</div>
                        <div>Estimate: <span className="font-semibold text-white">{d.mu} / 100</span></div>
                        <div className="text-slate-300">Game score: {d.raw} / 100</div>
                        <div className="text-slate-400">Range: {formatRange(d.ci_low, d.ci_high)}</div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="ci_high"
                stroke="transparent"
                fill="url(#historyGradient)"
              />
              <Area
                type="monotone"
                dataKey="ci_low"
                stroke="transparent"
                fill="#ffffff"
                className="dark:fill-slate-900"
              />
              <Line
                type="monotone"
                dataKey="mu"
                stroke="#4f46e5"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#4f46e5' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
