import Papa from "papaparse";
import type { ParsedData, DefectRow, SummaryStats, PieDataItem } from "./types";

/** 파싱된 string[][] → ParsedData 변환 (순수 함수, 테스트 가능) */
export function processRawRows(rawRows: string[][]): ParsedData {
  if (rawRows.length < 2) {
    throw new Error("데이터가 부족합니다. 헤더 포함 2행 이상 필요합니다.");
  }

  const headers = rawRows[0].map((h) => h.trim().replace(/^\uFEFF/, ""));
  if (headers.length < 3) {
    throw new Error("열이 부족합니다. 날짜, 총생산량, 불량유형(1개 이상) 열이 필요합니다.");
  }

  const defectTypes = headers.slice(2);
  const rows: DefectRow[] = [];

  for (let i = 1; i < rawRows.length; i++) {
    const cols = rawRows[i];
    const date = cols[0]?.trim() ?? "";
    const total = parseInt(cols[1]?.trim() ?? "0", 10);
    if (!date || isNaN(total)) continue;

    const defects: Record<string, number> = {};
    defectTypes.forEach((type, idx) => {
      defects[type] = parseInt(cols[idx + 2]?.trim() ?? "0", 10) || 0;
    });

    rows.push({ date, total, defects });
  }

  if (rows.length === 0) {
    throw new Error("유효한 데이터 행이 없습니다.");
  }

  return { rows, defectTypes };
}

export function parseCSV(file: File): Promise<ParsedData> {
  return new Promise((resolve, reject) => {
    Papa.parse<string[]>(file, {
      header: false,
      skipEmptyLines: true,
      complete(results) {
        try {
          resolve(processRawRows(results.data as string[][]));
        } catch (err) {
          reject(err);
        }
      },
      error(err) {
        reject(new Error(`CSV 파싱 오류: ${err.message}`));
      },
    });
  });
}

export function buildPieData(rows: DefectRow[], defectTypes: string[]): PieDataItem[] {
  const totals: Record<string, number> = {};
  defectTypes.forEach((t) => (totals[t] = 0));
  rows.forEach((row) => {
    defectTypes.forEach((t) => {
      totals[t] += row.defects[t] ?? 0;
    });
  });

  const grandTotal = Object.values(totals).reduce((a, b) => a + b, 0);

  return defectTypes
    .map((name) => ({
      name,
      value: totals[name],
      percentage: grandTotal > 0 ? ((totals[name] / grandTotal) * 100).toFixed(1) : "0.0",
    }))
    .sort((a, b) => b.value - a.value);
}

export function buildSummaryStats(rows: DefectRow[], defectTypes: string[]): SummaryStats {
  const totalProduction = rows.reduce((s, r) => s + r.total, 0);
  const defectTotals: Record<string, number> = {};
  defectTypes.forEach((t) => (defectTotals[t] = 0));
  rows.forEach((row) => {
    defectTypes.forEach((t) => {
      defectTotals[t] += row.defects[t] ?? 0;
    });
  });

  const totalDefects = Object.values(defectTotals).reduce((a, b) => a + b, 0);
  const defectRate = totalProduction > 0 ? ((totalDefects / totalProduction) * 100).toFixed(2) : "0.00";

  const worstType = defectTypes.reduce((a, b) => (defectTotals[a] >= defectTotals[b] ? a : b), defectTypes[0] ?? "");
  const worstTypeCount = defectTotals[worstType] ?? 0;
  const latestDate = rows[rows.length - 1]?.date ?? "-";

  return { totalProduction, totalDefects, defectRate, worstType, worstTypeCount, latestDate };
}

export function generateSampleCSV(): string {
  const header = "날짜,총생산량,표면불량,치수불량,조립불량,기타불량";
  const rows = [
    "2024-01-01,1200,18,10,5,3",
    "2024-01-02,1150,22,8,6,2",
    "2024-01-03,1300,15,12,4,5",
    "2024-01-04,1250,30,9,7,4",
    "2024-01-05,1100,12,15,3,1",
    "2024-01-06,1400,25,11,8,6",
    "2024-01-07,1350,19,7,5,3",
    "2024-01-08,1200,28,13,9,4",
    "2024-01-09,1180,16,6,4,2",
    "2024-01-10,1320,21,10,6,5",
  ];
  return [header, ...rows].join("\n");
}
