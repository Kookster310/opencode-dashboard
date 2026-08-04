import { useState, useEffect } from 'react'

interface GpuMetrics {
  temp: number
  load: number
  power_consumption: number
  power_limit: number
  vram_used: number
  vram_total: number
  sclk_mhz: number
  mclk_mhz: number
}

interface GpuMetricsMap {
  [key: string]: GpuMetrics
}

export function GpuDashboard() {
  const [metrics, setMetrics] = useState<GpuMetricsMap>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch((window.API_BASE || '') + '/api/llama/gpu-metrics')
        const data = await res.json()
        if (data.ok) {
          setMetrics(data.metrics)
          setLoading(false)
        }
      } catch {
        setLoading(false)
      }
    }

    fetchMetrics()
    const interval = setInterval(fetchMetrics, 3000)
    return () => clearInterval(interval)
  }, [])

  if (loading || Object.keys(metrics).length === 0) {
    return (
      <div className="gpu-dashboard">
        <h3>GPU Metrics</h3>
        <p className="empty-state">No GPU data available</p>
      </div>
    )
  }

  return (
    <div className="gpu-dashboard">
      <h3>GPU Metrics</h3>
      <div className="gpu-grid">
        {Object.entries(metrics).map(([name, gpu]) => (
          <div key={name} className="gpu-card">
            <h4>{name}</h4>
            <div className="gpu-metrics">
              <div className="metric-row">
                <span>Load:</span>
                <span className="value">{gpu.load}%</span>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${gpu.load}%`, backgroundColor: getLoadColor(gpu.load) }}
                  />
                </div>
              </div>
              <div className="metric-row">
                <span>Temp:</span>
                <span className="value">{gpu.temp}°C</span>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${Math.min(gpu.temp, 100)}%`, backgroundColor: getTempColor(gpu.temp) }}
                  />
                </div>
              </div>
              <div className="metric-row">
                <span>Power:</span>
                <span className="value">{gpu.power_consumption}W / {gpu.power_limit}W</span>
              </div>
              <div className="metric-row">
                <span>VRAM:</span>
                <span className="value">{formatBytes(gpu.vram_used)} / {formatBytes(gpu.vram_total)}</span>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${(gpu.vram_used / gpu.vram_total) * 100}%`,
                      backgroundColor: getVramColor(gpu.vram_used, gpu.vram_total),
                    }}
                  />
                </div>
              </div>
              <div className="metric-row">
                <span>Memory Clock:</span>
                <span className="value">{gpu.mclk_mhz} MHz</span>
              </div>
              <div className="metric-row">
                <span>Shader Clock:</span>
                <span className="value">{gpu.sclk_mhz} MHz</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function getLoadColor(load: number): string {
  if (load < 50) return '#4ade80'
  if (load < 80) return '#fbbf24'
  return '#ef4444'
}

function getTempColor(temp: number): string {
  if (temp < 60) return '#4ade80'
  if (temp < 75) return '#fbbf24'
  return '#ef4444'
}

function getVramColor(used: number, total: number): string {
  const ratio = used / total
  if (ratio < 0.7) return '#4ade80'
  if (ratio < 0.9) return '#fbbf24'
  return '#ef4444'
}

function formatBytes(bytes: number): string {
  if (bytes >= 1073741824) {
    return `${(bytes / 1073741824).toFixed(1)} GB`
  }
  if (bytes >= 1048576) {
    return `${Math.floor(bytes / 1048576)} MB`
  }
  return `${Math.floor(bytes / 1024)} KB`
}
