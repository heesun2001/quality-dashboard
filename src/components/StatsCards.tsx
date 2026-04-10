"use client";

import type { SummaryStats } from "@/lib/types";

const PIE_COLORS = [
  "#3b82f6", "#ef4444", "#f59e0b", "#10b981",
  "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16",
];

interface StatsCardsProps {
  stats: SummaryStats;
  defectTypes: string[];
  typeColors: Record<string, string>;
}

interface Card {
  label: string;
  value: string;
  sub?: string;
  accent: string;
  icon: React.ReactNode;
}

export default function StatsCards({ stats, defectTypes: _defectTypes, typeColors: _typeColors }: StatsCardsProps) {
  const cards: Card[] = [
    {
      label: "총 생산량",
      value: stats.totalProduction.toLocaleString(),
      sub: `최근 날짜: ${stats.latestDate}`,
      accent: "bg-blue-50 border-blue-200",
      icon: (
        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      label: "총 불량 수",
      value: stats.totalDefects.toLocaleString(),
      sub: "누적 불량 건수",
      accent: "bg-red-50 border-red-200",
      icon: (
        <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
      ),
    },
    {
      label: "불량률",
      value: `${stats.defectRate}%`,
      sub: "전체 기간 평균",
      accent: parseFloat(stats.defectRate) >= 3 ? "bg-orange-50 border-orange-200" : "bg-green-50 border-green-200",
      icon: (
        <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
        </svg>
      ),
    },
    {
      label: "최다 불량 유형",
      value: stats.worstType,
      sub: `${stats.worstTypeCount.toLocaleString()}건`,
      accent: "bg-purple-50 border-purple-200",
      icon: (
        <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div key={card.label} className={`rounded-2xl border p-5 flex flex-col gap-2 ${card.accent}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{card.label}</span>
            {card.icon}
          </div>
          <p className="text-2xl font-bold text-gray-800 truncate">{card.value}</p>
          {card.sub && <p className="text-xs text-gray-500">{card.sub}</p>}
        </div>
      ))}
    </div>
  );
}

export { PIE_COLORS };
