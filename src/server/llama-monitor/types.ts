export interface LlamaMetrics {
  prompt_tokens_per_sec: number
  generation_tokens_per_sec: number
  prompt_tokens_total: number
  predicted_tokens_total: number
  kv_cache_tokens: number
  kv_cache_max: number
  slots_idle: number
  slots_processing: number
  requests_processing: number
  status: string
}

export interface LlamaServerConfig {
  model_path: string
  context_size: number
  port: number
  batch_size: number
  gpu_layers?: number
}

export interface ModelPreset {
  id: string
  name: string
  model_path: string
  context_size: number
  batch_size: number
  gpu_layers?: number
}

export interface DiscoveredModel {
  path: string
  filename: string
  size_bytes: number
  size_display: string
  quant_type?: string
  model_name?: string
  is_split: boolean
}

export interface OpenCodeServer {
  url: string
  username: string
  password: string
}

export interface UiSettings {
  llama_server_url: string
  models_dir: string
  gpu_backend: 'nvidia' | 'rocm' | 'none'
  opencode_server: OpenCodeServer
}

export interface GpuEnv {
  nvidia: {
    nvidia_smi_path?: string
  }
  rocm: {
    rocm_smi_path?: string
    rocr_path?: string
  }
}

export interface BrowseResult {
  entries: DiscoveredModel[]
  path: string
}
