export interface ModelRecommendation {
  temperature: number;
  contextLimit: number;
  contextStrategy: 'incremental' | 'full-context';
  description: string;
}

/**
 * Community-curated best practices for AI models in coding environments.
 */
export const RECOMMENDATIONS: Record<string, ModelRecommendation> = {
  // Google Gemini
  'gemini-2.5-flash': {
    temperature: 0.2,
    contextLimit: 1_000_000,
    contextStrategy: 'full-context',
    description: 'Fast, cheap, and massive 1M+ context window. Excellent for long file edits and full-context orchestration.',
  },
  'gemini-2.5-pro': {
    temperature: 0.2,
    contextLimit: 2_000_000,
    contextStrategy: 'full-context',
    description: 'Highly intelligent, massive context window. Ideal for complex full-context refactoring.',
  },
  // OpenAI
  'gpt-4o': {
    temperature: 0.1,
    contextLimit: 128_000,
    contextStrategy: 'full-context',
    description: 'Precision standard. Keep temperature low for coding. Handles full-context strategy.',
  },
  'gpt-4o-mini': {
    temperature: 0.2,
    contextLimit: 128_000,
    contextStrategy: 'incremental',
    description: 'Cost-efficient and fast. Recommended strategy is incremental to prevent context bloating.',
  },
  // Anthropic
  'claude-3-5-sonnet': {
    temperature: 0.0,
    contextLimit: 200_000,
    contextStrategy: 'full-context',
    description: 'Industry benchmark for code generation. Community highly recommends temperature 0.0.',
  },
  // Local Models (Ollama)
  'qwen2.5-coder:7b': {
    temperature: 0.2,
    contextLimit: 16_384,
    contextStrategy: 'incremental',
    description: 'Outstanding 7B local coding model. Keep contexts incremental to fit local VRAM constraints.',
  },
  'qwen2.5-coder:14b': {
    temperature: 0.2,
    contextLimit: 32_768,
    contextStrategy: 'incremental',
    description: 'Near-frontier local coding reasoning. Requires a decent GPU VRAM. Incremental strategy recommended.',
  },
  'llama3:8b': {
    temperature: 0.2,
    contextLimit: 8_192,
    contextStrategy: 'incremental',
    description: 'Standard local instruction model. Incremental strategy is necessary to prevent hallucinations.',
  }
};

/**
 * Resolves a model name to its closest community recommendation.
 * Falls back to safe default settings if model is not recognized.
 */
export function getRecommendation(modelName: string): ModelRecommendation {
  const normalizedKey = Object.keys(RECOMMENDATIONS).find(k => 
    modelName.toLowerCase().replace(/-/g, '').includes(k.toLowerCase().replace(/-/g, ''))
  );
  
  if (normalizedKey) {
    return RECOMMENDATIONS[normalizedKey];
  }
  
  // Default fallback for unknown models
  return {
    temperature: 0.2,
    contextLimit: 16_384,
    contextStrategy: 'incremental',
    description: 'Generic model profile. Configured with safe default settings (incremental context) for maximum stability.',
  };
}
