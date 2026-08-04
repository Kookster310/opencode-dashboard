import type { LlamaMetrics } from './types'

export function parsePrometheusMetrics(text: string): LlamaMetrics | null {
  const lines = text.split('\n')
  const metrics: Record<string, string> = {}

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('#') || !trimmed) continue

    // llama.cpp format: llamacpp:metric_name value (no braces)
    const match1 = trimmed.match(/^(llamacpp:[^\s]+)\s+([\d.eE+-]+)$/)
    if (match1) {
      const [, name, value] = match1
      metrics[name] = value
      continue
    }

    // Standard Prometheus format: metric_name{labels} value
    const match2 = trimmed.match(/^(\S+?)_{.*?}\s+([\d.eE+-]+)$/)
    if (match2) {
      const [, name, value] = match2
      metrics[name] = value
    }
  }

  // llama.cpp exports "tokens_predicted" for generation (not "generation_tokens")
  // and uses seconds gauges for throughput
  const promptTokensPerSec = parseFloat(metrics['llamacpp:prompt_tokens_seconds'] || '0')
  const generationTokensPerSec = parseFloat(metrics['llamacpp:predicted_tokens_seconds'] || '0')
  const promptTokensTotal = parseFloat(metrics['llamacpp:prompt_tokens_total'] || '0')
  const predictedTokensTotal = parseFloat(metrics['llamacpp:tokens_predicted_total'] || '0')
  const requestsProcessing = parseFloat(metrics['llamacpp:requests_processing'] || '0')

  return {
    prompt_tokens_per_sec: promptTokensPerSec,
    generation_tokens_per_sec: generationTokensPerSec,
    prompt_tokens_total: promptTokensTotal,
    predicted_tokens_total: predictedTokensTotal,
    kv_cache_tokens: parseFloat(metrics['llamacpp:kv_cache_tokens'] || '0'),
    kv_cache_max: parseFloat(metrics['llamacpp:kv_cache_max'] || '0'),
    slots_idle: parseFloat(metrics['llamacpp:slots_idle'] || '0'),
    slots_processing: parseFloat(metrics['llamacpp:slots_processing'] || '0'),
    requests_processing: requestsProcessing,
    status: 'idle',
  }
}
