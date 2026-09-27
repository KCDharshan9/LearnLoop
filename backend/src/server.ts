import { app } from './app.js'
import { env } from './config/env.js'

const server = app.listen(env.port, () => console.log(`LearnLoop backend listening on http://localhost:${env.port}`))
server.on('error', (error) => { console.error('LearnLoop backend failed to start:', error); process.exitCode = 1 })
