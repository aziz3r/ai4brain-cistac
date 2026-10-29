"use client";

import React from "react";
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import { ProjectionPoint } from "@/types/contracts";
import { useLanguage } from "../../context/LanguageContext";
import { HelpTooltip } from "../ui/HelpTooltip";

interface Props {
  projectionCone?: ProjectionPoint[];
}

export default function ProjectionConeChart({ projectionCone = [] }: Props) {
  const { t, formatNumber } = useLanguage();

  const chartData = (projectionCone.length ? projectionCone : [
    { step_ahead: 1, expected_mu: 70, ci_lower: 58, ci_upper: 82, uncertainty_sigma: 6 },
    { step_ahead: 2, expected_mu: 74, ci_lower: 60, ci_upper: 88, uncertainty_sigma: 7 },
    { step_ahead: 3, expected_mu: 77, ci_lower: 61, ci_upper: 93, uncertainty_sigma: 8 },
    { step_ahead: 4, expected_mu: 79, ci_lower: 62, ci_upper: 96, uncertainty_sigma: 9 },
    { step_ahead: 5, expected_mu: 81, ci_lower: 62, ci_upper: 99, uncertainty_sigma: 10 },
  ]).map((p) => ({
    step: `+${p.step_ahead} ${t("projection.week_unit")}`,
    expected: Math.round(p.expected_mu),
    ci_low: Math.round(p.ci_lower),
    ci_high: Math.round(p.ci_upper),
    sigma: p.uncertainty_sigma,
  }));

  return (
    <div className="space-y-4 pt-8 hairline-t">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="font-serif text-2xl font-bold text-ink">
            {t("stats.projection_title")}
          </h2>
          <HelpTooltip type="projection" />
        </div>
        <p className="text-sm text-muted-ink mt-1 max-w-xl leading-relaxed">
          {t("stats.projection_body")}
        </p>
      </div>

      <div className="w-full h-64 pt-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="editorialCone" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1F5E5A" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#1F5E5A" stopOpacity={0.08} />
              </linearGradient>
            </defs>
            <XAxis dataKey="step" stroke="#5C6B6E" tick={{ fontSize: 12, fill: "#5C6B6E" }} tickLine={false} />
            <YAxis domain={[0, 100]} stroke="#5C6B6E" tick={{ fontSize: 12, fill: "#5C6B6E" }} tickLine={false} />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload;
                  return (
                    <div className="bg-paper border border-hairline p-3 rounded-sm shadow-md text-xs space-y-1">
                      <div className="font-serif font-bold text-ink">{d.step}</div>
                      <div className="text-teal font-medium">
                        {t("projection.trajectory_label")} : {formatNumber(d.expected)} / 100
                      </div>
                      <div className="text-muted-ink">
                        {t("projection.forecast_range_label")} : [{formatNumber(d.ci_low)} – {formatNumber(d.ci_high)}]
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            {/* Shaded widening uncertainty band */}
            <Area
              type="monotone"
              dataKey="ci_high"
              stroke="transparent"
              fill="url(#editorialCone)"
            />
            <Area
              type="monotone"
              dataKey="ci_low"
              stroke="transparent"
              fill="#F5F0E6"
            />
            {/* Rising growth path line */}
            <Line
              type="monotone"
              dataKey="expected"
              stroke="#1F5E5A"
              strokeWidth={2}
              dot={{ r: 4, fill: "#1F5E5A", stroke: "#F5F0E6", strokeWidth: 1.5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}