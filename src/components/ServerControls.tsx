import { useState, useEffect, useRef, useMemo } from 'react'

interface LlamaMetrics {
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

const TPS_HISTORY_SIZE = 30

function TpsLineChart({ values, color, label }: { values: number[]; color: string; label: string }) {
  const width = 400
  const height = 72
  const padding = { top: 8, right: 10, bottom: 16, left: 40 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  const maxVal = useMemo(() => Math.max(...values, 1), [values])
  const minVal = useMemo(() => Math.min(...values.filter(v => v > 0), 0), [values])
  const range = maxVal - minVal || 1

  const pointCount = Math.max(values.length, TPS_HISTORY_SIZE)

  const pathD = useMemo(() => {
    if (pointCount < 2) return ''
    return values
      .map((v, i) => {
        const x = padding.left + (i / (pointCount - 1)) * chartWidth
        const y = padding.top + chartHeight - ((v - minVal) / range) * chartHeight
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
      })
      .join(' ')
  }, [values, pointCount, minVal, range, chartWidth, chartHeight, padding.left, padding.top])

  const gridLines = useMemo(() => {
    const lines: { y: number; label: string }[] = []
    const steps = 3
    for (let i = 0; i <= steps; i++) {
      const val = minVal + (range * i) / steps
      const y = padding.top + chartHeight - (i / steps) * chartHeight
      lines.push({ y, label: val.toFixed(0) })
    }
    return lines
  }, [minVal, range, chartHeight, padding.top])

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: color, marginBottom: 4 }}>{label}</div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
        preserveAspectRatio="xMidYMid meet"
      >
        {gridLines.map((line, i) => (
          <g key={i}>
            <line
              x1={padding.left}
              y1={line.y}
              x2={width - padding.right}
              y2={line.y}
              stroke="var(--line)"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
            <text
              x={padding.left - 5}
              y={line.y + 4}
              textAnchor="end"
              fontSize={9}
              fill="var(--muted)"
              fontFamily="monospace"
            >
              {line.label}
            </text>
          </g>
        ))}
        {pathD && (
          <path
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
      </svg>
    </div>
  )
}

export function ServerControls() {
  const [connected, setConnected] = useState(false)
  const [metrics, setMetrics] = useState<LlamaMetrics | null>(null)
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [promptHistory, setPromptHistory] = useState<number[]>([])
  const [genHistory, setGenHistory] = useState<number[]>([])
  const promptRef = useRef<number[]>([])
  const genRef = useRef<number[]>([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const statusRes = await fetch((window.API_BASE || '') + '/api/llama/status')
        const status = await statusRes.json()

        if (status.ok && status.metrics) {
          setConnected(status.connected)
          setMetrics(status.metrics)

          // Track TPS history
          const newPrompt = [...promptRef.current, status.metrics.prompt_tokens_per_sec].slice(-TPS_HISTORY_SIZE)
          const newGen = [...genRef.current, status.metrics.generation_tokens_per_sec].slice(-TPS_HISTORY_SIZE)
          promptRef.current = newPrompt
          genRef.current = newGen
          setPromptHistory(newPrompt)
          setGenHistory(newGen)
        }
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 2000)
    return () => clearInterval(interval)
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSaveMsg('')
    try {
      await fetch((window.API_BASE || '') + '/api/llama/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ llama_server_url: url.trim(), models_dir: '', gpu_backend: 'none' }),
      })
      setSaveMsg('Saved!')
      setTimeout(() => setSaveMsg(''), 2000)
    } catch {
      setSaveMsg('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="server-controls">
        <h3>llama.cpp Server</h3>
        <p className="empty-state">Loading...</p>
      </div>
    )
  }

  return (
    <div className="server-controls">
      <h3>llama.cpp Server</h3>

      <div className="server-config">
        <h4>Connection</h4>
        <div>
          <label htmlFor="llama-server-url">Server URL</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              id="llama-server-url"
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="http://10.10.42.94:8080"
              className="field"
              style={{ flex: 1 }}
            />
            <button onClick={handleSave} className="btn btn-start" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
            {saveMsg && <span style={{ fontSize: 12, color: 'var(--teal)', marginLeft: 4 }}>{saveMsg}</span>}
          </div>
        </div>

        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              fontWeight: 500,
              color: connected ? 'var(--green)' : 'var(--red)',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: connected ? 'var(--green)' : 'var(--red)',
                boxShadow: `0 0 6px ${connected ? 'var(--green)' : 'var(--red)'}80`,
              }}
            />
            {connected ? 'Connected' : 'Disconnected'}
          </span>
          {url && <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace' }}>{url}</span>}
        </div>
      </div>

      {(promptHistory.length >= 2 || genHistory.length >= 2) && (
        <div>
          <h4>TPS History</h4>
          <div style={{ background: 'var(--paper)', borderRadius: 8, padding: '8px 12px 12px' }}>
            <TpsLineChart values={promptHistory} color="var(--teal)" label="Prompt TPS" />
            <TpsLineChart values={genHistory} color="var(--sand)" label="Generation TPS" />
          </div>
        </div>
      )}

      {metrics && (
        <div className="server-metrics">
          <h4>Live Metrics</h4>
          <div className="metrics-grid">
            <div className="metric-item">
              <span className="metric-label">Prompt TPS:</span>
              <span className="metric-value">{metrics.prompt_tokens_per_sec.toFixed(1)}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Gen TPS:</span>
              <span className="metric-value">{metrics.generation_tokens_per_sec.toFixed(1)}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Prompt Total:</span>
              <span className="metric-value">{metrics.prompt_tokens_total}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Gen Total:</span>
              <span className="metric-value">{metrics.predicted_tokens_total}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">KV Cache:</span>
              <span className="metric-value">{metrics.kv_cache_tokens} / {metrics.kv_cache_max}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Slots:</span>
              <span className="metric-value">{metrics.slots_processing} / {metrics.slots_idle + metrics.slots_processing}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
