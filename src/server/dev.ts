#!/usr/bin/env bun
import { Hono } from "hono"
import { createApi } from "./api"
import { createDashboardStore, type DashboardStore } from "./dashboard"
import { getLegacyStorageRootForBackend, selectStorageBackend } from "../ingest/storage-backend"
import { createLlamaMonitorApi } from './llama-monitor/api'
import { createLlamaMonitorState } from './llama-monitor/state'
import { detectGpuBackend, pollGpuMetrics } from './llama-monitor/gpu'
import * as path from 'node:path'

const args = process.argv.slice(2)
let projectPath: string | undefined;
let port = 51234;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--project' && i + 1 < args.length) {
    projectPath = args[i + 1];
    i++;
  } else if (arg === '--port' && i + 1 < args.length) {
    const portValue = parseInt(args[i + 1], 10);
    if (!isNaN(portValue)) {
      port = portValue;
    }
    i++;
  }
}

const resolvedProjectPath = projectPath ?? process.cwd()

const app = new Hono()

const storageBackend = selectStorageBackend()
const storageRoot = getLegacyStorageRootForBackend(storageBackend)

const store = createDashboardStore({
  projectRoot: resolvedProjectPath,
  storageRoot,
  storageBackend,
  watch: true,
  pollIntervalMs: 2000,
})

const storeBySourceId = new Map<string, DashboardStore>()
const storeByProjectRoot = new Map<string, DashboardStore>([[resolvedProjectPath, store]])

const getStoreForSource = ({ sourceId, projectRoot }: { sourceId: string; projectRoot: string }) => {
  const existing = storeBySourceId.get(sourceId)
  if (existing) return existing

  const byRoot = storeByProjectRoot.get(projectRoot)
  if (byRoot) {
    storeBySourceId.set(sourceId, byRoot)
    return byRoot
  }

  const created = createDashboardStore({
    projectRoot,
    storageRoot,
    storageBackend,
    watch: true,
    pollIntervalMs: 2000,
  })
  storeBySourceId.set(sourceId, created)
  storeByProjectRoot.set(projectRoot, created)
  return created
}

app.route("/api", createApi({ store, storageRoot, projectRoot: resolvedProjectPath, storageBackend, getStoreForSource }))

// Llama Monitor initialization
const homeDir = process.env.HOME || '/tmp'
const llamaMonitorDir = path.join(homeDir, '.config/llama-monitor')
const llamaMonitorPresetsPath = path.join(llamaMonitorDir, 'presets.json')
const llamaMonitorGpuEnvPath = path.join(llamaMonitorDir, 'gpu-env.json')
const llamaMonitorUiSettingsPath = path.join(llamaMonitorDir, 'ui-settings.json')

const llamaMonitorState = createLlamaMonitorState({
  presetsPath: llamaMonitorPresetsPath,
  modelsDir: null,
  gpuEnvPath: llamaMonitorGpuEnvPath,
  uiSettingsPath: llamaMonitorUiSettingsPath,
})

const llamaBackend = detectGpuBackend()

// Start periodic GPU metrics polling
const gpuPollInterval = setInterval(() => {
  const metrics = pollGpuMetrics(llamaBackend)
  llamaMonitorState.gpuMetrics = metrics
}, 3000)

app.route("/api", createLlamaMonitorApi({ state: llamaMonitorState, backend: llamaBackend }))

Bun.serve({
  fetch: app.fetch,
  hostname: '127.0.0.1',
  port,
})

console.log(`Server running at http://127.0.0.1:${port}`)
