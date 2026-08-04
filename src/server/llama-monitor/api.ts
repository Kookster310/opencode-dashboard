import { Hono } from 'hono'
import * as http from 'node:http'
import * as https from 'node:https'
import type {
  GpuMetricsMap,
  LlamaMetrics,
  ModelPreset,
  DiscoveredModel,
  UiSettings,
  GpuEnv,
  BrowseResult,
} from './types'
import { savePresets, saveUiSettings, saveGpuEnv, pushLog } from './state'
import { pollGpuMetrics, detectGpuBackend } from './gpu'
import { parsePrometheusMetrics } from './metrics'
import { scanModelsDir } from './models'
import { browseDirectory } from './browse'
import { loadDefaultPresets } from './presets'

async function fetchFromRemote(state: import('./state').LlamaMonitorState, path: string): Promise<string | null> {
  const url = state.llamaServerUrl + path
  return new Promise((resolve) => {
    const client = state.llamaServerUrl.startsWith('https') ? https : http
    const req = client.request(url, { method: 'GET', timeout: 5000 }, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (chunk: Buffer) => chunks.push(chunk))
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')))
    })
    req.on('error', () => resolve(null))
    req.on('timeout', () => { req.destroy(); resolve(null) })
    req.end()
  })
}

export function createLlamaMonitorApi(opts: {
  state: import('./state').LlamaMonitorState
  backend: 'nvidia' | 'rocm' | 'none'
}): Hono {
  const api = new Hono()

  // Status - polls remote server for metrics
  api.get('/llama/status', async (c) => {
    if (!opts.state.llamaServerUrl) {
      return c.json({ ok: true, connected: false, logs: opts.state.serverLogs.slice(-100), metrics: opts.state.llamaMetrics })
    }
    const metricsText = await fetchFromRemote(opts.state, '/metrics')
    if (metricsText) {
      const parsed = parsePrometheusMetrics(metricsText)
      if (parsed) {
        opts.state.llamaMetrics = parsed
        pushLog(opts.state, 'Metrics fetched successfully')
      } else {
        pushLog(opts.state, 'Failed to parse metrics from ' + opts.state.llamaServerUrl)
      }
    } else {
      pushLog(opts.state, 'Failed to fetch metrics from ' + opts.state.llamaServerUrl)
    }
    return c.json({
      ok: true,
      connected: !!metricsText,
      url: opts.state.llamaServerUrl,
      logs: opts.state.serverLogs.slice(-100),
      metrics: opts.state.llamaMetrics,
    })
  })

  // GPU metrics
  api.get('/llama/gpu-metrics', (c) => {
    const metrics = pollGpuMetrics(opts.backend)
    opts.state.gpuMetrics = metrics
    return c.json({ ok: true, metrics })
  })

  // GPU environment
  api.get('/llama/gpu-env', (c) => {
    const detected = detectGpuBackend()
    return c.json({
      ok: true,
      env: opts.state.gpuEnv,
      architectures: { nvidia: 'Kepler+', amd: 'GCN+' },
      detected,
    })
  })

  api.put('/llama/gpu-env', async (c) => {
    const updated = await c.req.json<GpuEnv>()
    opts.state.gpuEnv = updated
    saveGpuEnv(opts.state)
    return c.json({ ok: true })
  })

  // Models
  api.get('/llama/models', (c) => {
    return c.json({ ok: true, models: opts.state.discoveredModels })
  })

  api.post('/llama/models/refresh', (c) => {
    if (!opts.state.modelsDir) {
      return c.json({ ok: false, error: 'no models directory configured' }, 400)
    }
    try {
      const models = scanModelsDir(opts.state.modelsDir)
      opts.state.discoveredModels = models
      return c.json({ ok: true, count: models.length })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown error'
      return c.json({ ok: false, error: message }, 500)
    }
  })

  // Presets
  api.get('/llama/presets', (c) => {
    return c.json({ ok: true, presets: opts.state.presets })
  })

  api.post('/llama/presets', async (c) => {
    const preset = await c.req.json<ModelPreset>()
    opts.state.presets.push(preset)
    savePresets(opts.state)
    return c.json({ ok: true, preset })
  })

  api.put('/llama/presets/:id', async (c) => {
    const id = c.req.param('id')
    const updated = await c.req.json<ModelPreset>()
    const idx = opts.state.presets.findIndex((p: ModelPreset) => p.id === id)
    if (idx === -1) {
      return c.json({ ok: false, error: 'preset not found' }, 404)
    }
    opts.state.presets[idx] = updated
    savePresets(opts.state)
    return c.json({ ok: true, preset: updated })
  })

  api.delete('/llama/presets/:id', (c) => {
    const id = c.req.param('id')
    const before = opts.state.presets.length
    opts.state.presets = opts.state.presets.filter((p: ModelPreset) => p.id !== id)
    if (opts.state.presets.length < before) {
      savePresets(opts.state)
      return c.json({ ok: true })
    }
    return c.json({ ok: false, error: 'preset not found' }, 404)
  })

  api.post('/llama/presets/reset', (c) => {
    opts.state.presets = loadDefaultPresets()
    savePresets(opts.state)
    return c.json({ ok: true })
  })

  // Settings
  api.get('/llama/settings', (c) => {
    return c.json({ ok: true, settings: opts.state.uiSettings })
  })

  api.put('/llama/settings', async (c) => {
    const updated = await c.req.json<UiSettings>()
    const oldDir = opts.state.uiSettings.models_dir
    const newDir = updated.models_dir

    opts.state.uiSettings = updated
    opts.state.llamaServerUrl = updated.llama_server_url || ''
    saveUiSettings(opts.state)

    // Rescan models if models_dir changed
    if (newDir !== oldDir && newDir !== '') {
      try {
        const models = scanModelsDir(newDir)
        opts.state.discoveredModels = models
      } catch {
        // ignore
      }
    }

    return c.json({ ok: true })
  })

  // Browse
  api.get('/llama/browse', (c) => {
    const requestedPath = c.req.query('path') || ''
    const filter = c.req.query('filter') || ''
    const result = browseDirectory({ requestedPath, filter })
    return c.json({ ok: true, ...result })
  })

  // Metrics polling endpoint (for frontend to fetch latest)
  api.get('/llama/metrics', (c) => {
    return c.json({
      ok: true,
      metrics: opts.state.llamaMetrics,
      logs: opts.state.serverLogs.slice(-50),
    })
  })

  return api
}


