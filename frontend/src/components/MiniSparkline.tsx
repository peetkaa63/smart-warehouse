import React from 'react'

interface MiniSparklineProps {
  values: number[]
  width?: number
  height?: number
  stroke?: string
}

const MiniSparkline: React.FC<MiniSparklineProps> = ({ values, width = 160, height = 40, stroke = '#1976d2' }) => {
  if (!values || values.length === 0) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const norm = (v: number) => {
    if (max === min) return height / 2
    return height - ((v - min) / (max - min)) * height
  }
  const step = width / Math.max(values.length - 1, 1)
  const d = values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${i * step} ${norm(v)}`).join(' ')

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <path d={d} fill="none" stroke={stroke} strokeWidth={2} />
    </svg>
  )
}

export default MiniSparkline


