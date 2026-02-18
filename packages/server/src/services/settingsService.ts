import { prisma } from '../prisma.js'

export async function get(key: string): Promise<unknown> {
  const setting = await prisma.setting.findUnique({ where: { key } })
  return setting?.value ?? null
}

export async function set(key: string, value: unknown): Promise<void> {
  await prisma.setting.upsert({
    where: { key },
    update: { value: value as never },
    create: { key, value: value as never },
  })
}

export async function getAll(): Promise<Record<string, unknown>> {
  const settings = await prisma.setting.findMany()
  const result: Record<string, unknown> = {}
  for (const s of settings) {
    result[s.key] = s.value
  }
  return result
}

export async function testConnection(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })
    return response.ok
  } catch {
    return false
  }
}
