import path from 'path'
import { defineConfig } from 'prisma/config'
import { PrismaLibSql } from '@prisma/adapter-libsql'

export default defineConfig({
  datasource: {
    // migrate.adapter 사용 시에도 url 필드는 필수 — 스키마 참조용
    url: 'file:./prisma/dev.db',
  },
  migrate: {
    async adapter() {
      const tursoUrl = process.env.TURSO_DATABASE_URL
      const tursoToken = process.env.TURSO_AUTH_TOKEN
      if (tursoUrl) {
        return new PrismaLibSql({ url: tursoUrl, authToken: tursoToken })
      }
      return new PrismaLibSql({
        url: `file:${path.resolve(process.cwd(), 'prisma/dev.db')}`,
      })
    },
  },
})
