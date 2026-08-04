import * as fs from 'node:fs'
import * as path from 'node:path'
import type { DiscoveredModel } from './types'

export function scanModelsDir(dir: string): DiscoveredModel[] {
  if (!fs.existsSync(dir)) {
    return []
  }

  const entries: DiscoveredModel[] = []
  const files = fs.readdirSync(dir, { withFileTypes: true })

  for (const entry of files) {
    if (!entry.isFile()) continue

    const fullPath = path.join(dir, entry.name)
    const stat = fs.statSync(fullPath)
    const ext = path.extname(entry.name).toLowerCase()

    if (ext !== '.gguf') continue

    const sizeBytes = stat.size
    const sizeDisplay = formatBytes(sizeBytes)
    const quantType = detectQuantType(entry.name)
    const modelName = extractModelName(entry.name)

    entries.push({
      path: fullPath,
      filename: entry.name,
      size_bytes: sizeBytes,
      size_display: sizeDisplay,
      quant_type: quantType,
      model_name: modelName,
      is_split: false,
    })
  }

  return entries
}

function formatBytes(bytes: number): string {
  if (bytes >= 1073741824) {
    return `${(bytes / 1073741824).toFixed(1)} GB`
  }
  if (bytes >= 1048576) {
    return `${(bytes / 1048576).toFixed(0)} MB`
  }
  return `${(bytes / 1024).toFixed(0)} KB`
}

function detectQuantType(filename: string): string | undefined {
  const lower = filename.toLowerCase()
  const patterns = [
    /q4_0/i, /q4_1/i, /q4_k_m/i, /q4_k_s/i,
    /q5_0/i, /q5_1/i, /q5_k_m/i, /q5_k_s/i,
    /q6_k/i, /q8_0/i, /f16/i, /f32/i,
  ]

  for (const pattern of patterns) {
    if (pattern.test(lower)) {
      const match = lower.match(pattern)
      if (match) return match[0]
    }
  }

  return undefined
}

function extractModelName(filename: string): string | undefined {
  const base = path.basename(filename, path.extname(filename))
  const parts = base.split(/[\-_]/)

  if (parts.length < 2) return undefined

  const name = parts.slice(0, -1).join(' ')
  return name || undefined
}
