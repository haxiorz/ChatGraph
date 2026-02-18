import type {
  Conversation,
  ConversationAnalytics,
  ConversationNode,
  DailySpendingPoint,
  OpenRouterModel,
  Prompt,
  SearchResponse,
  Settings,
  UsageStats,
} from '../types/index'

const BASE = '/api/v1'

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      error?: { message?: string }
    } | null
    throw new Error(body?.error?.message ?? `HTTP ${res.status}`)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

// Conversations
export function listConversations() {
  return request<Conversation[]>(`${BASE}/conversations`)
}

export function getConversation(id: string) {
  return request<Conversation & { nodes: ConversationNode[] }>(
    `${BASE}/conversations/${id}`,
  )
}

export function createConversation(title?: string) {
  return request<Conversation>(`${BASE}/conversations`, {
    method: 'POST',
    body: JSON.stringify({ title }),
  })
}

export function renameConversation(id: string, title: string) {
  return request<Conversation>(`${BASE}/conversations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ title }),
  })
}

export function deleteConversation(id: string) {
  return request<void>(`${BASE}/conversations/${id}`, { method: 'DELETE' })
}

export function suggestTitles(id: string) {
  return request<{ titles: string[] }>(
    `${BASE}/conversations/${id}/suggest-titles`,
    { method: 'POST' },
  ).then((r) => r.titles)
}

// Nodes
export function createNode(
  conversationId: string,
  input: {
    parentId: string | null
    role: 'system' | 'user' | 'assistant'
    content: string
    model?: string
  },
) {
  return request<ConversationNode>(
    `${BASE}/conversations/${conversationId}/nodes`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  )
}

export function updateNode(
  id: string,
  input: { content?: string; metadata?: Record<string, unknown> },
) {
  return request<ConversationNode>(`${BASE}/nodes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function deleteNode(id: string) {
  return request<void>(`${BASE}/nodes/${id}`, { method: 'DELETE' })
}

// Models
export function listModels() {
  return request<{ data: OpenRouterModel[] }>(`${BASE}/models`).then(
    (r) => r.data,
  )
}

// Settings
export function getSettings() {
  return request<Settings>(`${BASE}/settings`)
}

export function updateSetting(key: string, value: unknown) {
  return request<{ success: boolean }>(`${BASE}/settings`, {
    method: 'PUT',
    body: JSON.stringify({ key, value }),
  })
}

export function testConnection(apiKey: string) {
  return request<{ valid: boolean }>(`${BASE}/settings/test-connection`, {
    method: 'POST',
    body: JSON.stringify({ apiKey }),
  })
}

// Prompts
export function listPrompts() {
  return request<Prompt[]>(`${BASE}/prompts`)
}

export function createPrompt(input: {
  name: string
  description?: string
  content: string
}) {
  return request<Prompt>(`${BASE}/prompts`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updatePrompt(
  id: string,
  input: { name?: string; description?: string; content?: string },
) {
  return request<Prompt>(`${BASE}/prompts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function deletePrompt(id: string) {
  return request<void>(`${BASE}/prompts/${id}`, { method: 'DELETE' })
}

// Search
export function search(
  q: string,
  options?: { conversationId?: string; limit?: number },
) {
  const params = new URLSearchParams({ q })
  if (options?.conversationId) params.set('conversationId', options.conversationId)
  if (options?.limit) params.set('limit', String(options.limit))
  return request<SearchResponse>(`${BASE}/search?${params}`)
}

// Usage
export function getUsage(period: 'day' | 'week' | 'month' | 'all' = 'all') {
  return request<UsageStats>(`${BASE}/usage?period=${period}`)
}

export function getDailySpending(days: number) {
  return request<DailySpendingPoint[]>(`${BASE}/usage/daily?days=${days}`)
}

// Analytics
export function analyzeConversation(
  id: string,
  model: string,
  targetNodeId?: string,
) {
  return request<ConversationAnalytics>(
    `${BASE}/conversations/${id}/analyze`,
    {
      method: 'POST',
      body: JSON.stringify({ model, targetNodeId }),
    },
  )
}

// Export
export function exportConversation(
  id: string,
  format: 'json' | 'markdown',
  activeNodeId?: string,
) {
  const params = new URLSearchParams({ format })
  if (activeNodeId) params.set('activeNodeId', activeNodeId)
  return request<unknown>(`${BASE}/conversations/${id}/export?${params}`)
}

// Import
export function importConversation(data: unknown) {
  return request<Conversation>(`${BASE}/conversations/import`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}
