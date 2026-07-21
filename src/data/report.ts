/** Data model and generators for the Creator Sign-up Report (Figma 3910:19916).
 *
 * The initial state reproduces the design exactly. Interactions (date-range
 * tabs, Add Creator, Delete) generate or mutate data, and the summary cards
 * and chart are derived from it so everything reacts together. */

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
  subscribed: boolean
}

/** One column of the chart: a day (daily ranges) or a week (month ranges). */
export type Bucket = {
  label: string // axis label, e.g. "07/22"
  dateStr: string // representative date for new rows, e.g. "2026.07.22"
  signUps: number
  subscribers: number
  markup: number
}

export type Card = { label: string; value: string; delta: string; accent: string }

export type Range = 'Today' | 'Last 7 days' | 'This Month' | 'Last Month'
export type GraphTab = 'Daily' | 'Weekly' | 'Monthly' | 'Yearly'

export const DATE_TABS: Range[] = ['Today', 'Last 7 days', 'This Month', 'Last Month']
export const GRAPH_TABS: GraphTab[] = ['Daily', 'Weekly', 'Monthly', 'Yearly']

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

const money = (n: number) => (n === 0 ? '$0' : `$${n.toFixed(2)}`)
/** Summary money drops trailing zeros, as the design does ($68.2, not $68.20). */
const moneySum = (n: number) => `$${n.toFixed(2).replace(/\.?0+$/, '') || '0'}`

const nextCreatorName = (creators: Creator[]) => {
  const max = creators.reduce((m, c) => {
    const n = Number(c.creator.replace(/\D/g, ''))
    return Number.isFinite(n) && n > m ? n : m
  }, 0)
  return `Creator${max + 1}`
}

/* --------------------------------------------------------------- initial -- */

const mk = (
  id: number,
  signUpDate: string,
  creator: string,
  subscribed: boolean,
  startDate: string,
  lastPayment: string,
  amountNum: number,
): Creator => ({
  id,
  signUpDate,
  creator,
  promoCredit: '60:00',
  startDate,
  plan: subscribed ? 'Standard' : '-',
  lastPayment,
  amount: money(amountNum),
  markup: money(round2(amountNum * 0.2)),
  amountNum,
  markupNum: round2(amountNum * 0.2),
  subscribed,
})

export const INITIAL_CREATORS: Creator[] = [
  mk(5, '2026.07.27', 'Creator5', false, '-', '-', 0),
  mk(4, '2026.07.26', 'Creator4', true, '2026.07.29', '2026.07.26', 17.05),
  mk(3, '2026.07.22', 'Creator3', true, '2026.07.26', '2026.07.26', 17.05),
  mk(2, '2026.07.22', 'Creator2', true, '2026.07.26', '2026.07.26', 17.05),
  mk(1, '2026.07.22', 'Creator1', true, '2026.07.26', '2026.07.26', 17.05),
]

/** Chart series for the initial view. Independent of the five table rows, as
    in the design — chosen so the layout reproduces the design's bar shape. */
export const INITIAL_BUCKETS: Bucket[] = [
  { label: '07/22', dateStr: '2026.07.22', signUps: 4, subscribers: 7, markup: 23 },
  { label: '07/23', dateStr: '2026.07.23', signUps: 7, subscribers: 2, markup: 78 },
  { label: '07/24', dateStr: '2026.07.24', signUps: 6, subscribers: 2, markup: 40 },
  { label: '07/25', dateStr: '2026.07.25', signUps: 8, subscribers: 5, markup: 143 },
  { label: '07/26', dateStr: '2026.07.26', signUps: 6, subscribers: 5, markup: 138 },
  { label: '07/27', dateStr: '2026.07.27', signUps: 2, subscribers: 10, markup: 85 },
]

/** Exact design strings, so the initial render matches the audit spec. */
export const INITIAL_CARDS: Card[] = [
  { label: 'Sign-ups', value: '5', delta: '3', accent: ACCENTS[0] },
  { label: 'Subscribers', value: '4', delta: '0', accent: ACCENTS[1] },
  { label: 'Conversion Rate', value: '80%', delta: '0%', accent: ACCENTS[2] },
  { label: 'Payment Amount', value: '$68.2', delta: '$51.15', accent: ACCENTS[3] },
  { label: 'Markup', value: '$13.64', delta: '$10.23', accent: ACCENTS[4] },
]

/* ------------------------------------------------------------ summaries -- */

export type Values = { signUps: number; subs: number; conv: number; payment: number; markup: number }

export const computeValues = (creators: Creator[]): Values => {
  const signUps = creators.length
  const subs = creators.filter((c) => c.subscribed).length
  return {
    signUps,
    subs,
    conv: signUps ? Math.round((subs / signUps) * 100) : 0,
    payment: round2(creators.reduce((s, c) => s + c.amountNum, 0)),
    markup: round2(creators.reduce((s, c) => s + c.markupNum, 0)),
  }
}

/** `prev` fills the small delta line under each card (the "previous period"). */
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

/* ------------------------------------------------------------- creators -- */

const makeCreatorRow = (id: number, name: string, bucket: Bucket): Creator => {
  const subscribed = Math.random() < 0.8
  const amountNum = subscribed ? round2(17.05 * randInt(1, 3)) : 0
  return mk(
    id,
    bucket.dateStr,
    name,
    subscribed,
    subscribed ? bucket.dateStr : '-',
    subscribed ? bucket.dateStr : '-',
    amountNum,
  )
}

/** A single new creator for Add Creator, plus the bucket it belongs to. */
export const makeCreator = (creators: Creator[], buckets: Bucket[]) => {
  const bucketIndex = randInt(0, buckets.length - 1)
  const id = creators.reduce((m, c) => Math.max(m, c.id), 0) + 1
  const creator = makeCreatorRow(id, nextCreatorName(creators), buckets[bucketIndex])
  return { creator, bucketIndex }
}

/** Fold a creator into a bucket so the chart reflects the added row. */
export const bumpBucket = (buckets: Bucket[], index: number, creator: Creator): Bucket[] =>
  buckets.map((b, i) =>
    i === index
      ? {
          ...b,
          signUps: b.signUps + 1,
          subscribers: b.subscribers + (creator.subscribed ? 1 : 0),
          markup: b.markup + creator.markupNum,
        }
      : b,
  )

/* ----------------------------------------------------------- generation -- */

// Fixed reference date so ranges are stable within a session.
const TODAY = new Date('2026-07-21T00:00:00')

const dayBucket = (d: Date): Bucket => ({
  label: `${pad(d.getMonth() + 1)}/${pad(d.getDate())}`,
  dateStr: `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`,
  signUps: 0,
  subscribers: 0,
  markup: 0,
})

const weekBuckets = (year: number, month: number): Bucket[] => {
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const buckets: Bucket[] = []
  for (let start = 1; start <= daysInMonth; start += 7) {
    buckets.push(dayBucket(new Date(year, month, start)))
  }
  return buckets
}

const rangeBuckets = (range: Range): Bucket[] => {
  if (range === 'Today') return [dayBucket(TODAY)]
  if (range === 'Last 7 days') {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(TODAY)
      d.setDate(TODAY.getDate() - (6 - i))
      return dayBucket(d)
    })
  }
  if (range === 'This Month') return weekBuckets(TODAY.getFullYear(), TODAY.getMonth())
  const prev = new Date(TODAY.getFullYear(), TODAY.getMonth() - 1, 1)
  return weekBuckets(prev.getFullYear(), prev.getMonth())
}

const CREATOR_COUNT: Record<Range, [number, number]> = {
  Today: [1, 4],
  'Last 7 days': [6, 12],
  'This Month': [12, 28],
  'Last Month': [12, 28],
}

/** Build a full, coherent dataset for a date range: creators bucketed by
    sign-up date, summary and chart series derived from them. */
export const generateDataset = (range: Range) => {
  const buckets = rangeBuckets(range).map((b) => ({ ...b }))
  const [lo, hi] = CREATOR_COUNT[range]
  const count = randInt(lo, hi)

  const creators: Creator[] = []
  for (let i = 0; i < count; i++) {
    const bi = randInt(0, buckets.length - 1)
    const c = makeCreatorRow(i + 1, `Creator${i + 1}`, buckets[bi])
    creators.push(c)
    buckets[bi].signUps += 1
    if (c.subscribed) {
      buckets[bi].subscribers += 1
      buckets[bi].markup += c.markupNum
    }
  }

  creators.sort((a, b) => (a.signUpDate < b.signUpDate ? 1 : -1))
  const values = computeValues(creators)
  return { creators, buckets, cards: buildCards(values, priorOf(values)) }
}

/* --------------------------------------------------------------- layout -- */

const BASELINE = 281
const MAX_BAR_H = 203
const BAR_W = 50
const BAR_GAP = 11
const LABEL_Y = 292
const GRIDLINES = 5

export const CHART_VIEW = { width: 1200, height: 316.245 }

/** Turn buckets into chart geometry, normalised so the tallest bar fills the
    plot. Bars sit on a shared baseline; the markup line floats in a band. */
export const layoutChart = (buckets: Bucket[]) => {
  const n = Math.max(1, buckets.length)
  const slot = CHART_VIEW.width / n
  const groupW = BAR_W * 2 + BAR_GAP
  const maxCount = Math.max(1, ...buckets.flatMap((b) => [b.signUps, b.subscribers]))
  const maxMarkup = Math.max(1, ...buckets.map((b) => b.markup))

  const bars: { x: number; y: number; w: number; h: number; fill: string }[] = []
  const dots: { x: number; y: number }[] = []
  const labels: { x: number; y: number; text: string }[] = []

  buckets.forEach((b, i) => {
    const startX = i * slot + (slot - groupW) / 2
    const suH = (b.signUps / maxCount) * MAX_BAR_H
    const sbH = (b.subscribers / maxCount) * MAX_BAR_H
    bars.push({ x: startX, y: BASELINE - suH, w: BAR_W, h: suH, fill: 'var(--color-border-pd01)' })
    bars.push({ x: startX + BAR_W + BAR_GAP, y: BASELINE - sbH, w: BAR_W, h: sbH, fill: 'var(--color-border-pd02)' })

    const cx = i * slot + slot / 2
    dots.push({ x: cx, y: BASELINE - (0.14 + 0.72 * (b.markup / maxMarkup)) * MAX_BAR_H })
    labels.push({ x: cx, y: LABEL_Y + 13, text: b.label })
  })

  const grid = Array.from({ length: GRIDLINES + 1 }, (_, i) => BASELINE - (i / GRIDLINES) * BASELINE)
  const line = dots.map((d) => `${d.x},${d.y}`).join(' ')
  return { ...CHART_VIEW, baseline: BASELINE, bars, dots, labels, line, grid }
}
