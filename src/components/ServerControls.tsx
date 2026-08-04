import { useState, useEffect, useRef, useMemo } from 'react'

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
    <div style={{ marginBottom: 4 }}>
      <div style={{ fontSize: 9, fontWeight: 600, color: color, marginBottom: 4 }}>{label}</div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: '100%', maxWidth: '100%', display: 'block' }}
        preserveAspectRatio="none"
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
              fontSize={7}
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
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 2000)
    return () => clearInterval(interval)
  }, [])

  const hasData = promptHistory.length >= 2 || genHistory.length >= 2

  if (!hasData) {
    return <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>Waiting for data...</div>
  }

  return (
    <div style={{ background: 'var(--paper)', borderRadius: 8, padding: '8px 12px 12px' }}>
      <TpsLineChart values={promptHistory} color="var(--teal)" label="Prompt TPS" />
      <TpsLineChart values={genHistory} color="var(--sand)" label="Generation TPS" />
    </div>
  )
}
