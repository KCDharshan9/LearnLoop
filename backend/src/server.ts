import { app } from './app.js'
import { env } from './config/env.js'
import { connectDatabase } from './database/connection.js'

async function startServer(): Promise<void> {
  await connectDatabase()
  const server = app.listen(env.port, () => console.log(`LearnLoop backend listening on http://localhost:${env.port}`))
  server.on('error', (error) => { console.error('LearnLoop backend failed to start:', error); process.exitCode = 1 })
}

startServer().catch(() => { process.exitCode = 1 })
