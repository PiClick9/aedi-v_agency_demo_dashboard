/** Data model and generators for the Creator Sign-up Report (Figma 3910:19916).
 *
 * The date range picks a window of days; the graph tab picks the granularity:
 *  - Daily  → one column per real day that has data in the window
 *  - Weekly → one column per week that has data
 * Bar width adapts to the column count, so a day view over a month reads as a
 * long row of thin bars while a single day reads as a couple of wide ones.
 *
 * Rules preserved from before: the table lists only paying creators (no $0/"-"
 * rows), sign-ups = subscribers + a per-day lead surplus (>= 1) so the sign-up
 * bar is always taller, and empty days are not drawn. */

export type Creator = {
  id: number
  signUpDate: string
  creator: string
  promoCredit: string
  startDate: string
  plan: string
  lastPayment: string
  amount: string
  markup: string
  amountNum: number
  markupNum: number
}

export type Bucket = {
  label: string
  dateStr: string
  signUps: number
  subscribers: number
  markup: number
}

export type Card = { label: string; value: string; delta: string; accent: string }

export type Range = 'Today' | 'Last 7 days' | 'This Month' | 'Last Month'
export type GraphTab = 'Daily' | 'Weekly'

export const DATE_TABS: Range[] = ['Today', 'Last 7 days', 'This Month', 'Last Month']
export const GRAPH_TABS: GraphTab[] = ['Daily', 'Weekly']

const ACCENTS = [
  'var(--color-border-pd01)',
  'var(--color-border-pd02)',
  'var(--color-border-pd06)',
  'var(--color-border-pd03)',
  'var(--color-border-pd04)',
]

/* --------------------------------------------------------------- helpers -- */

const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min
const round2 = (n: number) => Math.round(n * 100) / 100
const pad = (n: number) => String(n).padStart(2, '0')

const money = (n: number) => `$${n.toFixed(2)}`
const moneySum = (n: number) => `$${n.toFixed(2).replace(/\.?0+$/, '') || '0'}`

const fmtDate = (d: Date) => `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`
const fmtLabel = (d: Date) => `${pad(d.getMonth() + 1)}/${pad(d.getDate())}`
const parseDate = (s: string) => {
  const [y, m, d] = s.split('.').map(Number)
  return new Date(y, m - 1, d)
}
/** Monday of the week the date falls in, as a YYYY.MM.DD key. */
const weekStart = (s: string) => {
  const d = parseDate(s)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return fmtDate(d)
}

const nextCreatorName = (creators: Creator[]) => {
  const max = creators.reduce((m, c) => {
    const n = Number(c.creator.replace(/\D/g, ''))
    return Number.isFinite(n) && n > m ? n : m
  }, 0)
  return `Creator${max + 1}`
}

/** Lead surplus for a day, kept close to its subscriber count so the
    subscriber bar is a healthy — and varied — fraction of the sign-up bar. */
const surplusFor = (subscribers: number) => (subscribers > 0 ? randInt(1, subscribers + 1) : 1)

/* -------------------------------------------------------------- creators -- */

const makeCreatorRow = (id: number, name: string, dateStr: string, amountNum: number): Creator => ({
  id,
  signUpDate: dateStr,
  creator: name,
  promoCredit: '60:00',
  startDate: dateStr,
  plan: 'Standard',
  lastPayment: dateStr,
  amount: money(amountNum),
  markup: money(round2(amountNum * 0.2)),
  amountNum,
  markupNum: round2(amountNum * 0.2),
})

const randomAmount = () => round2(17.05 * randInt(1, 3))

export type Extras = Record<string, number>
export type Dataset = { creators: Creator[]; extras: Extras; cards: Card[] }

/* --------------------------------------------------------------- derive -- */

const groupBuckets = (
  creators: Creator[],
  extras: Extras,
  keyOf: (dateStr: string) => string,
): Bucket[] => {
  const map = new Map<string, { subs: number; markup: number; extra: number }>()
  for (const c of creators) {
    const key = keyOf(c.signUpDate)
    const cur = map.get(key) ?? { subs: 0, markup: 0, extra: 0 }
    cur.subs += 1
    cur.markup += c.markupNum
    map.set(key, cur)
  }
  // The lead surplus is per day; a weekly bucket sums the surpluses of its days.
  const days = new Set(creators.map((c) => c.signUpDate))
  const extraByKey = new Map<string, number>()
  for (const day of days) {
    const key = keyOf(day)
    extraByKey.set(key, (extraByKey.get(key) ?? 0) + (extras[day] ?? 1))
  }
  return [...map.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([key, v]) => {
      const extra = extraByKey.get(key) ?? 1
      return {
        label: fmtLabel(parseDate(key)),
        dateStr: key,
        subscribers: v.subs,
        signUps: v.subs + extra,
        markup: round2(v.markup),
      }
    })
}

export const deriveChart = (creators: Creator[], extras: Extras, tab: GraphTab): Bucket[] =>
  tab === 'Weekly'
    ? groupBuckets(creators, extras, weekStart)
    : groupBuckets(creators, extras, (d) => d)

export type Values = { signUps: number; subs: number; conv: number; payment: number; markup: number }

export const deriveValues = (creators: Creator[], extras: Extras): Values => {
  const chart = deriveChart(creators, extras, 'Daily')
  const signUps = chart.reduce((s, b) => s + b.signUps, 0)
  const subs = creators.length
  return {
    signUps,
    subs,
    conv: signUps ? Math.round((subs / signUps) * 100) : 0,
    payment: round2(creators.reduce((s, c) => s + c.amountNum, 0)),
    markup: round2(creators.reduce((s, c) => s + c.markupNum, 0)),
  }
}

export const buildCards = (v: Values, prev: Values): Card[] => [
  { label: 'Sign-ups', value: `${v.signUps}`, delta: `${prev.signUps}`, accent: ACCENTS[0] },
  { label: 'Subscribers', value: `${v.subs}`, delta: `${prev.subs}`, accent: ACCENTS[1] },
  { label: 'Conversion Rate', value: `${v.conv}%`, delta: `${prev.conv}%`, accent: ACCENTS[2] },
  { label: 'Payment Amount', value: moneySum(v.payment), delta: moneySum(prev.payment), accent: ACCENTS[3] },
  { label: 'Markup', value: moneySum(v.markup), delta: moneySum(prev.markup), accent: ACCENTS[4] },
]

const priorOf = (v: Values): Values => ({
  signUps: Math.max(0, Math.round(v.signUps * 0.7)),
  subs: Math.max(0, Math.round(v.subs * 0.7)),
  conv: Math.max(0, Math.round(v.conv * 0.9)),
  payment: round2(v.payment * 0.75),
  markup: round2(v.markup * 0.75),
})

export const cardsFor = (creators: Creator[], extras: Extras, prev?: Values): Card[] => {
  const values = deriveValues(creators, extras)
  return buildCards(values, prev ?? priorOf(values))
}

/* --------------------------------------------------------------- mutate -- */

/** A new paying creator on a day that already has data, so the surplus (and
    thus the Sign-ups total) is already defined and the total moves by one. */
export const makeCreator = (creators: Creator[]): Creator => {
  const days = [...new Set(creators.map((c) => c.signUpDate))]
  const day = days.length ? days[randInt(0, days.length - 1)] : fmtDate(TODAY)
  const id = creators.reduce((m, c) => Math.max(m, c.id), 0) + 1
  return makeCreatorRow(id, nextCreatorName(creators), day, randomAmount())
}

/* ------------------------------------------------------------- generation -- */

// Fixed reference date so ranges are stable within a session.
const TODAY = new Date('2026-07-21T00:00:00')

const windowDays = (range: Range): Date[] => {
  if (range === 'Today') return [new Date(TODAY)]
  if (range === 'Last 7 days') {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(TODAY)
      d.setDate(TODAY.getDate() - (6 - i))
      return d
    })
  }
  const base = range === 'This Month' ? TODAY : new Date(TODAY.getFullYear(), TODAY.getMonth() - 1, 1)
  const days = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate()
  return Array.from({ length: days }, (_, i) => new Date(base.getFullYear(), base.getMonth(), i + 1))
}

const CREATOR_COUNT: Record<Range, [number, number]> = {
  Today: [2, 6],
  'Last 7 days': [10, 16],
  'This Month': [22, 36],
  'Last Month': [22, 36],
}

export const generateDataset = (range: Range): Dataset => {
  const days = windowDays(range).map(fmtDate)
  const [lo, hi] = CREATOR_COUNT[range]
  const count = Math.max(days.length <= 7 ? days.length : 1, randInt(lo, hi))

  const creators: Creator[] = []
  let id = 1
  // Small windows: seed one per day so every day shows. Larger windows scatter.
  if (days.length <= 7) days.forEach((d) => creators.push(makeCreatorRow(id++, `Creator${id - 1}`, d, randomAmount())))
  while (creators.length < count) {
    const d = days[randInt(0, days.length - 1)]
    creators.push(makeCreatorRow(id++, `Creator${id - 1}`, d, randomAmount()))
  }

  const extras: Extras = {}
  for (const day of new Set(creators.map((c) => c.signUpDate))) {
    extras[day] = surplusFor(creators.filter((c) => c.signUpDate === day).length)
  }

  creators.sort((a, b) => (a.signUpDate < b.signUpDate ? 1 : -1))
  return { creators, extras, cards: cardsFor(creators, extras) }
}

/* --------------------------------------------------------------- initial -- */

// Fixed default (Last 7 days, Daily). Subscribers per day: [4,1,3,1,5,2] with
// surpluses below — a mix of high days (07/24 ~75%) and low ones (07/25 ~25%),
// so both the heights and, across views, the bar widths vary.
export const INITIAL_EXTRAS: Extras = {
  '2026.07.22': 2,
  '2026.07.23': 2,
  '2026.07.24': 1,
  '2026.07.25': 3,
  '2026.07.26': 2,
  '2026.07.27': 3,
}

const initialRow = (id: number, dateStr: string, amountNum: number) =>
  makeCreatorRow(id, `Creator${id}`, dateStr, amountNum)

export const INITIAL_CREATORS: Creator[] = [
  initialRow(16, '2026.07.27', 34.1),
  initialRow(15, '2026.07.27', 17.05),
  initialRow(14, '2026.07.26', 17.05),
  initialRow(13, '2026.07.26', 34.1),
  initialRow(12, '2026.07.26', 17.05),
  initialRow(11, '2026.07.26', 17.05),
  initialRow(10, '2026.07.26', 34.1),
  initialRow(9, '2026.07.25', 17.05),
  initialRow(8, '2026.07.24', 17.05),
  initialRow(7, '2026.07.24', 34.1),
  initialRow(6, '2026.07.24', 17.05),
  initialRow(5, '2026.07.23', 17.05),
  initialRow(4, '2026.07.22', 34.1),
  initialRow(3, '2026.07.22', 17.05),
  initialRow(2, '2026.07.22', 17.05),
  initialRow(1, '2026.07.22', 17.05),
]

export const INITIAL_CARDS: Card[] = cardsFor(INITIAL_CREATORS, INITIAL_EXTRAS)

/* --------------------------------------------------------------- layout -- */

const BASELINE = 281
const MAX_BAR_H = 203
const MAX_BAR_W = 50
const LABEL_Y = 292
const GRIDLINES = 5

export const CHART_VIEW = { width: 1200, height: 316.245 }

/** Turn buckets into chart geometry. Bar width adapts to the column count
    (wide for a few columns, thin for many); heights are normalised so the
    tallest bar fills the plot and every bar shares the baseline. */
export const layoutChart = (buckets: Bucket[]) => {
  const n = Math.max(1, buckets.length)
  const slot = CHART_VIEW.width / n
  const gap = Math.min(10, slot * 0.12)
  const barW = Math.max(4, Math.min(MAX_BAR_W, (slot * 0.68 - gap) / 2))
  const groupW = barW * 2 + gap
  const maxCount = Math.max(1, ...buckets.flatMap((b) => [b.signUps, b.subscribers]))
  const maxMarkup = Math.max(1, ...buckets.map((b) => b.markup))
  const labelStep = Math.ceil(n / 12)

  const bars: { x: number; y: number; w: number; h: number; fill: string }[] = []
  const dots: { x: number; y: number }[] = []
  const labels: { x: number; y: number; text: string }[] = []

  buckets.forEach((b, i) => {
    const startX = i * slot + (slot - groupW) / 2
    const suH = (b.signUps / maxCount) * MAX_BAR_H
    const sbH = (b.subscribers / maxCount) * MAX_BAR_H
    bars.push({ x: startX, y: BASELINE - suH, w: barW, h: suH, fill: 'var(--color-border-pd01)' })
    bars.push({ x: startX + barW + gap, y: BASELINE - sbH, w: barW, h: sbH, fill: 'var(--color-border-pd02)' })

    const cx = i * slot + slot / 2
    dots.push({ x: cx, y: BASELINE - (0.14 + 0.72 * (b.markup / maxMarkup)) * MAX_BAR_H })
    if (i % labelStep === 0 || i === n - 1) labels.push({ x: cx, y: LABEL_Y + 13, text: b.label })
  })

  const grid = Array.from({ length: GRIDLINES + 1 }, (_, i) => BASELINE - (i / GRIDLINES) * BASELINE)
  const line = dots.map((d) => `${d.x},${d.y}`).join(' ')
  return { ...CHART_VIEW, baseline: BASELINE, barW, bars, dots, labels, line, grid }
}
