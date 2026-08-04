import { useState, useEffect } from 'react'

interface ModelPreset {
  id: string
  name: string
  model_path: string
  context_size: number
  batch_size: number
  gpu_layers?: number
}

export function PresetsEditor() {
  const [presets, setPresets] = useState<ModelPreset[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingPreset, setEditingPreset] = useState<ModelPreset | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPresets()
  }, [])

  const fetchPresets = async () => {
    try {
      const res = await fetch((window.API_BASE || '') + '/api/llama/presets')
      const data = await res.json()
      if (data.ok) {
        setPresets(data.presets)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    const newPreset: ModelPreset = {
      id: `preset-${Date.now()}`,
      name: 'New Preset',
      model_path: '',
      context_size: 8192,
      batch_size: 512,
    }
    setEditingPreset(newPreset)
    setEditingId(newPreset.id)
  }

  const handleEdit = (preset: ModelPreset) => {
    setEditingPreset({ ...preset })
    setEditingId(preset.id)
  }

  const handleSave = async () => {
    if (!editingPreset) return

    try {
      if (presets.find((p) => p.id === editingPreset.id)) {
        await fetch(`/api/llama/presets/${editingPreset.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editingPreset),
        })
      } else {
        await fetch('/api/llama/presets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editingPreset),
        })
      }
    } catch {
      // ignore
    }

    setEditingId(null)
    setEditingPreset(null)
    fetchPresets()
  }

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/llama/presets/${id}`, { method: 'DELETE' })
      fetchPresets()
    } catch {
      // ignore
    }
  }

  const handleReset = async () => {
    try {
      await fetch('/api/llama/presets/reset', { method: 'POST' })
      fetchPresets()
    } catch {
      // ignore
    }
  }

  if (loading) {
    return (
      <div className="presets-editor">
        <h3>Presets</h3>
        <p className="empty-state">Loading...</p>
      </div>
    )
  }

  return (
    <div className="presets-editor">
      <div className="presets-header">
        <h3>Presets</h3>
        <div>
          <button onClick={handleCreate} className="btn btn-add">Add Preset</button>
          <button onClick={handleReset} className="btn btn-reset">Reset</button>
        </div>
      </div>

      <div className="presets-list">
        {presets.length === 0 ? (
          <p className="empty-state">No presets configured</p>
        ) : (
          presets.map((preset) => (
            <div key={preset.id} className={`preset-card ${editingId === preset.id ? 'editing' : ''}`}>
              {editingId === preset.id && editingPreset ? (
                <div className="preset-editor">
                  <div className="form-group">
                    <label>Name</label>
                    <input
                      type="text"
                      value={editingPreset.name}
                      onChange={(e) => setEditingPreset({ ...editingPreset, name: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Model Path</label>
                    <input
                      type="text"
                      value={editingPreset.model_path}
                      onChange={(e) => setEditingPreset({ ...editingPreset, model_path: e.target.value })}
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Context Size</label>
                      <input
                        type="number"
                        value={editingPreset.context_size}
                        onChange={(e) => setEditingPreset({ ...editingPreset, context_size: parseInt(e.target.value) || 8192 })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Batch Size</label>
                      <input
                        type="number"
                        value={editingPreset.batch_size}
                        onChange={(e) => setEditingPreset({ ...editingPreset, batch_size: parseInt(e.target.value) || 512 })}
                      />
                    </div>
                    <div className="form-group">
                      <label>GPU Layers</label>
                      <input
                        type="number"
                        value={editingPreset.gpu_layers || 0}
                        onChange={(e) => setEditingPreset({ ...editingPreset, gpu_layers: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                  <div className="preset-actions">
                    <button onClick={handleSave} className="btn btn-save">Save</button>
                    <button onClick={() => setEditingId(null)} className="btn btn-cancel">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="preset-summary">
                  <div className="preset-name">{preset.name}</div>
                  <div className="preset-details">
                    <span>{preset.context_size} ctx</span>
                    <span>{preset.batch_size} batch</span>
                    {preset.gpu_layers && <span>{preset.gpu_layers} gpu-layers</span>}
                    {preset.model_path && <span title={preset.model_path}>{preset.model_path.split('/').pop()}</span>}
                  </div>
                  <div className="preset-actions">
                    <button onClick={() => handleEdit(preset)} className="btn btn-edit">Edit</button>
                    <button onClick={() => handleDelete(preset.id)} className="btn btn-delete">Delete</button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
