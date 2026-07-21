import { useEffect, useRef, useState } from 'react'
import calendarIcon from '../assets/icon-calendar.svg'
import styles from './DatePicker.module.css'

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const pad = (n: number) => String(n).padStart(2, '0')
const parse = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return { y, m: m - 1, d }
}
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`

type Props = {
  value: string // YYYY-MM-DD
  onChange: (value: string) => void
  min?: string
  max?: string
  ariaLabel: string
}

/** A date field with a month calendar popup. Min/max disable out-of-range days
    so the start never passes the end (and vice versa). */
export default function DatePicker({ value, onChange, min, max, ariaLabel }: Props) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState(() => {
    const { y, m } = parse(value)
    return { y, m }
  })
  const ref = useRef<HTMLDivElement>(null)

  // Reopen on the selected month, and dismiss on outside click / Escape.
  useEffect(() => {
    if (!open) return
    const { y, m } = parse(value)
    setView({ y, m })
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, value])

  const startWeekday = new Date(view.y, view.m, 1).getDay()
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array<null>(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  const dayIso = (d: number) => iso(view.y, view.m, d)
  const disabled = (d: number) => {
    const v = dayIso(d)
    return (min !== undefined && v < min) || (max !== undefined && v > max)
  }
  const shift = (delta: number) =>
    setView((v) => {
      const d = new Date(v.y, v.m + delta, 1)
      return { y: d.getFullYear(), m: d.getMonth() }
    })

  return (
    <div className={styles.dateCell} ref={ref}>
      <button
        type="button"
        className={styles.dateField}
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <img className={styles.calendarIcon} src={calendarIcon} alt="" />
        <span className={styles.dateValue}>{value}</span>
      </button>

      {open && (
        <div className={styles.calPopup} role="dialog" aria-label={ariaLabel}>
          <div className={styles.calHead}>
            <button type="button" className={styles.calNav} onClick={() => shift(-1)} aria-label="Previous month">
              ‹
            </button>
            <span className={styles.calTitle}>
              {MONTHS[view.m]} {view.y}
            </span>
            <button type="button" className={styles.calNav} onClick={() => shift(1)} aria-label="Next month">
              ›
            </button>
          </div>

          <div className={styles.calGrid}>
            {WEEKDAYS.map((w) => (
              <span key={w} className={styles.calWeekday}>
                {w}
              </span>
            ))}
            {cells.map((d, i) =>
              d === null ? (
                <span key={`b${i}`} />
              ) : (
                <button
                  key={d}
                  type="button"
                  className={`${styles.calDay} ${dayIso(d) === value ? styles.calDaySelected : ''}`}
                  disabled={disabled(d)}
                  onClick={() => {
                    onChange(dayIso(d))
                    setOpen(false)
                  }}
                >
                  {d}
                </button>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  )
}
