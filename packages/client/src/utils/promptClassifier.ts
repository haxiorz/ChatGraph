import type { RoutingTier, RoutingTierConfig, RoutingDecision } from '../types/index'

const SIMPLE_PATTERNS = [
  /^(yes|no|ok|okay|sure|thanks|thank you|got it|great|cool|continue|go ahead|next|done|right|yep|nope|agreed|fine)[\s!.?]*$/i,
  /^.{1,15}$/,
]

const CODE_KEYWORDS = /\b(function|class|import|export|const|let|var|async|await|return|if|else|for|while|switch|try|catch|throw|interface|type|enum|struct|def|fn|pub|impl|module|package)\b/
const CODE_TECH = /\b(typescript|javascript|python|rust|go|java|kotlin|swift|react|vue|angular|docker|kubernetes|webpack|vite|sql|postgres|mysql|mongodb|redis|graphql|api|rest|grpc|git|linux|bash|nginx|aws|gcp|azure)\b/i
const CODE_ACTIONS = /\b(write|implement|debug|fix|refactor|optimize|build|create|develop|code|program|deploy|test|compile|parse|serialize)\b/i
const CODE_BLOCK = /```[\s\S]*```/

const COMPLEX_KEYWORDS = /\b(analyze|compare|contrast|evaluate|explain why|pros and cons|trade-?offs|deep dive|in-depth|comprehensive|strategy|architecture|design pattern|algorithm|complexity|reasoning|step[- ]by[- ]step|think through|consider|implications|consequences)\b/i

export function classifyPrompt(content: string): RoutingDecision {
  const trimmed = content.trim()

  // Simple tier
  for (const pattern of SIMPLE_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        tier: 'simple',
        modelId: '',
        confidence: 0.9,
        reason: 'Short or acknowledgment message',
      }
    }
  }

  // Code tier
  const hasCodeBlock = CODE_BLOCK.test(trimmed)
  const hasCodeKeywords = CODE_KEYWORDS.test(trimmed)
  const hasCodeTech = CODE_TECH.test(trimmed)
  const hasCodeAction = CODE_ACTIONS.test(trimmed)
  const codeSignals = [hasCodeBlock, hasCodeKeywords, hasCodeTech, hasCodeAction].filter(Boolean).length

  if (codeSignals >= 2 || hasCodeBlock) {
    return {
      tier: 'code',
      modelId: '',
      confidence: Math.min(0.5 + codeSignals * 0.15, 0.95),
      reason: hasCodeBlock ? 'Contains code block' : 'Programming-related request',
    }
  }

  // Complex tier
  const hasComplexKeywords = COMPLEX_KEYWORDS.test(trimmed)
  const isLong = trimmed.length > 500
  const hasMultipleLines = trimmed.split('\n').length > 5
  const complexSignals = [hasComplexKeywords, isLong, hasMultipleLines].filter(Boolean).length

  if (complexSignals >= 2 || (hasComplexKeywords && isLong)) {
    return {
      tier: 'complex',
      modelId: '',
      confidence: Math.min(0.5 + complexSignals * 0.15, 0.9),
      reason: hasComplexKeywords ? 'Analysis/reasoning request' : 'Long structured prompt',
    }
  }

  // Standard tier (default)
  return {
    tier: 'standard',
    modelId: '',
    confidence: 0.6,
    reason: 'General conversation',
  }
}

export function resolveModel(
  decision: RoutingDecision,
  tierConfig: RoutingTierConfig[],
): string | undefined {
  const config = tierConfig.find((c) => c.tier === decision.tier)
  return config?.modelId
}
