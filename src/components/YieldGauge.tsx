"use client";

import { useState } from "react";

interface YieldGaugeProps {
  yieldPct: number; // 0–100
}

const CX = 110, CY = 115, R = 85, SW = 18;

function arcPath(startPct: number, endPct: number): string {
  const end = Math.min(endPct, 99.99);
  if (end <= startPct) return "";
  const sa = Math.PI * (1 - startPct / 100);
  const ea = Math.PI * (1 - end / 100);
  const x1 = (CX + R * Math.cos(sa)).toFixed(2);
  const y1 = (CY - R * Math.sin(sa)).toFixed(2);
  const x2 = (CX + R * Math.cos(ea)).toFixed(2);
  const y2 = (CY - R * Math.sin(ea)).toFixed(2);
  const large = end - startPct > 50 ? 1 : 0;
  return `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2}`;
}

function markerCoords(pct: number) {
  const angle = Math.PI * (1 - pct / 100);
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const inner = R - SW / 2 - 5, outer = R + SW / 2 + 5;
  return {
    x1: (CX + inner * cos).toFixed(2), y1: (CY - inner * sin).toFixed(2),
    x2: (CX + outer * cos).toFixed(2), y2: (CY - outer * sin).toFixed(2),
  };
}

export default function YieldGauge({ yieldPct }: YieldGaugeProps) {
  const [target, setTarget] = useState(97);
  const clamped = Math.min(100, Math.max(0, yieldPct));
  const marker = markerCoords(target);
  const achieved = clamped >= target;
  const diff = (clamped - target).toFixed(1);

  const color =
    clamped >= target ? "#10b981" :
    clamped >= target - 3 ? "#f59e0b" :
    "#ef4444";

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-base font-semibold text-gray-700">수율 (Yield)</h2>
        <div className="flex items-center gap-1.5 text-sm">
          <span className="text-gray-500">목표</span>
          <input
            type="number"
            min={50} max={100} step={0.5}
            value={target}
            onChange={(e) => setTarget(parseFloat(e.target.value) || 97)}
            className="w-16 text-center border border-gray-200 rounded-lg py-1 text-sm font-semibold text-gray-700 focus:outline-none focus:border-blue-400"
          />
          <span className="text-gray-500">%</span>
        </div>
      </div>

      <div className="flex flex-col items-center">
        <svg viewBox="0 0 220 130" className="w-full max-w-[260px]">
          {/* Background track */}
          <path d={arcPath(0, 99.99)} fill="none" stroke="#f1f5f9" strokeWidth={SW} strokeLinecap="round" />
          {/* Yield fill */}
          {clamped > 0 && (
            <path d={arcPath(0, clamped)} fill="none" stroke={color} strokeWidth={SW} strokeLinecap="round" />
          )}
          {/* Target marker */}
          <line x1={marker.x1} y1={marker.y1} x2={marker.x2} y2={marker.y2}
            stroke="#6366f1" strokeWidth={3} strokeLinecap="round" />
          {/* Labels */}
          <text x="14" y="126" fontSize="10" fill="#cbd5e1" textAnchor="middle">0%</text>
          <text x="206" y="126" fontSize="10" fill="#cbd5e1" textAnchor="middle">100%</text>
          {/* Center */}
          <text x={CX} y={CY - 8} fontSize="30" fontWeight="700" fill={color} textAnchor="middle">
            {clamped.toFixed(1)}%
          </text>
          <text x={CX} y={CY + 16} fontSize="11" fill="#94a3b8" textAnchor="middle">현재 수율</text>
        </svg>

        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
          achieved ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
        }`}>
          {achieved ? (
            <>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              목표 달성 (+{diff}%)
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              목표 미달 ({diff}%)
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-400">
          <span className="w-4 h-0.5 bg-indigo-500 inline-block rounded" />
          목표 수율 ({target}%)
        </div>
      </div>
    </div>
  );
}
