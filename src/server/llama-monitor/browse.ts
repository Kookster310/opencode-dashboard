import * as fs from 'node:fs'
import * as path from 'node:path'
import type { DiscoveredModel, BrowseResult } from './types'

export function browseDirectory(opts: { requestedPath: string; filter: string }): BrowseResult {
  const baseDir = opts.requestedPath || '.'
  const entries: DiscoveredModel[] = []

  try {
    const files = fs.readdirSync(baseDir, { withFileTypes: true })

    for (const entry of files) {
      if (!entry.isFile()) continue

      const fullPath = path.join(baseDir, entry.name)
      const ext = path.extname(entry.name).toLowerCase()

      if (opts.filter && !ext.includes(opts.filter)) continue

      const stat = fs.statSync(fullPath)

      entries.push({
        path: fullPath,
        filename: entry.name,
        size_bytes: stat.size,
        size_display: formatBytes(stat.size),
        is_split: false,
      })
    }
  } catch {
    // Return empty entries on error
  }

  return {
    entries,
    path: baseDir,
  }
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
