import 'dotenv/config'

function readPort(value: string | undefined): number {
  const port = Number(value ?? '5000')
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer between 1 and 65535.')
  return port
}

export const env = { port: readPort(process.env.PORT), clientUrl: process.env.CLIENT_URL ?? 'http://localhost:5173' }
