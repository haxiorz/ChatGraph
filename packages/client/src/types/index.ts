export interface Conversation {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  nodes?: ConversationNode[]
}

export interface ConversationNode {
  id: string
  conversationId: string
  parentId: string | null
  role: 'system' | 'user' | 'assistant'
  content: string
  model: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

export interface OpenRouterModel {
  id: string
  name: string
  description?: string
  pricing?: {
    prompt: string
    completion: string
  }
  context_length?: number
  top_provider?: {
    max_completion_tokens?: number
  }
}

export interface Settings {
  openrouter_api_key?: string
  default_model?: string
  temperature?: number
  theme?: 'light' | 'dark'
  desktop_notifications?: boolean
  daily_budget?: number
}

export interface Prompt {
  id: string
  name: string
  description: string
  content: string
  isBuiltIn: boolean
  lastUsedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface UsageStats {
  totalPromptTokens: number
  totalCompletionTokens: number
  totalCost: number
  byModel: Array<{
    model: string
    promptTokens: number
    completionTokens: number
    cost: number
    count: number
  }>
  topConversations: Array<{
    conversationId: string
    title: string
    totalTokens: number
    cost: number
  }>
}

export interface SearchResult {
  nodeId: string
  conversationId: string
  conversationTitle: string
  role: 'system' | 'user' | 'assistant'
  snippet: string
  createdAt: string
}

export interface SearchResponse {
  results: SearchResult[]
  total: number
}

export interface MergeEdge {
  id: string
  childId: string
  parentId: string
  branchOrder: number
}

export interface ConversationAnalytics {
  summary: string
  decisions: string[]
  openQuestions: string[]
  actionItems: string[]
  healthScore: number
  healthAssessment: string
  branchCount: number
  nodeCount: number
  modelsMentioned: string[]
}

export interface DailySpendingPoint {
  date: string
  cost: number
  promptTokens: number
  completionTokens: number
}

// --- F078: Smart Model Router ---
export type RoutingTier = 'simple' | 'standard' | 'complex' | 'code'

export interface RoutingTierConfig {
  tier: RoutingTier
  label: string
  description: string
  modelId: string
}

export interface RoutingDecision {
  tier: RoutingTier
  modelId: string
  confidence: number
  reason: string
}

// --- F079: Thinking Level ---
export type ThinkingLevel = 'fast' | 'thinking' | 'deep'

// --- F084: File Upload ---
export interface UploadedFileInfo {
  id: string
  name: string
  type: string
  size: number
  category: 'text' | 'code' | 'pdf' | 'image'
  storagePath: string
}

// --- F085: Agent Steps ---
export type AgentStepType = 'tool_call' | 'tool_result' | 'web_fetch' | 'code_exec' | 'action'
export type AgentStepStatus = 'pending' | 'running' | 'completed' | 'failed'

export interface AgentStep {
  id: string
  type: AgentStepType
  name: string
  input?: string
  output?: string
  status: AgentStepStatus
  startedAt?: string
  completedAt?: string
  duration?: number
}

// --- F086: Thinking Steps ---
export interface ThinkingStep {
  id: string
  content: string
  parentStepId: string | null
  depth: number
  edited?: boolean
  originalContent?: string
}

export interface ThinkingData {
  content: string
  steps: ThinkingStep[]
}

export type StreamState =
  | { status: 'idle' }
  | { status: 'streaming'; content: string; thinkingContent?: string; agentSteps?: AgentStep[] }
  | { status: 'error'; error: string }
