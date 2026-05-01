import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import sharp from 'sharp'
import path from 'path'
import { fileURLToPath } from 'url'

import { Users } from './collections/Users'
import { Posts } from './collections/Posts'
import { Media } from './collections/Media'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

function getRequiredProductionEnv(name: string): string | undefined {
  const value = process.env[name]
  if (!value && process.env.NODE_ENV === 'production') {
    throw new Error(`${name} is required in production.`)
  }
  return value
}

const payloadSecret =
  getRequiredProductionEnv('PAYLOAD_SECRET') ?? 'dev-only-payload-secret'
const databaseUrl = getRequiredProductionEnv('DATABASE_URL')

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Posts, Media],
  secret: payloadSecret,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    push: true,
    pool: {
      connectionString: databaseUrl,
    },
  }),
  editor: lexicalEditor(),
  sharp,
  routes: {
    admin: '/cms',
    api: '/api/payload',
  },
})
