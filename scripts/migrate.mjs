/**
 * 프로덕션(Turso) DB 마이그레이션 스크립트
 * 사용: node scripts/migrate.mjs
 * 환경변수 TURSO_DATABASE_URL, TURSO_AUTH_TOKEN 필요
 */
import { createClient } from '@libsql/client'
import path from 'path'
import { fileURLToPath } from 'url'

const tursoUrl = process.env.TURSO_DATABASE_URL
const tursoToken = process.env.TURSO_AUTH_TOKEN

const client = tursoUrl
  ? createClient({ url: tursoUrl, authToken: tursoToken })
  : createClient({ url: `file:${path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../prisma/dev.db')}` })

console.log(`Connecting to: ${tursoUrl ?? 'local SQLite'}`)

await client.execute(`
  CREATE TABLE IF NOT EXISTS "Session" (
    "id"          INTEGER  NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fileName"    TEXT     NOT NULL,
    "defectTypes" TEXT     NOT NULL,
    "uploadedAt"  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`)

await client.execute(`
  CREATE TABLE IF NOT EXISTS "DefectRecord" (
    "id"          INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sessionId"   INTEGER NOT NULL,
    "date"        TEXT    NOT NULL,
    "total"       INTEGER NOT NULL,
    "defectsJson" TEXT    NOT NULL,
    CONSTRAINT "DefectRecord_sessionId_fkey"
      FOREIGN KEY ("sessionId") REFERENCES "Session" ("id")
      ON DELETE CASCADE ON UPDATE CASCADE
  )
`)

console.log('✓ Session 테이블 생성/확인')
console.log('✓ DefectRecord 테이블 생성/확인')
console.log('마이그레이션 완료!')

await client.close()
