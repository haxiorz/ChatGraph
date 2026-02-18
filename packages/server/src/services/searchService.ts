import { prisma } from '../prisma.js'

interface SearchOptions {
  conversationId?: string
  limit?: number
}

interface SearchResultRow {
  nodeId: string
  conversationId: string
  conversationTitle: string
  role: string
  snippet: string
  createdAt: Date
}

export async function searchNodes(query: string, options: SearchOptions = {}) {
  const limit = options.limit ?? 20
  const trimmed = query.trim()
  if (!trimmed) return { results: [], total: 0 }

  // Escape special characters and convert to tsquery format
  const words = trimmed
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0)
    .map((w) => `${w}:*`)
    .join(' & ')

  if (!words) return { results: [], total: 0 }

  const conversationFilter = options.conversationId
    ? `AND n."conversationId" = '${options.conversationId}'`
    : ''

  const results = await prisma.$queryRawUnsafe<SearchResultRow[]>(`
    SELECT
      n.id as "nodeId",
      n."conversationId" as "conversationId",
      c.title as "conversationTitle",
      n.role as role,
      ts_headline('english', n.content, to_tsquery('english', $1),
        'StartSel=<mark>, StopSel=</mark>, MaxFragments=2, MaxWords=30') as snippet,
      n."createdAt" as "createdAt"
    FROM "Node" n
    JOIN "Conversation" c ON c.id = n."conversationId"
    WHERE to_tsvector('english', n.content) @@ to_tsquery('english', $1)
      ${conversationFilter}
    ORDER BY ts_rank(to_tsvector('english', n.content), to_tsquery('english', $1)) DESC
    LIMIT ${limit}
  `, words)

  // Get total count
  const countResult = await prisma.$queryRawUnsafe<[{ count: bigint }]>(`
    SELECT COUNT(*) as count
    FROM "Node" n
    WHERE to_tsvector('english', n.content) @@ to_tsquery('english', $1)
      ${conversationFilter}
  `, words)

  return {
    results: results.map((r) => ({
      nodeId: r.nodeId,
      conversationId: r.conversationId,
      conversationTitle: r.conversationTitle,
      role: r.role as 'system' | 'user' | 'assistant',
      snippet: r.snippet,
      createdAt: r.createdAt.toISOString(),
    })),
    total: Number(countResult[0]?.count ?? 0),
  }
}
