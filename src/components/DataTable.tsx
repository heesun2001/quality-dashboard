"use client";

import { useState } from "react";
import type { DefectRow } from "@/lib/types";

interface DataTableProps {
  rows: DefectRow[];
  defectTypes: string[];
}

const PAGE_SIZE = 10;

export default function DataTable({ rows, defectTypes }: DataTableProps) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  const pageRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-700">원본 데이터</h2>
        <span className="text-sm text-gray-400">{rows.length}행</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <th className="px-4 py-3 text-left font-semibold">날짜</th>
              <th className="px-4 py-3 text-right font-semibold">총생산량</th>
              {defectTypes.map((t) => (
                <th key={t} className="px-4 py-3 text-right font-semibold">{t}</th>
              ))}
              <th className="px-4 py-3 text-right font-semibold">합계불량</th>
              <th className="px-4 py-3 text-right font-semibold">불량률</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {pageRows.map((row, i) => {
              const totalDefects = defectTypes.reduce((s, t) => s + (row.defects[t] ?? 0), 0);
              const defectRate = row.total > 0 ? ((totalDefects / row.total) * 100).toFixed(2) : "0.00";
              const rateNum = parseFloat(defectRate);
              return (
                <tr key={row.date + i} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-600 font-medium">{row.date}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{row.total.toLocaleString()}</td>
                  {defectTypes.map((t) => (
                    <td key={t} className="px-4 py-3 text-right text-gray-600">
                      {(row.defects[t] ?? 0).toLocaleString()}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right font-semibold text-gray-700">
                    {totalDefects.toLocaleString()}
                  </td>
                  <td className={`px-4 py-3 text-right font-semibold ${rateNum >= 3 ? "text-red-500" : rateNum >= 2 ? "text-orange-500" : "text-green-600"}`}>
                    {defectRate}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between text-sm">
          <span className="text-gray-400">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, rows.length)} / {rows.length}행
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              이전
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              다음
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
