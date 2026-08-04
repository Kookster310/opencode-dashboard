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
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const statusRes = await fetch((window.API_BASE || '') + '/api/llama/status')
        const status = await statusRes.json()

        if (status.ok) {
          setConnected(status.connected)
          setMetrics(status.metrics)
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
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Server URL
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="http://10.10.42.94:8080"
              className="field"
              style={{ flex: 1 }}
            />
            <button onClick={handleSave} className="button" disabled={saving} style={{ whiteSpace: 'nowrap' }}>
              {saving ? 'Saving...' : 'Save'}
            </button>
            {saveMsg && <span style={{ fontSize: 12, color: 'var(--teal)' }}>{saveMsg}</span>}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
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
          {url && <span className="muted mono" style={{ fontSize: 11 }}>{url}</span>}
        </div>
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
    </div>
  )
}
