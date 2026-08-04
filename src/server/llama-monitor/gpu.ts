import * as child_process from 'node:child_process'
import type { GpuMetricsMap, GpuMetrics } from './types'

export type GpuBackend = 'nvidia' | 'rocm' | 'none'

export function detectGpuBackend(): GpuBackend {
  if (hasNvidiaSmi()) return 'nvidia'
  if (hasRocmSmi()) return 'rocm'
  return 'none'
}

function hasNvidiaSmi(): boolean {
  try {
    child_process.execSync('nvidia-smi --version', { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

function hasRocmSmi(): boolean {
  try {
    child_process.execSync('rocm-smi --version', { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

export function pollGpuMetrics(backend: GpuBackend): GpuMetricsMap {
  switch (backend) {
    case 'nvidia':
      return pollNvidia()
    case 'rocm':
      return pollRocm()
    default:
      return {}
  }
}

interface RawGpuMetric {
  name: string
  temp: number
  load: number
  power_consumption: number
  power_limit: number
  vram_used: number
  vram_total: number
  sclk_mhz: number
  mclk_mhz: number
}

function parseNvidiaSmi(): RawGpuMetric[] {
  const output = child_process.execSync('nvidia-smi --query-gpu=name,temperature.gpu,utilization.gpu,power.draw,power.limit,memory.used,memory.total,clocks.current.graphics,clocks.current.memory --format=csv,noheader,nounits', {
    encoding: 'utf-8',
  })

  const lines = output.trim().split('\n')
  return lines.map((line) => {
    const parts = line.split(',').map((p) => p.trim())
    return {
      name: parts[0],
      temp: parseFloat(parts[1]) || 0,
      load: parseFloat(parts[2]) || 0,
      power_consumption: parseFloat(parts[3]) || 0,
      power_limit: parseFloat(parts[4]) || 0,
      vram_used: parseFloat(parts[5]) || 0,
      vram_total: parseFloat(parts[6]) || 0,
      sclk_mhz: parseFloat(parts[7]) || 0,
      mclk_mhz: parseFloat(parts[8]) || 0,
    }
  })
}

function parseRocmSmi(): RawGpuMetric[] {
  const output = child_process.execSync('rocm-smi --showtemp --showclock --showpower --showmemused --showmemtotal --showgpuusage --json', {
    encoding: 'utf-8',
  })

  const data = JSON.parse(output)
  return Object.values(data).map((gpu: any) => ({
    name: gpu['GPU Label'] || `GPU ${gpu['GPU ID']}`,
    temp: gpu['edge temp']?.current || 0,
    load: gpu['GPU use (%)']?.current || 0,
    power_consumption: gpu['average power']?.current || 0,
    power_limit: gpu['max power input']?.current || 0,
    vram_used: (gpu['VHS used']?.current || 0) * 1024,
    vram_total: (gpu['VHS total']?.current || 0) * 1024,
    sclk_mhz: gpu['GPU clock']?.current || 0,
    mclk_mhz: gpu['Memory clock']?.current || 0,
  }))
}

function formatNvidiaOutput(metrics: RawGpuMetric[]): GpuMetricsMap {
  const result: GpuMetricsMap = {}
  metrics.forEach((m) => {
    result[m.name] = {
      temp: m.temp,
      load: m.load,
      power_consumption: m.power_consumption,
      power_limit: m.power_limit,
      vram_used: m.vram_used * 1024 * 1024,
      vram_total: m.vram_total * 1024 * 1024,
      sclk_mhz: m.sclk_mhz,
      mclk_mhz: m.mclk_mhz,
    }
  })
  return result
}

function formatRocmOutput(metrics: RawGpuMetric[]): GpuMetricsMap {
  const result: GpuMetricsMap = {}
  metrics.forEach((m) => {
    result[m.name] = {
      temp: m.temp,
      load: m.load,
      power_consumption: m.power_consumption,
      power_limit: m.power_limit,
      vram_used: m.vram_used,
      vram_total: m.vram_total,
      sclk_mhz: m.sclk_mhz,
      mclk_mhz: m.mclk_mhz,
    }
  })
  return result
}

function pollNvidia(): GpuMetricsMap {
  try {
    const metrics = parseNvidiaSmi()
    return formatNvidiaOutput(metrics)
  } catch {
    return {}
  }
}

function pollRocm(): GpuMetricsMap {
  try {
    const metrics = parseRocmSmi()
    return formatRocmOutput(metrics)
  } catch {
    return {}
  }
}
