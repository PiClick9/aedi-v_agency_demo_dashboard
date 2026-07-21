import { layoutChart, type Bucket } from '../data/report'
import styles from './SignupChart.module.css'

/**
 * Sign-ups / Subscribers bars with the Markup line (Figma node 3910:19994).
 * Geometry is computed from the buckets, so the plot reacts to data changes,
 * and the marks carry CSS transitions so those changes animate smoothly.
 */
export default function SignupChart({ className, buckets }: { className?: string; buckets: Bucket[] }) {
  const { width, height, bars, dots, labels, grid } = layoutChart(buckets)
  const linePath = dots.map((d, i) => `${i === 0 ? 'M' : 'L'} ${d.x} ${d.y}`).join(' ')

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
        <rect
          key={i}
          className={styles.bar}
          x={bar.x}
          y={bar.y}
          width={bar.w}
          height={bar.h}
          fill={bar.fill}
        />
      ))}

      <path
        className={styles.line}
        d={linePath || 'M 0 0'}
        fill="none"
        stroke="var(--color-border-pd04)"
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {dots.map((d, i) => (
        <circle key={i} className={styles.dot} cx={d.x} cy={d.y} r="6.95" fill="var(--color-border-pd04)" />
      ))}

      {labels.map((label, i) => (
        <text
          key={i}
          className={styles.label}
          x={label.x}
          y={label.y}
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
