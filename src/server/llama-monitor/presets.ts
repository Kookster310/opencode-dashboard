import type { ModelPreset } from './types'

const defaults: ModelPreset[] = [
  {
    id: 'default-7b',
    name: 'Default 7B',
    model_path: '',
    context_size: 8192,
    batch_size: 512,
    gpu_layers: 35,
  },
  {
    id: 'default-13b',
    name: 'Default 13B',
    model_path: '',
    context_size: 8192,
    batch_size: 512,
    gpu_layers: 45,
  },
  {
    id: 'default-70b',
    name: 'Default 70B',
    model_path: '',
    context_size: 4096,
    batch_size: 512,
    gpu_layers: 99,
  },
]

export function loadDefaultPresets(): ModelPreset[] {
  return JSON.parse(JSON.stringify(defaults))
}
