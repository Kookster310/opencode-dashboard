import * as fs from 'node:fs'
import * as path from 'node:path'
import type {
  LlamaMetrics,
  ModelPreset,
  UiSettings,
  DiscoveredModel,
  GpuEnv,
} from './types'

export interface LlamaMonitorState {
  llamaMetrics: LlamaMetrics
  llamaMetricsInterval: ReturnType<typeof setInterval> | null
  llamaServerUrl: string
  gpuEnv: GpuEnv
  discoveredModels: DiscoveredModel[]
  presets: ModelPreset[]
  uiSettings: UiSettings
  modelsDir: string | null
  presetsPath: string
  gpuEnvPath: string
  uiSettingsPath: string
  serverLogs: string[]
}

export function createLlamaMonitorState(opts: {
  presetsPath: string
  modelsDir: string | null
  gpuEnvPath: string
  uiSettingsPath: string
}): LlamaMonitorState {
  const presets = loadPresets(opts.presetsPath)
  const gpuEnv = loadGpuEnv(opts.gpuEnvPath)
  const uiSettings = loadUiSettings(opts.uiSettingsPath)

  return {
    llamaMetrics: {
      prompt_tokens_per_sec: 0,
      generation_tokens_per_sec: 0,
      prompt_tokens_total: 0,
      predicted_tokens_total: 0,
      kv_cache_tokens: 0,
      kv_cache_max: 0,
      slots_idle: 0,
      slots_processing: 0,
      requests_processing: 0,
      status: 'idle',
    },
    llamaMetricsInterval: null,
    llamaServerUrl: uiSettings.llama_server_url || '',
    gpuEnv,
    discoveredModels: [],
    presets,
    uiSettings,
    modelsDir: opts.modelsDir,
    presetsPath: opts.presetsPath,
    gpuEnvPath: opts.gpuEnvPath,
    uiSettingsPath: opts.uiSettingsPath,
    serverLogs: [],
  }
}



export function pushLog(state: LlamaMonitorState, line: string): void {
  state.serverLogs.push(line)
  if (state.serverLogs.length > 500) {
    state.serverLogs.shift()
  }
}

function loadPresets(path: string): ModelPreset[] {
  try {
    const data = fs.readFileSync(path, 'utf8')
    return JSON.parse(data)
  } catch {
    return []
  }
}

function loadGpuEnv(path: string): GpuEnv {
  try {
    const data = fs.readFileSync(path, 'utf8')
    return JSON.parse(data)
  } catch {
    return {
      nvidia: {},
      rocm: {},
    }
  }
}

function loadUiSettings(path: string): UiSettings {
  try {
    const data = fs.readFileSync(path, 'utf8')
    return JSON.parse(data)
  } catch {
    return {
      llama_server_url: '',
      models_dir: '',
      gpu_backend: 'none',
      opencode_server: { url: '', username: '', password: '' },
    }
  }
}

export function savePresets(state: LlamaMonitorState): void {
  try {
    const dir = path.dirname(state.presetsPath)
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(state.presetsPath, JSON.stringify(state.presets, null, 2))
  } catch {
    // ignore
  }
}



export function saveUiSettings(state: LlamaMonitorState): void {
  try {
    const dir = path.dirname(state.uiSettingsPath)
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(state.uiSettingsPath, JSON.stringify(state.uiSettings, null, 2))
  } catch {
    // ignore
  }
}
