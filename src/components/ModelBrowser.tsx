import { useState, useEffect } from 'react'

interface DiscoveredModel {
  path: string
  filename: string
  size_bytes: number
  size_display: string
  quant_type?: string
  model_name?: string
  is_split: boolean
}

export function ModelBrowser() {
  const [models, setModels] = useState<DiscoveredModel[]>([])
  const [filter, setFilter] = useState('gguf')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPath, setSelectedPath] = useState('')
  const [loading, setLoading] = useState(true)
  const [modelsDir, setModelsDir] = useState('')

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const [settingsRes, browseRes] = await Promise.all([
          fetch((window.API_BASE || '') + '/api/llama/settings'),
          fetch((window.API_BASE || '') + '/api/llama/browse?filter=gguf'),
        ])

        const settings = await settingsRes.json()
        const browse = await browseRes.json()

        if (settings.ok && settings.settings?.models_dir) {
          setModelsDir(settings.settings.models_dir)
        }

        if (browse.ok) {
          setModels(browse.entries as DiscoveredModel[])
          setLoading(false)
        }
      } catch {
        setLoading(false)
      }
    }

    fetchModels()
  }, [])

  const handleRefresh = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/llama/models/refresh', { method: 'POST' })
      const data = await res.json()
      if (data.ok) {
        setModels([])
        const browseRes = await fetch((window.API_BASE || '') + '/api/llama/browse?filter=gguf')
        const browseData = await browseRes.json()
        if (browseData.ok) {
          setModels(browseData.entries as DiscoveredModel[])
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (path: string) => {
    setSelectedPath(path)
  }

  const filteredModels = models.filter((m) =>
    m.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.model_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="model-browser">
        <h3>Model Browser</h3>
        <p className="empty-state">Loading models...</p>
      </div>
    )
  }

  return (
    <div className="model-browser">
      <h3>Model Browser</h3>

      <div className="model-browser-controls">
        <div className="search-box">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search models..."
          />
        </div>
        <button onClick={handleRefresh} className="btn btn-refresh">
          Refresh
        </button>
      </div>

      <div className="model-list">
        {filteredModels.length === 0 ? (
          <p className="empty-state">No models found</p>
        ) : (
          filteredModels.map((model) => (
            <div
              key={model.path}
              className={`model-item ${selectedPath === model.path ? 'selected' : ''}`}
              onClick={() => handleSelect(model.path)}
            >
              <div className="model-info">
                <div className="model-name">{model.filename}</div>
                <div className="model-meta">
                  <span>{model.size_display}</span>
                  {model.quant_type && <span className="quant-type">{model.quant_type}</span>}
                  {model.is_split && <span className="split-badge">split</span>}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {selectedPath && (
        <div className="model-selected">
          <strong>Selected:</strong> {selectedPath}
          <button
            onClick={() => setSelectedPath('')}
            className="btn btn-clear"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  )
}
