'use client';

import React from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import { BrainTwinState } from '@/types/contracts';
import { getDimensionLabel, getConfidenceBadge, formatRange } from '@/utils/labels';

interface Props {
  state: BrainTwinState;
}

export default function RadarChartComponent({ state }: Props) {
  const data = Object.values(state.dimensions).map((dim) => {
    const isMeasured = dim.session_count > 0;
    const lower = isMeasured ? Math.max(0, Math.round(dim.ci_95_lower)) : 0;
    const upper = isMeasured ? Math.min(100, Math.round(dim.ci_95_upper)) : 0;
    const badge = getConfidenceBadge(dim.sigma);

    return {
      id: dim.dimension_id,
      dimension: getDimensionLabel(dim.dimension_id),
      isMeasured,
      capacity: isMeasured ? Math.round(dim.mu) : 0,
      bandUpper: upper,
      bandLower: lower,
      rangeText: isMeasured ? formatRange(lower, upper) : 'Not measured yet',
      badgeText: isMeasured ? badge.label : 'Pending',
      sessionCount: dim.session_count
    };
  });

  const totalSessions = Object.values(state.dimensions).reduce((acc, d) => acc + d.session_count, 0);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col h-[380px]">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold tracking-wide text-slate-900 dark:text-white">
          Thinking Profile
        </h3>
        <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800">
          {totalSessions === 0 ? 'Calibration Needed' : 'Estimates'}
        </span>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
        Five functional skills. Shaded ring shows estimate range.
      </p>

      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
            <PolarGrid stroke="#cbd5e1" className="dark:stroke-slate-700" />
            <PolarAngleAxis
              dataKey="dimension"
              stroke="#64748b"
              tick={{ fontSize: 13, fontWeight: 600 }}
            />
            <PolarRadiusAxis
              angle={30}
              domain={[0, 100]}
              stroke="#94a3b8"
              tick={{ fontSize: 10 }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload;
                  return (
                    <div className="bg-slate-900 text-white border border-slate-700 p-3 rounded-xl shadow-xl text-xs space-y-1">
                      <div className="font-bold text-indigo-300 text-sm">{d.dimension}</div>
                      {d.isMeasured ? (
                        <>
                          <div className="text-slate-200">
                            Estimate: <span className="font-semibold text-white">{d.rangeText}</span>
                          </div>
                          <div className="text-slate-400">
                            Confidence: <span className="text-emerald-400">{d.badgeText}</span>
                          </div>
                          <div className="text-slate-400">
                            Sessions completed: {d.sessionCount}
                          </div>
                        </>
                      ) : (
                        <div className="text-amber-400 italic">Not measured yet</div>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
            {/* Shaded confidence ring (upper bound) */}
            <Radar
              name="Confidence Range"
              dataKey="bandUpper"
              stroke="#818cf8"
              strokeWidth={1}
              strokeDasharray="3 3"
              fill="#818cf8"
              fillOpacity={0.25}
            />
            {/* Estimate line */}
            <Radar
              name="Estimate"
              dataKey="capacity"
              stroke="#4f46e5"
              strokeWidth={2.5}
              fill="#4f46e5"
              fillOpacity={0.35}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
