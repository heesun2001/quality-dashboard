import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Prisma 모킹 — DB 없이 API 로직만 검증
vi.mock('@/lib/prisma', () => ({
  prisma: {
    session: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/prisma'
import { GET as getSessions, POST as postSession } from '@/app/api/sessions/route'
import { GET as getSession, DELETE as deleteSession } from '@/app/api/sessions/[id]/route'

// ─────────────────────────────────────────────────────────────
// GET /api/sessions
// ─────────────────────────────────────────────────────────────
describe('GET /api/sessions', () => {
  beforeEach(() => vi.clearAllMocks())

  it('세션 목록을 JSON으로 반환한다', async () => {
    const mockSessions = [
      { id: 1, fileName: 'test.csv', defectTypes: '["표면불량"]', uploadedAt: new Date(), _count: { records: 5 } },
    ]
    vi.mocked(prisma.session.findMany).mockResolvedValue(mockSessions as never)

    const res = await getSessions()
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toHaveLength(1)
    expect(data[0].fileName).toBe('test.csv')
  })

  it('세션이 없을 때 빈 배열을 반환한다', async () => {
    vi.mocked(prisma.session.findMany).mockResolvedValue([])

    const res = await getSessions()
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toEqual([])
  })
})

// ─────────────────────────────────────────────────────────────
// POST /api/sessions
// ─────────────────────────────────────────────────────────────
describe('POST /api/sessions', () => {
  beforeEach(() => vi.clearAllMocks())

  it('유효한 데이터로 세션을 생성하고 201을 반환한다', async () => {
    const payload = {
      fileName: 'defects.csv',
      defectTypes: ['표면불량', '치수불량'],
      rows: [
        { date: '2024-01-01', total: 1000, defects: { 표면불량: 20, 치수불량: 10 } },
        { date: '2024-01-02', total: 1200, defects: { 표면불량: 25, 치수불량: 8 } },
      ],
    }
    const createdSession = { id: 42, fileName: 'defects.csv', uploadedAt: new Date() }
    vi.mocked(prisma.session.create).mockResolvedValue(createdSession as never)

    const req = new NextRequest('http://localhost/api/sessions', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await postSession(req)
    const data = await res.json()

    expect(res.status).toBe(201)
    expect(data.id).toBe(42)
    expect(prisma.session.create).toHaveBeenCalledOnce()
  })

  it('create 호출 시 defectTypes를 JSON 문자열로 직렬화한다', async () => {
    vi.mocked(prisma.session.create).mockResolvedValue({ id: 1 } as never)

    const payload = {
      fileName: 'test.csv',
      defectTypes: ['A형', 'B형'],
      rows: [{ date: '2024-01-01', total: 500, defects: { 'A형': 5, 'B형': 3 } }],
    }
    const req = new NextRequest('http://localhost/api/sessions', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
    })
    await postSession(req)

    const callArg = vi.mocked(prisma.session.create).mock.calls[0][0]
    expect(callArg.data.defectTypes).toBe(JSON.stringify(['A형', 'B형']))
  })

  it('records에 defectsJson이 JSON 문자열로 저장된다', async () => {
    vi.mocked(prisma.session.create).mockResolvedValue({ id: 1 } as never)

    const defects = { 표면불량: 15, 치수불량: 7 }
    const payload = {
      fileName: 'test.csv',
      defectTypes: ['표면불량', '치수불량'],
      rows: [{ date: '2024-01-01', total: 1000, defects }],
    }
    const req = new NextRequest('http://localhost/api/sessions', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
    })
    await postSession(req)

    const callArg = vi.mocked(prisma.session.create).mock.calls[0][0]
    const record = callArg.data.records.create[0]
    expect(JSON.parse(record.defectsJson)).toEqual(defects)
  })
})

// ─────────────────────────────────────────────────────────────
// GET /api/sessions/[id]
// ─────────────────────────────────────────────────────────────
describe('GET /api/sessions/[id]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('존재하는 세션을 반환한다', async () => {
    const mockSession = {
      id: 1,
      fileName: 'test.csv',
      defectTypes: '["표면불량"]',
      uploadedAt: new Date(),
      records: [{ id: 1, date: '2024-01-01', total: 1000, defectsJson: '{"표면불량":20}' }],
    }
    vi.mocked(prisma.session.findUnique).mockResolvedValue(mockSession as never)

    const req = new NextRequest('http://localhost/api/sessions/1')
    const res = await getSession(req, { params: Promise.resolve({ id: '1' }) })
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.id).toBe(1)
    expect(data.records).toHaveLength(1)
  })

  it('존재하지 않는 ID는 404를 반환한다', async () => {
    vi.mocked(prisma.session.findUnique).mockResolvedValue(null)

    const req = new NextRequest('http://localhost/api/sessions/999')
    const res = await getSession(req, { params: Promise.resolve({ id: '999' }) })

    expect(res.status).toBe(404)
  })
})

// ─────────────────────────────────────────────────────────────
// DELETE /api/sessions/[id]
// ─────────────────────────────────────────────────────────────
describe('DELETE /api/sessions/[id]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('세션을 삭제하고 204를 반환한다', async () => {
    vi.mocked(prisma.session.delete).mockResolvedValue({} as never)

    const req = new NextRequest('http://localhost/api/sessions/1', { method: 'DELETE' })
    const res = await deleteSession(req, { params: Promise.resolve({ id: '1' }) })

    expect(res.status).toBe(204)
    expect(prisma.session.delete).toHaveBeenCalledWith({ where: { id: 1 } })
  })
})
