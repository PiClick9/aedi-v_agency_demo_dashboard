import { layoutChart, type Bucket } from '../data/report'

/**
 * Sign-ups / Subscribers bars with the Markup line (Figma node 3910:19994).
 * Geometry is computed from the buckets, so the plot reacts to data changes.
 */
export default function SignupChart({ className, buckets }: { className?: string; buckets: Bucket[] }) {
  const { width, height, bars, dots, labels, line, grid } = layoutChart(buckets)

  return (
    <svg
      className={className}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Daily sign-ups, subscribers and markup"
      preserveAspectRatio="xMidYMid meet"
    >
      {grid.map((y, i) => (
        <line key={i} x1="0" x2={width} y1={y} y2={y} stroke="var(--color-border-base)" strokeWidth="1" />
      ))}

      {bars.map((bar, i) => (
        <rect key={i} x={bar.x} y={bar.y} width={bar.w} height={bar.h} fill={bar.fill} />
      ))}

      <polyline
        points={line}
        fill="none"
        stroke="var(--color-border-pd04)"
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r="6.95" fill="var(--color-border-pd04)" />
      ))}

      {labels.map((label, i) => (
        <text key={i} x={label.x} y={label.y} textAnchor="middle" fontSize="12" fill="var(--color-text-base)">
          {label.text}
        </text>
      ))}
    </svg>
  )
}
