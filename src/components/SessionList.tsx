"use client";

import { useEffect, useState, useCallback } from "react";
import type { DefectRow, ParsedData, PieDataItem, SummaryStats } from "@/lib/types";
import { buildPieData, buildSummaryStats } from "@/lib/csvParser";
import { PIE_COLORS } from "./StatsCards";

interface SessionSummary {
  id: number;
  fileName: string;
  defectTypes: string;
  uploadedAt: string;
  _count: { records: number };
}

interface RawRecord {
  id: number;
  date: string;
  total: number;
  defectsJson: string;
}

interface SessionDetail {
  id: number;
  fileName: string;
  defectTypes: string;
  uploadedAt: string;
  records: RawRecord[];
}

export interface LoadedSession {
  parsed: ParsedData;
  pieData: PieDataItem[];
  stats: SummaryStats;
  colors: Record<string, string>;
  fileName: string;
  sessionId: number;
}

interface SessionListProps {
  onLoad: (session: LoadedSession) => void;
}

export default function SessionList({ onLoad }: SessionListProps) {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [deleting, setDeleting] = useState<number | null>(null);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/sessions");
    const data = await res.json() as SessionSummary[];
    setSessions(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  async function handleLoad(id: number) {
    setSelectedId(id);
    const res = await fetch(`/api/sessions/${id}`);
    const detail = await res.json() as SessionDetail;

    const defectTypes: string[] = JSON.parse(detail.defectTypes);
    let rows: DefectRow[] = detail.records.map((r) => ({
      date: r.date,
      total: r.total,
      defects: JSON.parse(r.defectsJson) as Record<string, number>,
    }));

    // Apply date filter
    if (dateFrom) rows = rows.filter((r) => r.date >= dateFrom);
    if (dateTo) rows = rows.filter((r) => r.date <= dateTo);

    if (rows.length === 0) {
      alert("선택한 날짜 범위에 데이터가 없습니다.");
      return;
    }

    const colors: Record<string, string> = {};
    defectTypes.forEach((t, i) => { colors[t] = PIE_COLORS[i % PIE_COLORS.length]; });

    onLoad({
      parsed: { rows, defectTypes },
      pieData: buildPieData(rows, defectTypes),
      stats: buildSummaryStats(rows, defectTypes),
      colors,
      fileName: detail.fileName,
      sessionId: id,
    });
  }

  async function handleDelete(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("이 세션을 삭제하시겠습니까?")) return;
    setDeleting(id);
    await fetch(`/api/sessions/${id}`, { method: "DELETE" });
    setSessions((prev) => prev.filter((s) => s.id !== id));
    setDeleting(null);
  }

  if (loading) return <p className="text-gray-400 text-sm">불러오는 중...</p>;
  if (sessions.length === 0)
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-4xl mb-3">📂</p>
        <p className="font-medium">저장된 세션이 없습니다.</p>
        <p className="text-sm mt-1">CSV를 업로드 후 저장하면 여기에 나타납니다.</p>
      </div>
    );

  return (
    <div className="space-y-4">
      {/* Date filter */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold text-gray-600">날짜 필터</span>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:border-blue-400"
          />
          <span className="text-gray-400 text-sm">~</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:border-blue-400"
          />
        </div>
        {(dateFrom || dateTo) && (
          <button
            onClick={() => { setDateFrom(""); setDateTo(""); }}
            className="text-xs text-gray-400 hover:text-gray-600 underline"
          >
            초기화
          </button>
        )}
      </div>

      {/* Session cards */}
      <div className="grid gap-3">
        {sessions.map((s) => {
          const isSelected = selectedId === s.id;
          return (
            <div
              key={s.id}
              onClick={() => handleLoad(s.id)}
              className={`bg-white rounded-2xl border p-4 cursor-pointer transition-all hover:shadow-md ${
                isSelected ? "border-blue-400 ring-2 ring-blue-100" : "border-gray-200"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800 text-sm truncate">{s.fileName}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(s.uploadedAt).toLocaleString("ko-KR")} · {s._count.records}행
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleLoad(s.id)}
                    className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    불러오기
                  </button>
                  <button
                    onClick={(e) => handleDelete(s.id, e)}
                    disabled={deleting === s.id}
                    className="text-xs px-3 py-1.5 border border-red-200 text-red-500 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-40"
                  >
                    삭제
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
