import { getPayload } from 'payload'
import config from './payload.config'

async function migrate() {
  const payload = await getPayload({ config })
  console.log('Database schema pushed successfully')
  process.exit(0)
}

migrate().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
