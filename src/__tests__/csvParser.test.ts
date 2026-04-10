import { describe, it, expect } from 'vitest'
import {
  processRawRows,
  buildPieData,
  buildSummaryStats,
  generateSampleCSV,
} from '@/lib/csvParser'
import type { DefectRow } from '@/lib/types'

// ─────────────────────────────────────────────────────────────
// 테스트 픽스처
// ─────────────────────────────────────────────────────────────

const SAMPLE_ROWS: DefectRow[] = [
  { date: '2024-01-01', total: 1000, defects: { 표면불량: 20, 치수불량: 10, 조립불량: 5 } },
  { date: '2024-01-02', total: 1200, defects: { 표면불량: 30, 치수불량: 12, 조립불량: 8 } },
  { date: '2024-01-03', total:  800, defects: { 표면불량: 10, 치수불량:  6, 조립불량: 2 } },
]
const DEFECT_TYPES = ['표면불량', '치수불량', '조립불량']

// ─────────────────────────────────────────────────────────────
// 1. processRawRows — CSV 파싱 정확성
// ─────────────────────────────────────────────────────────────
describe('processRawRows — CSV 파싱', () => {
  it('정상 CSV를 올바르게 파싱한다', () => {
    const raw = [
      ['날짜', '총생산량', '표면불량', '치수불량'],
      ['2024-01-01', '1000', '20', '10'],
      ['2024-01-02', '1200', '30', '12'],
    ]
    const result = processRawRows(raw)
    expect(result.defectTypes).toEqual(['표면불량', '치수불량'])
    expect(result.rows).toHaveLength(2)
    expect(result.rows[0]).toEqual({
      date: '2024-01-01',
      total: 1000,
      defects: { 표면불량: 20, 치수불량: 10 },
    })
  })

  it('헤더의 앞뒤 공백을 제거한다', () => {
    const raw = [
      [' 날짜 ', ' 총생산량 ', ' 표면불량 '],
      ['2024-01-01', '1000', '20'],
    ]
    const result = processRawRows(raw)
    expect(result.defectTypes).toEqual(['표면불량'])
  })

  it('Excel UTF-8 BOM(\\uFEFF)이 포함된 헤더를 정상 처리한다', () => {
    const raw = [
      ['\uFEFF날짜', '총생산량', '표면불량'],
      ['2024-01-01', '1000', '15'],
    ]
    const result = processRawRows(raw)
    // BOM이 제거되어야 defectTypes에 정상 이름이 들어감
    expect(result.defectTypes[0]).toBe('표면불량')
    expect(result.rows[0].total).toBe(1000)
  })

  it('빈 문자열 날짜 행을 무시한다', () => {
    const raw = [
      ['날짜', '총생산량', '표면불량'],
      ['', '1000', '20'],         // 날짜 없음 → 무시
      ['2024-01-01', '1000', '15'],
    ]
    const result = processRawRows(raw)
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].date).toBe('2024-01-01')
  })

  it('숫자가 아닌 총생산량 행을 무시한다', () => {
    const raw = [
      ['날짜', '총생산량', '표면불량'],
      ['2024-01-01', 'N/A', '10'],   // 숫자 아님 → 무시
      ['2024-01-02', '1200', '30'],
    ]
    const result = processRawRows(raw)
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].date).toBe('2024-01-02')
  })

  it('결측 불량값을 0으로 처리한다', () => {
    const raw = [
      ['날짜', '총생산량', '표면불량', '치수불량'],
      ['2024-01-01', '1000', '20'],   // 치수불량 열 없음
    ]
    const result = processRawRows(raw)
    expect(result.rows[0].defects['치수불량']).toBe(0)
  })

  it('데이터 행이 없으면 오류를 던진다', () => {
    const raw = [['날짜', '총생산량', '표면불량']]
    expect(() => processRawRows(raw)).toThrow('데이터가 부족합니다')
  })

  it('열이 3개 미만이면 오류를 던진다', () => {
    const raw = [
      ['날짜', '총생산량'],
      ['2024-01-01', '1000'],
    ]
    expect(() => processRawRows(raw)).toThrow('열이 부족합니다')
  })

  it('유효 행이 하나도 없으면 오류를 던진다', () => {
    const raw = [
      ['날짜', '총생산량', '표면불량'],
      ['', 'bad', ''],
    ]
    expect(() => processRawRows(raw)).toThrow('유효한 데이터 행이 없습니다')
  })
})

// ─────────────────────────────────────────────────────────────
// 2. buildSummaryStats — 불량률 계산 정확성 (품질 관리 핵심)
// ─────────────────────────────────────────────────────────────
describe('buildSummaryStats — 불량률 계산', () => {
  it('총 생산량을 정확히 합산한다', () => {
    const stats = buildSummaryStats(SAMPLE_ROWS, DEFECT_TYPES)
    // 1000 + 1200 + 800 = 3000
    expect(stats.totalProduction).toBe(3000)
  })

  it('총 불량 수를 유형별로 합산한다', () => {
    const stats = buildSummaryStats(SAMPLE_ROWS, DEFECT_TYPES)
    // 표면(60) + 치수(28) + 조립(15) = 103
    expect(stats.totalDefects).toBe(103)
  })

  it('불량률을 소수점 2자리로 정확히 계산한다', () => {
    const stats = buildSummaryStats(SAMPLE_ROWS, DEFECT_TYPES)
    // 103 / 3000 × 100 = 3.43333... → "3.43"
    expect(stats.defectRate).toBe('3.43')
  })

  it('불량률 계산: 수율 + 불량률 = 100% (±0.01% 허용)', () => {
    const stats = buildSummaryStats(SAMPLE_ROWS, DEFECT_TYPES)
    const yieldPct = (stats.totalProduction - stats.totalDefects) / stats.totalProduction * 100
    const sum = yieldPct + parseFloat(stats.defectRate)
    expect(sum).toBeCloseTo(100, 1)
  })

  it('총생산량 0일 때 불량률 "0.00"을 반환한다 (나눗셈 안전성)', () => {
    const zeroRows: DefectRow[] = [
      { date: '2024-01-01', total: 0, defects: { 표면불량: 0 } },
    ]
    const stats = buildSummaryStats(zeroRows, ['표면불량'])
    expect(stats.defectRate).toBe('0.00')
    expect(stats.totalDefects).toBe(0)
  })

  it('불량 0건 데이터의 불량률은 0%다', () => {
    const perfectRows: DefectRow[] = [
      { date: '2024-01-01', total: 1000, defects: { 표면불량: 0, 치수불량: 0 } },
      { date: '2024-01-02', total: 1200, defects: { 표면불량: 0, 치수불량: 0 } },
    ]
    const stats = buildSummaryStats(perfectRows, ['표면불량', '치수불량'])
    expect(stats.defectRate).toBe('0.00')
    expect(stats.totalDefects).toBe(0)
  })

  it('생산량 전체가 불량인 경우 불량률 100%를 반환한다', () => {
    const allDefectRows: DefectRow[] = [
      { date: '2024-01-01', total: 100, defects: { 표면불량: 100 } },
    ]
    const stats = buildSummaryStats(allDefectRows, ['표면불량'])
    expect(stats.defectRate).toBe('100.00')
  })

  it('최다 불량 유형(파레토 1위)을 정확히 식별한다', () => {
    const stats = buildSummaryStats(SAMPLE_ROWS, DEFECT_TYPES)
    // 표면불량: 60, 치수불량: 28, 조립불량: 15 → 표면불량이 1위
    expect(stats.worstType).toBe('표면불량')
    expect(stats.worstTypeCount).toBe(60)
  })

  it('최신 날짜(마지막 행)를 반환한다', () => {
    const stats = buildSummaryStats(SAMPLE_ROWS, DEFECT_TYPES)
    expect(stats.latestDate).toBe('2024-01-03')
  })

  it('단일 행 데이터도 정확히 처리한다', () => {
    const singleRow: DefectRow[] = [
      { date: '2024-06-15', total: 500, defects: { 치수불량: 7 } },
    ]
    const stats = buildSummaryStats(singleRow, ['치수불량'])
    expect(stats.totalProduction).toBe(500)
    expect(stats.totalDefects).toBe(7)
    expect(stats.defectRate).toBe('1.40')
    expect(stats.worstType).toBe('치수불량')
    expect(stats.latestDate).toBe('2024-06-15')
  })
})

// ─────────────────────────────────────────────────────────────
// 3. buildPieData — 파레토 분포 분석
// ─────────────────────────────────────────────────────────────
describe('buildPieData — 파레토 분포', () => {
  it('불량 유형을 내림차순(건수)으로 정렬한다', () => {
    const pie = buildPieData(SAMPLE_ROWS, DEFECT_TYPES)
    // 표면(60) > 치수(28) > 조립(15)
    expect(pie[0].name).toBe('표면불량')
    expect(pie[1].name).toBe('치수불량')
    expect(pie[2].name).toBe('조립불량')
  })

  it('각 비율의 합이 약 100%다 (부동소수점 허용 ±1%)', () => {
    const pie = buildPieData(SAMPLE_ROWS, DEFECT_TYPES)
    const total = pie.reduce((s, p) => s + parseFloat(p.percentage), 0)
    expect(total).toBeCloseTo(100, 0)
  })

  it('가장 많은 불량 유형의 비율이 50% 이상 (파레토 원칙 검증)', () => {
    const pie = buildPieData(SAMPLE_ROWS, DEFECT_TYPES)
    // 표면불량 60 / 103 ≈ 58.3%
    expect(parseFloat(pie[0].percentage)).toBeGreaterThan(50)
  })

  it('값과 비율이 일치한다', () => {
    const pie = buildPieData(SAMPLE_ROWS, DEFECT_TYPES)
    const grandTotal = pie.reduce((s, p) => s + p.value, 0)
    pie.forEach((p) => {
      const expectedPct = (p.value / grandTotal) * 100
      expect(parseFloat(p.percentage)).toBeCloseTo(expectedPct, 0)
    })
  })

  it('전체 불량 0건일 때 모든 비율이 "0.0"이다', () => {
    const zeroDefectRows: DefectRow[] = [
      { date: '2024-01-01', total: 1000, defects: { 표면불량: 0, 치수불량: 0 } },
    ]
    const pie = buildPieData(zeroDefectRows, ['표면불량', '치수불량'])
    pie.forEach((p) => expect(p.percentage).toBe('0.0'))
  })

  it('불량 유형이 하나일 때 비율 100%를 반환한다', () => {
    const singleTypeRows: DefectRow[] = [
      { date: '2024-01-01', total: 1000, defects: { 표면불량: 50 } },
    ]
    const pie = buildPieData(singleTypeRows, ['표면불량'])
    expect(pie[0].percentage).toBe('100.0')
    expect(pie[0].value).toBe(50)
  })
})

// ─────────────────────────────────────────────────────────────
// 4. 수율 계산 정확성
// ─────────────────────────────────────────────────────────────
describe('수율(Yield) 계산', () => {
  function calcYield(totalProduction: number, totalDefects: number): number {
    if (totalProduction === 0) return 0
    return ((totalProduction - totalDefects) / totalProduction) * 100
  }

  it('정상 데이터의 수율 계산', () => {
    // 3000 생산, 103 불량 → (3000-103)/3000 × 100 = 96.5667%
    expect(calcYield(3000, 103)).toBeCloseTo(96.567, 2)
  })

  it('불량 0건이면 수율 100%', () => {
    expect(calcYield(1000, 0)).toBe(100)
  })

  it('전량 불량이면 수율 0%', () => {
    expect(calcYield(1000, 1000)).toBe(0)
  })

  it('생산량 0이면 수율 0%', () => {
    expect(calcYield(0, 0)).toBe(0)
  })

  it('수율 + buildSummaryStats 불량률 = 100% (정합성 검증)', () => {
    const stats = buildSummaryStats(SAMPLE_ROWS, DEFECT_TYPES)
    const yieldPct = calcYield(stats.totalProduction, stats.totalDefects)
    expect(yieldPct + parseFloat(stats.defectRate)).toBeCloseTo(100, 1)
  })

  it('목표 수율 97%: 달성 여부 분류', () => {
    const TARGET = 97
    expect(calcYield(1000, 25)).toBeGreaterThanOrEqual(TARGET)  // 97.5% → 달성
    expect(calcYield(1000, 40)).toBeLessThan(TARGET)             // 96.0% → 미달
  })
})

// ─────────────────────────────────────────────────────────────
// 5. generateSampleCSV — 샘플 데이터 무결성
// ─────────────────────────────────────────────────────────────
describe('generateSampleCSV — 샘플 데이터 무결성', () => {
  it('생성된 CSV가 processRawRows로 파싱 가능하다', () => {
    const csv = generateSampleCSV()
    const rows = csv.split('\n').map((line) => line.split(','))
    expect(() => processRawRows(rows)).not.toThrow()
  })

  it('샘플 CSV의 헤더가 날짜, 총생산량 포함 4개 이상 열을 가진다', () => {
    const csv = generateSampleCSV()
    const headers = csv.split('\n')[0].split(',')
    expect(headers.length).toBeGreaterThanOrEqual(4)
    expect(headers[0]).toBe('날짜')
    expect(headers[1]).toBe('총생산량')
  })

  it('샘플 CSV의 모든 생산량이 양수다', () => {
    const csv = generateSampleCSV()
    const lines = csv.split('\n').slice(1)
    lines.forEach((line) => {
      const cols = line.split(',')
      expect(parseInt(cols[1], 10)).toBeGreaterThan(0)
    })
  })

  it('샘플 CSV의 각 행 불량 합계가 생산량 미만이다 (현실성 검증)', () => {
    const csv = generateSampleCSV()
    const raw = csv.split('\n').map((line) => line.split(','))
    const parsed = processRawRows(raw)
    parsed.rows.forEach((row) => {
      const totalDefects = Object.values(row.defects).reduce((s, v) => s + v, 0)
      expect(totalDefects).toBeLessThan(row.total)
    })
  })
})

// ─────────────────────────────────────────────────────────────
// 6. 다중 불량 유형 엣지 케이스
// ─────────────────────────────────────────────────────────────
describe('엣지 케이스', () => {
  it('불량 유형이 8개일 때 모든 유형이 집계된다', () => {
    const manyTypes = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
    const row: DefectRow = {
      date: '2024-01-01',
      total: 1000,
      defects: Object.fromEntries(manyTypes.map((t, i) => [t, i + 1])),
    }
    const stats = buildSummaryStats([row], manyTypes)
    // 1+2+3+4+5+6+7+8 = 36
    expect(stats.totalDefects).toBe(36)
  })

  it('같은 날짜가 여러 행인 경우 모두 합산된다', () => {
    const rows: DefectRow[] = [
      { date: '2024-01-01', total: 500, defects: { 표면불량: 10 } },
      { date: '2024-01-01', total: 500, defects: { 표면불량: 15 } },
    ]
    const stats = buildSummaryStats(rows, ['표면불량'])
    expect(stats.totalProduction).toBe(1000)
    expect(stats.totalDefects).toBe(25)
  })

  it('소수점 불량률이 올바르게 반올림된다', () => {
    // 1 / 3 × 100 = 33.333... → "33.33"
    const rows: DefectRow[] = [
      { date: '2024-01-01', total: 3, defects: { 표면불량: 1 } },
    ]
    const stats = buildSummaryStats(rows, ['표면불량'])
    expect(stats.defectRate).toBe('33.33')
  })
})
