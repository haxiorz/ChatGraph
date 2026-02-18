import type { OpenRouterModel } from '../types/index.js'
import * as settingsService from './settingsService.js'

interface CachedModels {
  models: OpenRouterModel[]
  timestamp: number
}

const CACHE_TTL = 30 * 60 * 1000 // 30 minutes
let cache: CachedModels | null = null

export async function listModels(): Promise<OpenRouterModel[]> {
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return cache.models
  }

  const apiKey = await settingsService.get('openrouter_api_key')
  if (!apiKey) {
    return []
  }

  const response = await fetch('https://openrouter.ai/api/v1/models', {
    headers: {
      Authorization: `Bearer ${apiKey as string}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch models: ${response.status}`)
  }

  const body = (await response.json()) as { data: OpenRouterModel[] }
  const models = body.data ?? []

  cache = { models, timestamp: Date.now() }
  return models
}

export function clearCache() {
  cache = null
}
