export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: string,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export interface CreateConversationInput {
  title?: string
}

export interface CompleteInput {
  parentNodeId: string
  content: string
  model: string
}

export interface CreateNodeInput {
  parentId: string | null
  role: 'system' | 'user' | 'assistant'
  content: string
  model?: string
}

export interface UpdateNodeInput {
  content: string
}

export interface RegenerateInput {
  assistantNodeId: string
  model: string
  temperature?: number
}

export interface UpdateSettingsInput {
  key: string
  value: unknown
}

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
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
