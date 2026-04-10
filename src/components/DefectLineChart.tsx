"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { DefectRow } from "@/lib/types";
import { useState } from "react";

interface DefectLineChartProps {
  rows: DefectRow[];
  defectTypes: string[];
  colors: Record<string, string>;
}

type ViewMode = "count" | "rate";

interface LineTooltipPayload {
  name: string;
  value: number;
  color: string;
}

function CustomTooltip({
  active, payload, label, viewMode,
}: {
  active?: boolean;
  payload?: LineTooltipPayload[];
  label?: string;
  viewMode: ViewMode;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-sm min-w-36">
      <p className="font-semibold text-gray-700 mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: p.color }} />
            <span className="text-gray-600">{p.name}</span>
          </span>
          <span className="font-medium" style={{ color: p.color }}>
            {viewMode === "rate" ? `${p.value.toFixed(2)}%` : p.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function DefectLineChart({ rows, defectTypes, colors }: DefectLineChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("count");

  const chartData = rows.map((row) => {
    const point: Record<string, string | number> = { date: row.date };
    defectTypes.forEach((t) => {
      if (viewMode === "rate") {
        point[t] = row.total > 0 ? parseFloat(((row.defects[t] / row.total) * 100).toFixed(3)) : 0;
      } else {
        point[t] = row.defects[t] ?? 0;
      }
    });
    return point;
  });

  // x축 라벨 간소화 (날짜가 많으면 일부 생략)
  const tickInterval = Math.max(1, Math.floor(rows.length / 8));

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-700">불량 유형별 추이</h2>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
          <button
            onClick={() => setViewMode("count")}
            className={`px-3 py-1.5 transition-colors ${
              viewMode === "count" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            건수
          </button>
          <button
            onClick={() => setViewMode("rate")}
            className={`px-3 py-1.5 transition-colors ${
              viewMode === "rate" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            불량률(%)
          </button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            interval={tickInterval - 1}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => viewMode === "rate" ? `${v}%` : v.toLocaleString()}
          />
          <Tooltip content={<CustomTooltip viewMode={viewMode} />} />
          <Legend
            formatter={(value: string) => (
              <span className="text-sm text-gray-600">{value}</span>
            )}
          />
          {defectTypes.map((type) => (
            <Line
              key={type}
              type="monotone"
              dataKey={type}
              stroke={colors[type] ?? "#94a3b8"}
              strokeWidth={2}
              dot={{ r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
