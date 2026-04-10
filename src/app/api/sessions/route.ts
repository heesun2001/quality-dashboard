import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const sessions = await prisma.session.findMany({
    include: { _count: { select: { records: true } } },
    orderBy: { uploadedAt: 'desc' },
  })
  return NextResponse.json(sessions)
}

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    fileName: string
    defectTypes: string[]
    rows: { date: string; total: number; defects: Record<string, number> }[]
  }

  const session = await prisma.session.create({
    data: {
      fileName: body.fileName,
      defectTypes: JSON.stringify(body.defectTypes),
      records: {
        create: body.rows.map((r) => ({
          date: r.date,
          total: r.total,
          defectsJson: JSON.stringify(r.defects),
        })),
      },
    },
  })

  return NextResponse.json(session, { status: 201 })
}
