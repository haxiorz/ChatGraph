import { prisma } from '../prisma.js'
import * as modelService from './modelService.js'

interface UsageRow {
  model: string
  prompt_tokens: bigint | number
  completion_tokens: bigint | number
  count: bigint | number
}

interface ConversationUsageRow {
  conversationId: string
  title: string
  model: string
  prompt_tokens: bigint | number
  completion_tokens: bigint | number
}

function getPeriodFilter(period: string): string {
  switch (period) {
    case 'day':
      return `AND n."createdAt" >= NOW() - INTERVAL '1 day'`
    case 'week':
      return `AND n."createdAt" >= NOW() - INTERVAL '7 days'`
    case 'month':
      return `AND n."createdAt" >= NOW() - INTERVAL '30 days'`
    default:
      return ''
  }
}

function calculateCost(
  promptTokens: number,
  completionTokens: number,
  pricingMap: Map<string, { prompt: number; completion: number }>,
  model: string,
): number {
  const pricing = pricingMap.get(model)
  if (!pricing) return 0
  return promptTokens * pricing.prompt + completionTokens * pricing.completion
}

async function buildPricingMap(): Promise<
  Map<string, { prompt: number; completion: number }>
> {
  const map = new Map<string, { prompt: number; completion: number }>()
  try {
    const models = await modelService.listModels()
    for (const m of models) {
      if (m.pricing) {
        map.set(m.id, {
          prompt: parseFloat(m.pricing.prompt) || 0,
          completion: parseFloat(m.pricing.completion) || 0,
        })
      }
    }
  } catch {
    // If models can't be fetched, return empty map (costs will be 0)
  }
  return map
}

interface DailyUsageRow {
  date: Date
  model: string
  prompt_tokens: bigint | number
  completion_tokens: bigint | number
}

export async function getDailySpending(days: number) {
  const clampedDays = Math.max(1, Math.min(days, 90))
  const pricingMap = await buildPricingMap()

  const rows = await prisma.$queryRawUnsafe<DailyUsageRow[]>(`
    SELECT
      DATE(n."createdAt") as date,
      n.model,
      COALESCE(SUM((n.metadata->'usage'->>'prompt_tokens')::int), 0) as prompt_tokens,
      COALESCE(SUM((n.metadata->'usage'->>'completion_tokens')::int), 0) as completion_tokens
    FROM "Node" n
    WHERE n.role = 'assistant'
      AND n.metadata->'usage' IS NOT NULL
      AND n.model IS NOT NULL
      AND n."createdAt" >= NOW() - INTERVAL '${clampedDays} days'
    GROUP BY DATE(n."createdAt"), n.model
    ORDER BY date
  `)

  // Aggregate model rows into per-day totals
  const dayMap = new Map<
    string,
    { cost: number; promptTokens: number; completionTokens: number }
  >()
  for (const row of rows) {
    const dateStr =
      row.date instanceof Date
        ? row.date.toISOString().slice(0, 10)
        : String(row.date)
    const pt = Number(row.prompt_tokens)
    const ct = Number(row.completion_tokens)
    const cost = calculateCost(pt, ct, pricingMap, row.model)
    const existing = dayMap.get(dateStr)
    if (existing) {
      existing.cost += cost
      existing.promptTokens += pt
      existing.completionTokens += ct
    } else {
      dayMap.set(dateStr, { cost, promptTokens: pt, completionTokens: ct })
    }
  }

  // Fill missing dates with zeros
  const result: Array<{
    date: string
    cost: number
    promptTokens: number
    completionTokens: number
  }> = []
  const now = new Date()
  for (let i = clampedDays - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    const entry = dayMap.get(dateStr)
    result.push({
      date: dateStr,
      cost: entry?.cost ?? 0,
      promptTokens: entry?.promptTokens ?? 0,
      completionTokens: entry?.completionTokens ?? 0,
    })
  }

  return result
}

export async function getUsageStats(period: string = 'all') {
  const periodFilter = getPeriodFilter(period)
  const pricingMap = await buildPricingMap()

  // Aggregate by model
  const byModel = await prisma.$queryRawUnsafe<UsageRow[]>(`
    SELECT
      n.model,
      COALESCE(SUM((n.metadata->'usage'->>'prompt_tokens')::int), 0) as prompt_tokens,
      COALESCE(SUM((n.metadata->'usage'->>'completion_tokens')::int), 0) as completion_tokens,
      COUNT(*) as count
    FROM "Node" n
    WHERE n.role = 'assistant'
      AND n.metadata->'usage' IS NOT NULL
      AND n.model IS NOT NULL
      ${periodFilter}
    GROUP BY n.model
    ORDER BY count DESC
  `)

  // Top conversations with per-model breakdown for cost calculation
  const conversationRows = await prisma.$queryRawUnsafe<
    ConversationUsageRow[]
  >(`
    SELECT
      c.id as "conversationId",
      c.title,
      n.model,
      COALESCE(SUM((n.metadata->'usage'->>'prompt_tokens')::int), 0) as prompt_tokens,
      COALESCE(SUM((n.metadata->'usage'->>'completion_tokens')::int), 0) as completion_tokens
    FROM "Node" n
    JOIN "Conversation" c ON c.id = n."conversationId"
    WHERE n.role = 'assistant'
      AND n.metadata->'usage' IS NOT NULL
      AND n.model IS NOT NULL
      ${periodFilter}
    GROUP BY c.id, c.title, n.model
    ORDER BY c.title
  `)

  let totalPromptTokens = 0
  let totalCompletionTokens = 0
  let totalCost = 0

  const modelStats = byModel.map((row) => {
    const pt = Number(row.prompt_tokens)
    const ct = Number(row.completion_tokens)
    const cost = calculateCost(pt, ct, pricingMap, row.model)
    totalPromptTokens += pt
    totalCompletionTokens += ct
    totalCost += cost
    return {
      model: row.model,
      promptTokens: pt,
      completionTokens: ct,
      cost,
      count: Number(row.count),
    }
  })

  // Aggregate conversation rows (which are per-model) into per-conversation totals
  const convMap = new Map<
    string,
    { conversationId: string; title: string; totalTokens: number; cost: number }
  >()
  for (const row of conversationRows) {
    const pt = Number(row.prompt_tokens)
    const ct = Number(row.completion_tokens)
    const cost = calculateCost(pt, ct, pricingMap, row.model)
    const existing = convMap.get(row.conversationId)
    if (existing) {
      existing.totalTokens += pt + ct
      existing.cost += cost
    } else {
      convMap.set(row.conversationId, {
        conversationId: row.conversationId,
        title: row.title,
        totalTokens: pt + ct,
        cost,
      })
    }
  }

  const topConversations = [...convMap.values()]
    .sort((a, b) => b.totalTokens - a.totalTokens)
    .slice(0, 10)

  return {
    totalPromptTokens,
    totalCompletionTokens,
    totalCost,
    byModel: modelStats,
    topConversations,
  }
}
