"use client";

import { useState, useCallback } from "react";
import FileUpload from "@/components/FileUpload";
import StatsCards, { PIE_COLORS } from "@/components/StatsCards";
import DefectPieChart from "@/components/DefectPieChart";
import DefectLineChart from "@/components/DefectLineChart";
import DataTable from "@/components/DataTable";
import YieldGauge from "@/components/YieldGauge";
import SessionList, { type LoadedSession } from "@/components/SessionList";
import {
  parseCSV,
  buildPieData,
  buildSummaryStats,
  generateSampleCSV,
} from "@/lib/csvParser";
import type { ParsedData, PieDataItem, SummaryStats } from "@/lib/types";

interface DashboardState {
  parsed: ParsedData;
  pieData: PieDataItem[];
  stats: SummaryStats;
  colors: Record<string, string>;
  fileName: string;
}

type Tab = "upload" | "saved";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<Tab>("upload");
  const [dashboard, setDashboard] = useState<DashboardState | null>(null);
  const [savedDashboard, setSavedDashboard] = useState<DashboardState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith(".csv")) {
      setError("CSV 파일만 업로드 가능합니다.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setSaveStatus("idle");
    try {
      const parsed = await parseCSV(file);
      const colors: Record<string, string> = {};
      parsed.defectTypes.forEach((t, i) => {
        colors[t] = PIE_COLORS[i % PIE_COLORS.length];
      });
      setDashboard({
        parsed,
        pieData: buildPieData(parsed.rows, parsed.defectTypes),
        stats: buildSummaryStats(parsed.rows, parsed.defectTypes),
        colors,
        fileName: file.name,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "파일 파싱 오류");
    } finally {
      setIsLoading(false);
    }
  }, []);

  async function handleSave() {
    if (!dashboard) return;
    setIsSaving(true);
    setSaveStatus("idle");
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: dashboard.fileName,
          defectTypes: dashboard.parsed.defectTypes,
          rows: dashboard.parsed.rows,
        }),
      });
      if (!res.ok) throw new Error("저장 실패");
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
    }
  }

  function handleSampleDownload() {
    const csv = generateSampleCSV();
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sample_defect_data.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleReset() {
    setDashboard(null);
    setError(null);
    setSaveStatus("idle");
  }

  function handleSessionLoad(session: LoadedSession) {
    setSavedDashboard(session);
  }

  // 수율 계산
  function calcYield(stats: SummaryStats): number {
    if (stats.totalProduction === 0) return 0;
    return ((stats.totalProduction - stats.totalDefects) / stats.totalProduction) * 100;
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <span className="font-bold text-gray-800 text-lg">품질 관리 대시보드</span>
          </div>

          {/* 탭 */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setActiveTab("upload")}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "upload"
                  ? "bg-white text-gray-800 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              업로드 분석
            </button>
            <button
              onClick={() => setActiveTab("saved")}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "saved"
                  ? "bg-white text-gray-800 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              저장된 세션
            </button>
          </div>

          {dashboard && activeTab === "upload" && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400 hidden md:block truncate max-w-[140px]">
                {dashboard.fileName}
              </span>
              <button
                onClick={handleReset}
                className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                새 파일
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* ── 업로드 탭 ── */}
        {activeTab === "upload" && (
          <>
            {!dashboard ? (
              <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
                <div className="text-center">
                  <h1 className="text-2xl font-bold text-gray-800 mb-2">불량 데이터 분석</h1>
                  <p className="text-gray-500">CSV 파일을 업로드하면 자동으로 차트와 통계가 생성됩니다.</p>
                </div>
                <FileUpload onFile={handleFile} onSampleDownload={handleSampleDownload} isLoading={isLoading} />
                {error && (
                  <div className="w-full max-w-xl bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-3">
                    <svg className="w-5 h-5 text-red-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}
                <div className="w-full max-w-xl bg-white border border-gray-200 rounded-2xl p-5">
                  <p className="text-sm font-semibold text-gray-600 mb-3">CSV 형식 예시</p>
                  <div className="bg-gray-50 rounded-lg p-3 font-mono text-xs text-gray-600 overflow-x-auto">
                    <div>날짜,총생산량,표면불량,치수불량,조립불량,기타불량</div>
                    <div>2024-01-01,1200,18,10,5,3</div>
                    <div>2024-01-02,1150,22,8,6,2</div>
                    <div>...</div>
                  </div>
                  <ul className="mt-3 space-y-1 text-xs text-gray-500">
                    <li>• 1열: 날짜 | 2열: 총생산량 | 3열~: 불량 유형별 건수</li>
                  </ul>
                </div>
              </div>
            ) : (
              <>
                {/* 저장 버튼 */}
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">{dashboard.fileName} · {dashboard.parsed.rows.length}행</p>
                  <div className="flex items-center gap-2">
                    {saveStatus === "saved" && (
                      <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        저장 완료
                      </span>
                    )}
                    {saveStatus === "error" && (
                      <span className="text-sm text-red-500">저장 실패</span>
                    )}
                    <button
                      onClick={handleSave}
                      disabled={isSaving || saveStatus === "saved"}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {isSaving ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                        </svg>
                      )}
                      DB에 저장
                    </button>
                  </div>
                </div>

                <StatsCards stats={dashboard.stats} defectTypes={dashboard.parsed.defectTypes} typeColors={dashboard.colors} />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <DefectPieChart data={dashboard.pieData} colors={dashboard.colors} />
                  <div className="lg:col-span-1">
                    <YieldGauge yieldPct={calcYield(dashboard.stats)} />
                  </div>
                </div>

                <DefectLineChart rows={dashboard.parsed.rows} defectTypes={dashboard.parsed.defectTypes} colors={dashboard.colors} />
                <DataTable rows={dashboard.parsed.rows} defectTypes={dashboard.parsed.defectTypes} />
              </>
            )}
          </>
        )}

        {/* ── 저장된 세션 탭 ── */}
        {activeTab === "saved" && (
          <>
            <SessionList onLoad={handleSessionLoad} />

            {savedDashboard && (
              <div className="space-y-6 pt-2 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-gray-700">
                    {savedDashboard.fileName}
                    <span className="ml-2 text-sm text-gray-400 font-normal">{savedDashboard.parsed.rows.length}행</span>
                  </h2>
                </div>

                <StatsCards stats={savedDashboard.stats} defectTypes={savedDashboard.parsed.defectTypes} typeColors={savedDashboard.colors} />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <DefectPieChart data={savedDashboard.pieData} colors={savedDashboard.colors} />
                  <div className="lg:col-span-1">
                    <YieldGauge yieldPct={calcYield(savedDashboard.stats)} />
                  </div>
                </div>

                <DefectLineChart rows={savedDashboard.parsed.rows} defectTypes={savedDashboard.parsed.defectTypes} colors={savedDashboard.colors} />
                <DataTable rows={savedDashboard.parsed.rows} defectTypes={savedDashboard.parsed.defectTypes} />
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
