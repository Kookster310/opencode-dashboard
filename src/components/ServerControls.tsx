import { useState, useEffect } from 'react'

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

export function ServerControls() {
  const [connected, setConnected] = useState(false)
  const [metrics, setMetrics] = useState<LlamaMetrics | null>(null)
  const [url, setUrl] = useState('')
  const [logs, setLogs] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statusRes, settingsRes] = await Promise.all([
          fetch((window.API_BASE || '') + '/api/llama/status'),
          fetch((window.API_BASE || '') + '/api/llama/settings'),
        ])

        const status = await statusRes.json()
        const settings = await settingsRes.json()

        if (status.ok) {
          setConnected(status.connected)
          setMetrics(status.metrics)
          setLogs(status.logs.slice(-20))
          if (status.url) setUrl(status.url)
        }
        if (settings.ok && settings.settings?.llama_server_url) {
          setUrl(settings.settings.llama_server_url)
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
        <div className="form-group">
          <label>Server URL</label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="http://10.10.42.94:8080"
          />
        </div>
        <div className="server-actions">
          <button onClick={handleSave} className="btn btn-start" disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
          {saveMsg && <span className="muted" style={{ marginLeft: 8 }}>{saveMsg}</span>}
        </div>
      </div>

      <div className="server-status">
        <span className={`status-indicator ${connected ? 'running' : 'stopped'}`}>
          {connected ? '● Connected' : '● Disconnected'}
        </span>
        {url && <span className="muted mono" style={{ marginLeft: 12, fontSize: 12 }}>{url}</span>}
      </div>

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

      {logs.length > 0 && (
        <div className="server-logs">
          <h4>Logs</h4>
          <pre className="logs-output">
            {logs.map((log, i) => (
              <div key={i}>{log}</div>
            ))}
          </pre>
        </div>
      )}
    </div>
  )
}
