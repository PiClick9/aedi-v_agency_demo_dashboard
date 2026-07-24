/** Data model and generators for the Creator Sign-up Report (Figma 3910:19916).
 *
 * One pool of paying creators spans the last month up to today (real date).
 * The report filters that pool to a [start, end] range; the graph tab groups
 * the result by day or week. Range tabs are presets that set [start, end];
 * the calendars set it freely. So the calendars and tabs both filter the same
 * data.
 *
 * Rules: the table lists only paying creators (no $0/"-" rows), sign-ups =
 * subscribers + a per-day lead surplus (>= 1) so the sign-up bar is always
 * taller, empty days are not drawn, and bar width adapts to the column count. */

export type Creator = {
  id: number
  signUpDate: string // "YYYY.MM.DD"
  creator: string
  promoCredit: string
  startDate: string
  plan: PlanName
  lastPayment: string
  amount: string
  markup: string
  amountNum: number
  markupNum: number
}

export type Bucket = { label: string; dateStr: string; signUps: number; subscribers: number; markup: number }
export type Card = { label: string; value: string; delta: string; accent: string }
export type Extras = Record<string, number>
export type Pool = { creators: Creator[]; extras: Extras }

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

const dot = (d: Date) => `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`
const dash = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const label = (d: Date) => `${pad(d.getMonth() + 1)}/${pad(d.getDate())}`
const dotToDash = (s: string) => s.replace(/\./g, '-')
const dashToDot = (s: string) => s.replace(/-/g, '.')
const parseDot = (s: string) => {
  const [y, m, d] = s.split('.').map(Number)
  return new Date(y, m - 1, d)
}

/** Real today, at local midnight. */
export const today = () => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

/** Monday of the week the date (dot form) falls in, as a dot key. */
const weekStart = (s: string) => {
  const d = parseDot(s)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return dot(d)
}

const nextCreatorName = (creators: Creator[]) => {
  const max = creators.reduce((m, c) => {
    const n = Number(c.creator.replace(/\D/g, ''))
    return Number.isFinite(n) && n > m ? n : m
  }, 0)
  return `Creator${max + 1}`
}

const surplusFor = (subscribers: number) => (subscribers > 0 ? randInt(1, subscribers + 1) : 1)

/* ----------------------------------------------------------------- plans -- */

const VAT_RATE = 0.1

/** The subscription catalogue. `base` is the list price; Payment Amount shows
    it VAT-inclusive, so Standard bills at 15.5 x 1.1 = $17.05. Promo credit is
    fixed per plan, so a row's plan decides its credit and its amount together —
    there are only three shapes a creator row can take. */
const PLANS = [
  { name: 'Starter', promoCredit: '30:00', base: 9 },
  { name: 'Standard', promoCredit: '1:00:00', base: 15.5 },
  { name: 'Pro', promoCredit: '2:00:00', base: 28 },
] as const

type Plan = (typeof PLANS)[number]
export type PlanName = Plan['name']

const randomPlan = (): Plan => PLANS[randInt(0, PLANS.length - 1)]

/* -------------------------------------------------------------- creators -- */

const makeCreatorRow = (id: number, name: string, dateStr: string, plan: Plan): Creator => {
  const amountNum = round2(plan.base * (1 + VAT_RATE))
  const markupNum = round2(amountNum * 0.2)
  return {
    id,
    signUpDate: dateStr,
    creator: name,
    promoCredit: plan.promoCredit,
    startDate: dateStr,
    plan: plan.name,
    lastPayment: dateStr,
    amount: money(amountNum),
    markup: money(markupNum),
    amountNum,
    markupNum,
  }
}

/* --------------------------------------------------------------- derive -- */

const groupBuckets = (creators: Creator[], extras: Extras, keyOf: (s: string) => string): Bucket[] => {
  const subsByKey = new Map<string, { subs: number; markup: number }>()
  for (const c of creators) {
    const key = keyOf(c.signUpDate)
    const cur = subsByKey.get(key) ?? { subs: 0, markup: 0 }
    cur.subs += 1
    cur.markup += c.markupNum
    subsByKey.set(key, cur)
  }
  const extraByKey = new Map<string, number>()
  for (const day of new Set(creators.map((c) => c.signUpDate))) {
    const key = keyOf(day)
    extraByKey.set(key, (extraByKey.get(key) ?? 0) + (extras[day] ?? 1))
  }
  return [...subsByKey.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([key, v]) => ({
      label: label(parseDot(key)),
      dateStr: key,
      subscribers: v.subs,
      signUps: v.subs + (extraByKey.get(key) ?? 1),
      markup: round2(v.markup),
    }))
}

export const deriveChart = (creators: Creator[], extras: Extras, tab: GraphTab): Bucket[] =>
  tab === 'Weekly' ? groupBuckets(creators, extras, weekStart) : groupBuckets(creators, extras, (d) => d)

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

const buildCards = (v: Values, prev: Values): Card[] => [
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

export const cardsFor = (creators: Creator[], extras: Extras): Card[] =>
  buildCards(deriveValues(creators, extras), priorOf(deriveValues(creators, extras)))

/* --------------------------------------------------------------- filter -- */

/** Creators whose sign-up date falls within [start, end] (dash form). */
export const filterByRange = (creators: Creator[], start: string, end: string): Creator[] =>
  creators.filter((c) => {
    const v = dotToDash(c.signUpDate)
    return v >= start && v <= end
  })

/* --------------------------------------------------------------- presets -- */

/** Earliest date the pool holds data for (first of last month) — the lower
    bound for the date pickers, so ranges before the data can't be selected. */
export const dataStart = (base: Date = today()): string =>
  dash(new Date(base.getFullYear(), base.getMonth() - 1, 1))

export const presetRange = (range: Range, base: Date = today()): { start: string; end: string } => {
  if (range === 'Today') return { start: dash(base), end: dash(base) }
  if (range === 'Last 7 days') {
    const s = new Date(base)
    s.setDate(s.getDate() - 6)
    return { start: dash(s), end: dash(base) }
  }
  if (range === 'This Month') {
    return { start: dash(new Date(base.getFullYear(), base.getMonth(), 1)), end: dash(base) }
  }
  const s = new Date(base.getFullYear(), base.getMonth() - 1, 1)
  const e = new Date(base.getFullYear(), base.getMonth(), 0)
  return { start: dash(s), end: dash(e) }
}

/** Which preset (if any) the current range matches — for tab highlighting. */
export const matchPreset = (start: string, end: string, base: Date = today()): Range | null =>
  DATE_TABS.find((r) => {
    const p = presetRange(r, base)
    return p.start === start && p.end === end
  }) ?? null

/* ------------------------------------------------------------------ pool -- */

/** One pool of paying creators for every day from the first of last month to
    today, with a per-day lead surplus. The report filters this by range. */
export const generatePool = (): Pool => {
  const end = today()
  const start = new Date(end.getFullYear(), end.getMonth() - 1, 1)
  const creators: Creator[] = []
  const extras: Extras = {}
  let id = 1
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const day = dot(d)
    const n = randInt(1, 3)
    for (let k = 0; k < n; k++) creators.push(makeCreatorRow(id++, `Creator${id - 1}`, day, randomPlan()))
    extras[day] = surplusFor(n)
  }
  creators.sort((a, b) => (a.signUpDate < b.signUpDate ? 1 : -1))
  return { creators, extras }
}

/** A new paying creator on the given day (dash form), plus its surplus if the
    day is new to the pool. */
export const makeCreatorAt = (pool: Pool, dayDash: string): { creator: Creator; extras: Extras } => {
  const day = dashToDot(dayDash)
  const id = pool.creators.reduce((m, c) => Math.max(m, c.id), 0) + 1
  const creator = makeCreatorRow(id, nextCreatorName(pool.creators), day, randomPlan())
  const extras = day in pool.extras ? pool.extras : { ...pool.extras, [day]: 1 }
  return { creator, extras }
}

/* --------------------------------------------------------------- layout -- */

const BASELINE = 281
const MAX_BAR_H = 203
const MAX_BAR_W = 50
const LABEL_Y = 292
const GRIDLINES = 5

export const CHART_VIEW = { width: 1200, height: 316.245 }

/** Chart geometry. Bar width adapts to the column count (wide for a few
    columns, thin for many); heights normalise so the tallest bar fills the
    plot and every bar shares the baseline. The Markup dots ride the top of
    each Subscribers bar, so the line traces the subscriber trend rather than
    carrying a scale of its own. */
export const layoutChart = (buckets: Bucket[]) => {
  const n = Math.max(1, buckets.length)
  const slot = CHART_VIEW.width / n
  const gap = Math.min(10, slot * 0.12)
  const barW = Math.max(4, Math.min(MAX_BAR_W, (slot * 0.68 - gap) / 2))
  const groupW = barW * 2 + gap
  const maxCount = Math.max(1, ...buckets.flatMap((b) => [b.signUps, b.subscribers]))
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
    dots.push({ x: cx, y: BASELINE - sbH })
    if (i % labelStep === 0 || i === n - 1) labels.push({ x: cx, y: LABEL_Y + 13, text: b.label })
  })

  const grid = Array.from({ length: GRIDLINES + 1 }, (_, i) => BASELINE - (i / GRIDLINES) * BASELINE)
  const line = dots.map((d) => `${d.x},${d.y}`).join(' ')
  return { ...CHART_VIEW, baseline: BASELINE, barW, bars, dots, labels, line, grid }
}
