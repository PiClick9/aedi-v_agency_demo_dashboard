/**
 * Design QA harness — renders the running dev server at several viewports,
 * measures every element against the Figma spec, and reports drift.
 *
 *   npm run dev                        # in another terminal
 *   npm run audit:design -- ./shots    # screenshot dir is optional
 *
 * Desktop viewports are checked against exact Figma pixel values. Mobile
 * viewports intentionally reflow, so there we assert the invariants that must
 * survive the reflow (no horizontal overflow, legible type, centred axis).
 *
 * Add one spec function per screen and one RUNS entry per screen/viewport.
 */
import { chromium } from 'playwright'

const OUT = process.argv[2]
const BASE = process.env.AUDIT_URL ?? 'http://localhost:5173'

const TOL = 0.75 // px
let failures = 0
let checks = 0

const near = (label, actual, expected, tol = TOL) => {
  checks++
  const isOk = Math.abs(actual - expected) <= tol
  if (!isOk) failures++
  console.log(
    `${isOk ? 'OK  ' : 'FAIL'} ${label}: ${actual.toFixed(2)} (expected ${expected.toFixed(2)})`,
  )
}

const eq = (label, actual, expected) => {
  checks++
  const isOk = actual === expected
  if (!isOk) failures++
  console.log(`${isOk ? 'OK  ' : 'FAIL'} ${label}: ${actual}${isOk ? '' : ` (expected ${expected})`}`)
}

const ok = (label, condition, detail = '') => {
  checks++
  if (!condition) failures++
  console.log(`${condition ? 'OK  ' : 'FAIL'} ${label}${detail ? `: ${detail}` : ''}`)
}

/**
 * Serialised in the browser. Elements are found by CSS-Module class-name
 * fragment — the source name survives inside the generated hash. Note
 * `[class*=]` is case-sensitive.
 */
const probe = () => {
  const q = (name) => document.querySelector(`[class*="${name}"]`)
  const box = (el) => {
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  }
  const type = (el) => {
    if (!el) return null
    const s = getComputedStyle(el)
    return {
      size: parseFloat(s.fontSize),
      lh: parseFloat(s.lineHeight),
      weight: s.fontWeight,
      color: s.color,
      family: s.fontFamily.split(',')[0].replace(/["']/g, ''),
    }
  }
  const cardEl = q('card')
  const cs = cardEl && getComputedStyle(cardEl)

  return {
    logo: box(q('logo')),
    symbol: box(q('logoSymbol')),
    wordmark: box(q('logoWordmark')),
    card: box(cardEl),
    cardStyle: cs && {
      bg: cs.backgroundColor,
      radius: cs.borderTopLeftRadius,
      padY: cs.paddingTop,
      padX: cs.paddingLeft,
      shadow: cs.boxShadow,
    },
    title: box(q('title')),
    titleType: type(q('title')),
    pageBg: getComputedStyle(document.body).backgroundColor,
    scrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth,
    scrollH: document.documentElement.scrollHeight,
    clientH: document.documentElement.clientHeight,
  }
}

/* ---------------------------------------------------------------- specs -- */

/**
 * The agency pilot artboards place the logo at y=144 and the card at y=252
 * regardless of card height, so the layout is top-anchored, not centred.
 * Reuse this once the real dashboard screens land.
 */
const layoutSpec = (m) => {
  near('logo y', m.logo.y, 144)
  near('card y', m.card.y, 252)
  near('logo w', m.logo.w, 259)
  near('logo h', m.logo.h, 60)
  near('symbol', m.symbol.w, 60)
  near('wordmark w', m.wordmark.w, 181)
  near('wordmark h', m.wordmark.h, 46.41)
  near('gap logo->card', m.card.y - (m.logo.y + m.logo.h), 48)
}

/** Placeholder landing page — replace when the first screen is implemented. */
const placeholderSpec = (m, vp) => {
  const cx = (b) => b.x + b.w / 2
  layoutSpec(m)
  near('logo centre x', cx(m.logo), vp.width / 2, 1)
  near('card centre x', cx(m.card), vp.width / 2, 1)
  near('card radius', parseFloat(m.cardStyle.radius), 10)
  eq('card bg', m.cardStyle.bg, 'rgb(255, 255, 255)')
  eq('card shadow', m.cardStyle.shadow, 'rgba(0, 0, 0, 0.1) 0px 0px 16px 0px')
  near('title font-size', m.titleType.size, 32)
  eq('title weight', m.titleType.weight, '700')
  eq('font family', m.titleType.family, 'Pretendard')
  eq('page bg', m.pageBg, 'rgb(247, 248, 250)')
}

/** Invariants that must hold after any responsive reflow. */
const responsiveSpec = (m, vp) => {
  const cx = (b) => b.x + b.w / 2
  ok('no horizontal overflow', m.scrollW <= m.clientW, `${m.scrollW} <= ${m.clientW}`)
  ok('card within viewport', m.card.x >= 0 && m.card.x + m.card.w <= vp.width)
  near('card centre x', cx(m.card), vp.width / 2, 1)
  near('logo centre x', cx(m.logo), vp.width / 2, 1)
  ok('title >= 20px', m.titleType.size >= 20, `${m.titleType.size}px`)
  eq('page bg', m.pageBg, 'rgb(247, 248, 250)')
}

/* ------------------------------------------------------------------ run -- */

const RUNS = [
  { route: '/', name: 'home-1920x1080', width: 1920, height: 1080, spec: placeholderSpec },
  { route: '/', name: 'home-1440x900', width: 1440, height: 900, spec: placeholderSpec },
  { route: '/', name: 'home-768x1024', width: 768, height: 1024, spec: placeholderSpec },
  { route: '/', name: 'home-767x1024', width: 767, height: 1024, spec: responsiveSpec },
  { route: '/', name: 'home-390x844', width: 390, height: 844, spec: responsiveSpec },
  { route: '/', name: 'home-320x568', width: 320, height: 568, spec: responsiveSpec },
]

const browser = await chromium.launch()

for (const run of RUNS) {
  const page = await browser.newPage({ viewport: { width: run.width, height: run.height } })
  await page.goto(`${BASE}/#${run.route}`, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(300)

  console.log(`\n===== ${run.name} =====`)
  if (OUT) await page.screenshot({ path: `${OUT}/${run.name}.png`, fullPage: true })

  const m = await page.evaluate(probe)
  run.spec(m, run)

  const oY = m.scrollH > m.clientH
  console.log(`${oY ? 'note' : 'OK  '} vertical scroll: ${oY ? `${m.scrollH} > ${m.clientH}` : 'none'}`)

  await page.close()
}

await browser.close()
console.log(
  `\n${checks} checks — ${failures === 0 ? 'PASS, no drift from spec' : `${failures} FAILURE(S)`}`,
)
process.exit(failures === 0 ? 0 : 1)
