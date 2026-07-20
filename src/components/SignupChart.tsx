import { CHART } from '../data/report'

const GRIDLINES = 5

/**
 * Sign-ups / Subscribers bars with the Markup line (Figma node 3910:19994).
 * Bar and dot coordinates come straight from the artboard, so the plot is a
 * direct transcription rather than a re-derived layout.
 */
export default function SignupChart({ className }: { className?: string }) {
  const { width, height, baseline, barWidth, labelY } = CHART
  const step = baseline / GRIDLINES

  return (
    <svg
      className={className}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Daily sign-ups, subscribers and markup"
      preserveAspectRatio="xMidYMid meet"
    >
      {Array.from({ length: GRIDLINES + 1 }, (_, i) => (
        <line
          key={i}
          x1="0"
          x2={width}
          y1={baseline - i * step}
          y2={baseline - i * step}
          stroke="var(--color-border-base)"
          strokeWidth="1"
        />
      ))}

      {CHART.signUps.map((bar) => (
        <rect
          key={`s${bar.x}`}
          x={bar.x}
          y={bar.y}
          width={barWidth}
          height={bar.h}
          fill="var(--color-border-pd01)"
        />
      ))}

      {CHART.subscribers.map((bar) => (
        <rect
          key={`b${bar.x}`}
          x={bar.x}
          y={bar.y}
          width={barWidth}
          height={bar.h}
          fill="var(--color-border-pd02)"
        />
      ))}

      <polyline
        points={CHART.markup.map((p) => `${p.x},${p.y}`).join(' ')}
        fill="none"
        stroke="var(--color-border-pd04)"
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {CHART.markup.map((p) => (
        <circle key={p.x} cx={p.x} cy={p.y} r="6.95" fill="var(--color-border-pd04)" />
      ))}

      {CHART.labels.map((label) => (
        <text
          key={label.text}
          x={label.x + 16}
          y={labelY + 13}
          textAnchor="middle"
          fontSize="12"
          fill="var(--color-text-base)"
        >
          {label.text}
        </text>
      ))}
    </svg>
  )
}
