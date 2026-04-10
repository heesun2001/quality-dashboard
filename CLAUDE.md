@AGENTS.md

# 품질 관리 대시보드 — 프로젝트 가이드

## 기술 스택

| 레이어 | 기술 | 버전 | 비고 |
|--------|------|------|------|
| 프레임워크 | Next.js (App Router) | 16.x | Turbopack 기본 활성화 |
| 언어 | TypeScript | 5.x | strict 모드 |
| 스타일 | Tailwind CSS | 4.x | `@theme inline` 방식 |
| 시각화 | Recharts | 3.x | PieChart, LineChart, 커스텀 SVG 게이지 |
| CSV 파싱 | PapaParse | 5.x | 클라이언트 사이드 |
| ORM | Prisma | 7.x | 드라이버 어댑터 필수 (하단 참고) |
| DB 드라이버 | @prisma/adapter-libsql + @libsql/client | — | 로컬 SQLite |
| DB | SQLite | — | `prisma/dev.db` |
| 테스트 | Vitest + jsdom | 4.x | `@testing-library/jest-dom` 포함 |
| 런타임 | Node.js | 24 LTS | |

---

## 디렉터리 구조

```
src/
├── app/
│   ├── api/
│   │   └── sessions/
│   │       ├── route.ts          GET(목록) / POST(저장)
│   │       └── [id]/route.ts     GET(단건) / DELETE(삭제)
│   ├── layout.tsx
│   └── page.tsx                  클라이언트 컴포넌트, 탭 UI
├── components/
│   ├── FileUpload.tsx             드래그&드롭 CSV 업로드
│   ├── StatsCards.tsx             요약 통계 카드 (PIE_COLORS 익스포트)
│   ├── DefectPieChart.tsx         불량 유형별 파이 차트
│   ├── DefectLineChart.tsx        시계열 라인 그래프 (건수/불량률 전환)
│   ├── YieldGauge.tsx             SVG 반원 수율 게이지
│   ├── DataTable.tsx              원본 데이터 테이블 (페이지네이션)
│   └── SessionList.tsx            저장 세션 목록 + 날짜 필터
├── lib/
│   ├── types.ts                   공통 타입 (DefectRow, ParsedData 등)
│   ├── csvParser.ts               CSV 파싱 + 통계 계산 순수 함수
│   └── prisma.ts                  Prisma 클라이언트 싱글턴
└── __tests__/
    ├── setup.ts
    ├── csvParser.test.ts          파싱·계산 단위 테스트 (36개)
    └── api.sessions.test.ts       API 라우트 테스트 (10개)

prisma/
├── schema.prisma                  모델 정의 (url 필드 없음 — 하단 참고)
└── dev.db                         SQLite 파일 (gitignore 권장)

prisma.config.ts                   Prisma v7 연결 설정
```

---

## Prisma v7 필수 규칙

> **Breaking Change**: Prisma 7부터 datasource 연결 URL을 `schema.prisma`에 쓰지 않는다.

```prisma
# ✅ 올바른 방식
datasource db {
  provider = "sqlite"
  # url 필드 없음
}
```

```ts
// prisma.config.ts — URL은 여기서만 관리
import { defineConfig } from 'prisma/config'
export default defineConfig({
  datasource: { url: 'file:./prisma/dev.db' },
})
```

```ts
// src/lib/prisma.ts — 드라이버 어댑터 필수
import { PrismaLibSql } from '@prisma/adapter-libsql'
const adapter = new PrismaLibSql({ url: `file:${dbPath}` })
const prisma = new PrismaClient({ adapter })
```

DB 변경 후 실행 순서:
```bash
npx prisma db push    # 스키마 동기화 (dev)
npx prisma generate   # 클라이언트 재생성
```

---

## CSV 입력 형식

```
날짜,총생산량,불량유형A,불량유형B,...
2024-01-01,1200,18,10
2024-01-02,1150,22,8
```

- **1열**: 날짜 문자열 (형식 자유, 정렬 기준으로 사용)
- **2열**: 총 생산량 (정수)
- **3열~**: 불량 유형별 건수 (열 이름 = 차트 레이블, 개수 무제한)
- Excel UTF-8 BOM(`\uFEFF`) 자동 제거
- 결측 불량값은 0으로 처리

---

## 품질 지표 계산 공식

```
불량률(%) = (총불량수 / 총생산량) × 100   → 소수점 2자리
수율(%)   = (총생산량 - 총불량수) / 총생산량 × 100
불량률 + 수율 = 100% (항등식)
```

**목표 수율 기본값**: 97%  
**불량률 색상 기준**: 초록 < 2% ≤ 주황 < 3% ≤ 빨강  
**수율 게이지 색상**: 목표 이상 → 초록, 목표 -3% 이내 → 주황, 그 이하 → 빨강

---

## 테스트 전략

```bash
npm test              # 전체 테스트 1회 실행
npm run test:watch    # 변경 감지 모드
npm run test:coverage # 커버리지 리포트 (coverage/ 폴더)
```

### 테스트 범위 (46개)

| 범주 | 파일 | 항목 수 |
|------|------|---------|
| CSV 파싱 정확성 | csvParser.test.ts | 8 |
| 불량률 계산 | csvParser.test.ts | 9 |
| 파레토 분포 | csvParser.test.ts | 6 |
| 수율 계산 | csvParser.test.ts | 6 |
| 샘플 데이터 무결성 | csvParser.test.ts | 4 |
| 엣지 케이스 | csvParser.test.ts | 3 |
| API 세션 목록/생성 | api.sessions.test.ts | 5 |
| API 단건/삭제 | api.sessions.test.ts | 5 |

### 테스트 원칙

- **순수 함수 우선**: `processRawRows`, `buildPieData`, `buildSummaryStats`는 File/DB 없이 단위 테스트
- **API 테스트**: Prisma를 `vi.mock`으로 모킹해 DB 없이 로직 검증
- **품질 관리 핵심 검증 항목**:
  - 불량률 소수점 2자리 정확도
  - 수율 + 불량률 = 100% 항등식
  - 파레토 정렬 (최다 불량 유형 1위)
  - 제로 나눗셈 안전성 (생산량 0)
  - BOM·공백·결측값 처리

---

## 개발 시 주의 사항

1. **`'use client'` 필수 컴포넌트**: Recharts, PapaParse, useState 사용 컴포넌트 전부
2. **Next.js 16 async params**: `{ params }: { params: Promise<{ id: string }> }` — `await params` 필요
3. **Recharts 커스텀 레이블 타입**: `PieLabelRenderProps`는 index signature 없음 → `as unknown as Record<string, unknown>` 캐스팅
4. **`prisma/dev.db`는 gitignore에 추가** 권장 (팀 협업 시 마이그레이션 스크립트 공유)
5. **PIE_COLORS**: `StatsCards.tsx`에서 익스포트, 컴포넌트 간 색상 일관성 유지
