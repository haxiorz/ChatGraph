function requireEnv(key: string): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

export function getEnv() {
  return {
    DATABASE_URL: requireEnv('DATABASE_URL'),
    PORT: parseInt(process.env['PORT'] ?? '3002', 10),
    NODE_ENV: process.env['NODE_ENV'] ?? 'development',
  }
}
