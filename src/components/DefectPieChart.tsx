"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { PieDataItem } from "@/lib/types";

interface DefectPieChartProps {
  data: PieDataItem[];
  colors: Record<string, string>;
}

interface TooltipPayloadItem {
  name: string;
  value: number;
  payload: PieDataItem;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-gray-700">{item.name}</p>
      <p className="text-gray-600">{item.value.toLocaleString()}건</p>
      <p className="text-blue-600 font-medium">{item.payload.percentage}%</p>
    </div>
  );
}

function CustomLabel(props: Record<string, unknown>) {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props as {
    cx: number; cy: number; midAngle: number;
    innerRadius: number; outerRadius: number; percent: number;
  };
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  if (percent < 0.05) return null;
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight="600">
      {(percent * 100).toFixed(1)}%
    </text>
  );
}

export default function DefectPieChart({ data, colors }: DefectPieChartProps) {
  if (data.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
      <h2 className="text-base font-semibold text-gray-700 mb-4">불량 유형별 분포</h2>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={110}
            dataKey="value"
            labelLine={false}
            label={(props) => <CustomLabel {...(props as unknown as Record<string, unknown>)} />}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={colors[entry.name] ?? "#94a3b8"} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(value: string) => (
              <span className="text-sm text-gray-600">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
