export interface DefectRow {
  date: string;
  total: number;
  defects: Record<string, number>;
}

export interface ParsedData {
  rows: DefectRow[];
  defectTypes: string[];
}

export interface PieDataItem {
  name: string;
  value: number;
  percentage: string;
}

export interface SummaryStats {
  totalProduction: number;
  totalDefects: number;
  defectRate: string;
  worstType: string;
  worstTypeCount: number;
  latestDate: string;
}
