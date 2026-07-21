/** Data model and generators for the Creator Sign-up Report (Figma 3910:19916).
 *
 * Rules that shape the model:
 *  - The table lists only paying creators, so no row ever shows $0 or "-".
 *  - In the chart, sign-ups = subscribers + a per-day lead surplus (>= 1), so
 *    the sign-up bar is always taller than the subscriber bar.
 *  - Days with no subscriber are dropped, so the chart never draws a 0 column.
 *
 * The default view is fixed and deterministic; interactions generate or mutate
 * data, and the summary cards and chart derive from it so everything reacts. */

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

/** A day/week column: `extra` is the non-subscriber lead surplus for that day. */
export type BucketDef = { label: string; dateStr: string; extra: number }

/** A resolved chart column (subscribers folded in). */
export type Bucket = {
  label: string
  dateStr: string
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

const money = (n: number) => `$${n.toFixed(2)}`
/** Summary money drops trailing zeros, as the design does ($68.2, not $68.20). */
const moneySum = (n: number) => `$${n.toFixed(2).replace(/\.?0+$/, '') || '0'}`

const nextCreatorName = (creators: Creator[]) => {
  const max = creators.reduce((m, c) => {
    const n = Number(c.creator.replace(/\D/g, ''))
    return Number.isFinite(n) && n > m ? n : m
  }, 0)
  return `Creator${max + 1}`
}

/* -------------------------------------------------------------- creators -- */

/** Every creator is a paying subscriber — so no zero rows reach the table. */
const makeCreatorRow = (id: number, name: string, def: BucketDef, amountNum: number): Creator => ({
  id,
  signUpDate: def.dateStr,
  creator: name,
  promoCredit: '60:00',
  startDate: def.dateStr,
  plan: 'Standard',
  lastPayment: def.dateStr,
  amount: money(amountNum),
  markup: money(round2(amountNum * 0.2)),
  amountNum,
  markupNum: round2(amountNum * 0.2),
})

const randomAmount = () => round2(17.05 * randInt(1, 3))

/* --------------------------------------------------------------- derive -- */

/** Resolve chart columns from creators + day definitions. Days with no
    subscriber are dropped, and sign-ups = subscribers + lead surplus. */
export const deriveChart = (creators: Creator[], defs: BucketDef[]): Bucket[] =>
  defs
    .map((def) => {
      const inDay = creators.filter((c) => c.signUpDate === def.dateStr)
      const subscribers = inDay.length
      if (subscribers === 0) return null // no 0 columns
      return {
        label: def.label,
        dateStr: def.dateStr,
        subscribers,
        signUps: subscribers + def.extra, // always > subscribers
        markup: round2(inDay.reduce((s, c) => s + c.markupNum, 0)),
      }
    })
    .filter((b): b is Bucket => b !== null)

export type Values = { signUps: number; subs: number; conv: number; payment: number; markup: number }

export const deriveValues = (creators: Creator[], defs: BucketDef[]): Values => {
  const chart = deriveChart(creators, defs)
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

export const cardsFor = (creators: Creator[], defs: BucketDef[], prev?: Values): Card[] => {
  const values = deriveValues(creators, defs)
  return buildCards(values, prev ?? priorOf(values))
}

/* --------------------------------------------------------------- mutate -- */

/** A new paying creator, placed in a day that already has subscribers so the
    Sign-ups total moves by exactly one. */
export const makeCreator = (creators: Creator[], defs: BucketDef[]): Creator => {
  const active = defs.filter((d) => creators.some((c) => c.signUpDate === d.dateStr))
  const pool = active.length ? active : defs
  const def = pool[randInt(0, pool.length - 1)]
  const id = creators.reduce((m, c) => Math.max(m, c.id), 0) + 1
  return makeCreatorRow(id, nextCreatorName(creators), def, randomAmount())
}

/* ------------------------------------------------------------- generation -- */

// Fixed reference date so ranges are stable within a session.
const TODAY = new Date('2026-07-21T00:00:00')

const dayDef = (d: Date): BucketDef => ({
  label: `${pad(d.getMonth() + 1)}/${pad(d.getDate())}`,
  dateStr: `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`,
  extra: 1, // real value assigned in generateDataset once subscribers are known
})

/** Lead surplus for a day, kept close to its subscriber count so the
    subscriber bar stays a healthy — and varied — fraction of the sign-up bar
    (roughly 40–85% conversion, with some low days and some high days). */
const surplusFor = (subscribers: number) => (subscribers > 0 ? randInt(1, subscribers + 1) : 1)

const weekDefs = (year: number, month: number): BucketDef[] => {
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const defs: BucketDef[] = []
  for (let start = 1; start <= daysInMonth; start += 7) defs.push(dayDef(new Date(year, month, start)))
  return defs
}

const rangeDefs = (range: Range): BucketDef[] => {
  if (range === 'Today') return [dayDef(TODAY)]
  if (range === 'Last 7 days') {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(TODAY)
      d.setDate(TODAY.getDate() - (6 - i))
      return dayDef(d)
    })
  }
  if (range === 'This Month') return weekDefs(TODAY.getFullYear(), TODAY.getMonth())
  const prev = new Date(TODAY.getFullYear(), TODAY.getMonth() - 1, 1)
  return weekDefs(prev.getFullYear(), prev.getMonth())
}

const CREATOR_COUNT: Record<Range, [number, number]> = {
  Today: [2, 5],
  'Last 7 days': [9, 14],
  'This Month': [14, 28],
  'Last Month': [14, 28],
}

export type Dataset = { creators: Creator[]; defs: BucketDef[]; cards: Card[] }

/** Build a coherent dataset for a date range: paying creators spread across
    the days, every day seeded with at least one so no column is empty. */
export const generateDataset = (range: Range): Dataset => {
  const bare = rangeDefs(range)
  const [lo, hi] = CREATOR_COUNT[range]
  const count = Math.max(bare.length, randInt(lo, hi))

  const creators: Creator[] = []
  let id = 1
  // Seed one per day, then scatter the rest — keeps every column populated.
  bare.forEach((def) => creators.push(makeCreatorRow(id++, `Creator${id - 1}`, def, randomAmount())))
  for (let i = creators.length; i < count; i++) {
    const def = bare[randInt(0, bare.length - 1)]
    creators.push(makeCreatorRow(id++, `Creator${id - 1}`, def, randomAmount()))
  }

  // Set each day's lead surplus from its actual subscriber count.
  const defs = bare.map((def) => ({
    ...def,
    extra: surplusFor(creators.filter((c) => c.signUpDate === def.dateStr).length),
  }))

  creators.sort((a, b) => (a.signUpDate < b.signUpDate ? 1 : -1))
  return { creators, defs, cards: cardsFor(creators, defs) }
}

/* --------------------------------------------------------------- initial -- */

// Fixed default (Last 7 days). Subscribers per day: [3,2,2,2,3,2]; the lead
// surplus below gives a mix of low-conversion days (07/23 ~33%, 07/25 ~29%)
// and high ones (07/22 & 07/26 ~75%), so the subscriber bars vary rather than
// staying uniformly short. All six days carry subscribers, so all render.
export const INITIAL_DEFS: BucketDef[] = [
  { label: '07/22', dateStr: '2026.07.22', extra: 1 },
  { label: '07/23', dateStr: '2026.07.23', extra: 4 },
  { label: '07/24', dateStr: '2026.07.24', extra: 1 },
  { label: '07/25', dateStr: '2026.07.25', extra: 5 },
  { label: '07/26', dateStr: '2026.07.26', extra: 1 },
  { label: '07/27', dateStr: '2026.07.27', extra: 2 },
]

const initialRow = (id: number, dateStr: string, amountNum: number): Creator =>
  makeCreatorRow(id, `Creator${id}`, { label: '', dateStr, extra: 0 }, amountNum)

export const INITIAL_CREATORS: Creator[] = [
  initialRow(14, '2026.07.27', 34.1),
  initialRow(13, '2026.07.27', 17.05),
  initialRow(12, '2026.07.26', 17.05),
  initialRow(11, '2026.07.26', 34.1),
  initialRow(10, '2026.07.26', 17.05),
  initialRow(9, '2026.07.25', 17.05),
  initialRow(8, '2026.07.25', 34.1),
  initialRow(7, '2026.07.24', 17.05),
  initialRow(6, '2026.07.24', 17.05),
  initialRow(5, '2026.07.23', 34.1),
  initialRow(4, '2026.07.23', 17.05),
  initialRow(3, '2026.07.22', 17.05),
  initialRow(2, '2026.07.22', 34.1),
  initialRow(1, '2026.07.22', 17.05),
]

export const INITIAL_CARDS: Card[] = cardsFor(INITIAL_CREATORS, INITIAL_DEFS)

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
