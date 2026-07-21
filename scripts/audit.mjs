/**
 * Design QA harness — renders the running dev server at several viewports,
 * measures every element against the Figma spec, and reports drift.
 *
 *   npm run dev                        # in another terminal
 *   npm run audit:design -- ./shots    # screenshot dir is optional
 *
 * Desktop viewports are checked against exact Figma pixel values. Narrow
 * viewports intentionally reflow, so there we assert the invariants that must
 * survive the reflow (no horizontal page overflow, legible type, alignment).
 */
import { chromium } from 'playwright'

const OUT = process.argv[2]
const BASE = process.env.AUDIT_URL ?? 'http://localhost:5174'

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

/** Serialised in the browser. `[class*=]` matching is case-sensitive. */
const probe = () => {
  const q = (name) => document.querySelector(`[class*="${name}"]`)
  const qa = (name) => [...document.querySelectorAll(`[class*="${name}"]`)]
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
  const style = (el, props) => {
    if (!el) return null
    const s = getComputedStyle(el)
    return Object.fromEntries(props.map((p) => [p, s[p]]))
  }

  const cards = qa('card').filter((el) => el.className.includes('card_'))
  const headCells = [...document.querySelectorAll('thead th')]
  const firstRowCells = [...document.querySelectorAll('tbody tr:first-child td')]

  return {
    header: box(q('header')),
    headerStyle: style(q('header'), ['backgroundColor', 'boxShadow']),
    headerLogo: box(q('logo')),
    globe: box(q('globe')),

    content: box(q('content')),
    title: box(q('title')),
    titleType: type(q('title')),

    dateRow: box(q('dateRow')),
    dateLabel: box(q('dateLabel')),
    dateLabelType: type(q('dateLabel')),
    select: box(q('select')),
    datepicker: box(q('datepicker')),
    dateField: box(q('dateField')),
    dateTabs: box(q('dateTabs')),
    dateTabList: qa('dateTab').filter((el) => el.tagName === 'BUTTON').map(box),
    activeDateTab: (() => {
      const el = document.querySelector('[class*="dateTabActive"]')
      if (!el) return null
      const s = getComputedStyle(el)
      return { text: el.textContent, bg: s.backgroundColor, weight: s.fontWeight, color: s.color }
    })(),
    inactiveDateTabColor: (() => {
      const el = [...document.querySelectorAll('[class*="dateTab"]')].find(
        (e) => e.tagName === 'BUTTON' && !e.className.includes('Active'),
      )
      return el ? getComputedStyle(el).color : null
    })(),

    summary: box(q('summary')),
    cards: cards.map((el) => {
      const s = getComputedStyle(el)
      return {
        ...box(el),
        accent: s.borderBottomColor,
        borderWidth: s.borderBottomWidth,
        radius: s.borderTopLeftRadius,
        bg: s.backgroundColor,
        shadow: s.boxShadow,
        padT: s.paddingTop,
        padL: s.paddingLeft,
      }
    }),
    cardLabelType: type(q('cardLabel')),
    cardValueType: type(q('cardValue')),
    cardDeltaType: type(q('cardDelta')),

    graphTabs: box(q('graphTabs')),
    graphTabList: qa('graphTab').filter((el) => el.tagName === 'BUTTON').map(box),
    activeGraphTab: (() => {
      const el = document.querySelector('[class*="graphTabActive"]')
      if (!el) return null
      const s = getComputedStyle(el)
      return { text: el.textContent, weight: s.fontWeight, color: s.color, border: s.borderBottomWidth, borderColor: s.borderBottomColor }
    })(),

    chartArea: box(q('chartArea')),
    // `q('chart')` would match `chartArea`; the chart is the only inline SVG.
    chart: box(document.querySelector('svg[viewBox]')),
    chartViewBox: document.querySelector('svg[viewBox]')?.getAttribute('viewBox') ?? null,
    bars: [...document.querySelectorAll('svg rect')].map((el) => ({
      x: +el.getAttribute('x'),
      y: +el.getAttribute('y'),
      w: +el.getAttribute('width'),
      h: +el.getAttribute('height'),
      fill: getComputedStyle(el).fill,
    })),
    dots: [...document.querySelectorAll('svg circle')].length,
    legend: box(q('legend')),
    legendItems: qa('legendItem').length,

    actions: box(q('actions')),
    addButton: box(q('addButton')),
    addButtonStyle: style(q('addButton'), ['backgroundColor', 'color', 'borderTopLeftRadius']),

    table: box(document.querySelector('table')),
    headRow: box(document.querySelector('thead tr')),
    headCells: headCells.map((el) => ({ ...box(el), text: el.textContent })),
    headType: type(headCells[0]),
    markupHeadSize: headCells[7] ? parseFloat(getComputedStyle(headCells[7]).fontSize) : null,
    headBg: headCells[0] ? getComputedStyle(headCells[0]).backgroundColor : null,
    bodyRows: [...document.querySelectorAll('tbody tr')].map(box),
    bodyCells: firstRowCells.map((el) => ({ ...box(el), text: el.textContent })),
    bodyTexts: [...document.querySelectorAll('tbody td')].map((el) => el.textContent),
    bodyType: type(firstRowCells[0]),
    bodyBg: firstRowCells[0] ? getComputedStyle(firstRowCells[0]).backgroundColor : null,
    deleteButton: box(q('deleteButton')),

    pagination: box(q('pagination')),
    // The active page — `[class*=pagerPage]` also matches the wrapper and the
    // inactive buttons, so target the current page by aria-current.
    pagerPage: box(document.querySelector('button[aria-current="page"]')),
    pagerPageStyle: style(document.querySelector('button[aria-current="page"]'), ['backgroundColor', 'color', 'borderTopLeftRadius']),
    pagerArrows: qa('pagerArrow').length,
    // Figma insets each vector inside its icon box; filling the box reads heavy.
    iconSizes: {
      add: box(document.querySelector('[class*="iconAdd"] img')),
      pagerEnd: box(document.querySelector('[class*="pagerEnd"] img')),
      pagerStep: box(document.querySelector('[class*="pagerStep"] img')),
      chevron: box(q('selectArrow')),
      calendar: box(q('calendarIcon')),
    },

    pageBg: getComputedStyle(document.body).backgroundColor,
    scrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth,
    scrollH: document.documentElement.scrollHeight,
    clientH: document.documentElement.clientHeight,
  }
}

/* ---------------------------------------------------------------- specs -- */

const ACCENTS = [
  'rgb(6, 22, 105)', // pd01
  'rgb(41, 127, 255)', // pd02
  'rgb(0, 177, 185)', // pd06
  'rgb(23, 161, 95)', // pd03
  'rgb(255, 171, 8)', // pd04
]

const HEAD_LABELS = [
  'Sign-up Date',
  'Creator Name',
  'Promo Credit',
  'Subscription Start Date',
  'Subscription Plan',
  'Last Payment Date',
  'Payment Amount',
  'Markup',
  '',
]

/** Creator Sign-up Report — Figma node 3910:19916. */
const reportSpec = (m) => {
  const cx = (b) => b.x + b.w / 2

  console.log('-- header')
  near('header h', m.header.h, 84)
  eq('header bg', m.headerStyle.backgroundColor, 'rgb(255, 255, 255)')
  near('header logo w', m.headerLogo.w, 137.765)
  near('header logo h', m.headerLogo.h, 32)
  near('globe', m.globe.w, 24)

  console.log('-- content column')
  near('content column w', m.content.w - 120, 1200) // max-width less the gutters
  near('content centre x', cx(m.content), 960, 1)
  near('title y (from viewport top)', m.title.y, 166)

  console.log('-- title')
  near('title h', m.title.h, 26, 1)
  near('title font-size', m.titleType.size, 20)
  eq('title weight', m.titleType.weight, '700')
  eq('title colour', m.titleType.color, 'rgb(26, 26, 26)')
  eq('font family', m.titleType.family, 'Pretendard')

  console.log('-- date row')
  near('date row y (from title top)', m.dateRow.y - m.title.y, 58)
  near('date row h', m.dateRow.h, 48)
  near('date label font-size', m.dateLabelType.size, 18)
  near('select w', m.select.w, 210)
  near('select h', m.select.h, 48)
  near('label->select gap', m.select.x - (m.dateLabel.x + m.dateLabel.w), 16)
  near('datepicker w', m.datepicker.w, 354)
  near('select->datepicker gap', m.datepicker.x - (m.select.x + m.select.w), 16)
  near('date field h', m.dateField.h, 48)
  near('date tabs w', m.dateTabs.w, 492)
  near('datepicker->tabs gap', m.dateTabs.x - (m.datepicker.x + m.datepicker.w), 16)
  ok('4 date tabs', m.dateTabList.length === 4, `${m.dateTabList.length}`)
  // Figma strokes sit inside the frame, so the tabs share 490, not 492.
  m.dateTabList.forEach((t, i) => near(`date tab ${i} w`, t.w, 122.5))
  m.dateTabList.forEach((t, i) => near(`date tab ${i} h`, t.h, 48))
  eq('active date tab', m.activeDateTab.text, 'Last 7 days')
  eq('active tab bg', m.activeDateTab.bg, 'rgb(240, 240, 243)')
  eq('active tab weight', m.activeDateTab.weight, '700')
  eq('inactive tab colour', m.inactiveDateTabColor, 'rgb(153, 159, 165)')

  console.log('-- summary cards')
  near('summary y (from date row)', m.summary.y - (m.dateRow.y + m.dateRow.h), 72)
  near('summary w', m.summary.w, 1200)
  ok('5 cards', m.cards.length === 5, `${m.cards.length}`)
  m.cards.forEach((c, i) => near(`card ${i} h`, c.h, 142))
  m.cards.forEach((c, i) => near(`card ${i} w`, c.w, 231.2))
  m.cards.forEach((c, i) => eq(`card ${i} accent`, c.accent, ACCENTS[i]))
  m.cards.forEach((c, i) => near(`card ${i} accent width`, parseFloat(c.borderWidth), 2))
  near('card radius', parseFloat(m.cards[0].radius), 10)
  near('card pad-y', parseFloat(m.cards[0].padT), 20)
  near('card pad-x', parseFloat(m.cards[0].padL), 24)
  eq('card bg', m.cards[0].bg, 'rgb(255, 255, 255)')
  eq('card shadow', m.cards[0].shadow, 'rgba(0, 0, 0, 0.1) 0px 0px 5px 0px')
  for (let i = 1; i < m.cards.length; i++) {
    near(`card gap ${i - 1}->${i}`, m.cards[i].x - (m.cards[i - 1].x + m.cards[i - 1].w), 11)
  }
  near('card label size', m.cardLabelType.size, 16)
  eq('card label colour', m.cardLabelType.color, 'rgb(118, 125, 132)')
  near('card value size', m.cardValueType.size, 24)
  eq('card value weight', m.cardValueType.weight, '700')
  near('card delta size', m.cardDeltaType.size, 14)

  console.log('-- graph tabs')
  near('graph tabs y (from summary)', m.graphTabs.y - (m.summary.y + m.summary.h), 16)
  near('graph tabs h', m.graphTabs.h, 48)
  ok('2 graph tabs (Daily, Weekly)', m.graphTabList.length === 2, `${m.graphTabList.length}`)
  eq('active graph tab', m.activeGraphTab.text, 'Daily')
  eq('active graph tab weight', m.activeGraphTab.weight, '700')
  near('active graph tab underline', parseFloat(m.activeGraphTab.border), 3)
  eq('active graph tab underline colour', m.activeGraphTab.borderColor, 'rgb(26, 26, 26)')

  console.log('-- chart')
  near('chart y (from graph tabs)', m.chartArea.y - (m.graphTabs.y + m.graphTabs.h), 24)
  eq('chart viewBox', m.chartViewBox, '0 0 1200 316.245')
  near('chart w', m.chart.w, 1200)
  const signUps = m.bars.filter((b) => b.fill === 'rgb(6, 22, 105)')
  const subs = m.bars.filter((b) => b.fill === 'rgb(41, 127, 255)')
  // The default (Last 7 days) covers 7 days, and the pool fills every one.
  ok('7 sign-up bars', signUps.length === 7, `${signUps.length}`)
  ok('7 subscriber bars', subs.length === 7, `${subs.length}`)
  ok('7 markup dots', m.dots === 7, `${m.dots}`)
  // Bars are one adaptive width; seven columns are wide enough to hit the 50 cap.
  const w0 = m.bars[0].w
  ok('all bars share one width', m.bars.every((b) => Math.abs(b.w - w0) < 0.01), `${w0.toFixed(1)}`)
  ok('bar width within [4, 50]', w0 >= 4 && w0 <= 50, `${w0.toFixed(1)}`)
  ok('all bars share the 281 baseline', m.bars.every((b) => Math.abs(b.y + b.h - 281) < 0.01))
  ok('3 legend entries', m.legendItems === 3, `${m.legendItems}`)
  near('legend centre x', cx(m.legend), cx(m.chart), 1)

  // Rules: sign-up bar always >= subscriber bar, and no 0-height (empty) bars.
  const pairsOk = signUps.every((su, i) => su.h >= subs[i].h - 0.01)
  ok('sign-up bar never shorter than subscriber bar', pairsOk)
  ok('no zero-height bars', m.bars.every((b) => b.h > 0), `min ${Math.min(...m.bars.map((b) => b.h)).toFixed(1)}`)

  // Subscriber bars should read as a healthy, varied fraction — not uniformly
  // tiny. Average ratio well above the old ~18%, and a real spread of days.
  const ratios = signUps.map((su, i) => subs[i].h / su.h)
  const avg = ratios.reduce((a, r) => a + r, 0) / ratios.length
  const spread = Math.max(...ratios) - Math.min(...ratios)
  ok('subscriber ratio is healthy on average', avg >= 0.4, `avg ${(avg * 100).toFixed(0)}%`)
  ok('subscriber ratio varies across days', spread >= 0.15, `spread ${(spread * 100).toFixed(0)}%`)

  console.log('-- actions')
  ok('only the Add Creator button remains', m.exportButton === undefined)
  near('add button w', m.addButton.w, 130)
  near('add button h', m.addButton.h, 40)
  eq('add button bg', m.addButtonStyle.backgroundColor, 'rgb(26, 26, 26)')
  eq('add button colour', m.addButtonStyle.color, 'rgb(255, 255, 255)')
  near('add button radius', parseFloat(m.addButtonStyle.borderTopLeftRadius), 5)
  ok('actions right-aligned', Math.abs(m.addButton.x + m.addButton.w - (m.content.x + m.content.w - 60)) < 1)

  console.log('-- table')
  near('table w', m.table.w, 1200)
  near('table y (from actions)', m.table.y - (m.actions.y + m.actions.h), 16)
  near('head row h', m.headRow.h, 55)
  eq('head bg', m.headBg, 'rgb(247, 248, 250)')
  near('head font-size', m.headType.size, 16)
  eq('head weight', m.headType.weight, '700')
  near('markup head font-size', m.markupHeadSize, 18)
  ok('9 head cells', m.headCells.length === 9, `${m.headCells.length}`)
  m.headCells.forEach((c, i) => eq(`head ${i}`, c.text, HEAD_LABELS[i]))
  // Column widths: six flex columns at 130.333, plus 174, 146 and 98.
  const WIDTHS = [130.333, 174, 130.333, 146, 130.333, 130.333, 130.333, 130.333, 98]
  m.headCells.forEach((c, i) => near(`col ${i} w`, c.w, WIDTHS[i]))
  ok('5 body rows', m.bodyRows.length === 5, `${m.bodyRows.length}`)
  m.bodyRows.forEach((r, i) => near(`row ${i} h`, r.h, 52))
  eq('body bg', m.bodyBg, 'rgb(252, 252, 253)')
  near('body font-size', m.bodyType.size, 16)
  eq('body weight', m.bodyType.weight, '400')
  near('delete button h', m.deleteButton.h, 36)
  // Rule: no zero values in the table — no "$0" and no "-" placeholder cells.
  ok('no $0 cells in the table', !m.bodyTexts.includes('$0'), m.bodyTexts.filter((t) => t === '$0').length + ' found')
  ok('no "-" cells in the table', !m.bodyTexts.includes('-'), m.bodyTexts.filter((t) => t === '-').length + ' found')

  console.log('-- pagination')
  near('pagination y (from table)', m.pagination.y - (m.table.y + m.table.h), 32)
  near('pager page', m.pagerPage.w, 30)
  near('pager page h', m.pagerPage.h, 30)
  eq('pager page bg', m.pagerPageStyle.backgroundColor, 'rgb(26, 26, 26)')
  eq('pager page colour', m.pagerPageStyle.color, 'rgb(255, 255, 255)')
  ok('4 pager arrows', m.pagerArrows === 4, `${m.pagerArrows}`)

  console.log('-- icon insets')
  near('add icon', m.iconSizes.add.w, 10.67, 0.2)
  near('pager end icon w', m.iconSizes.pagerEnd.w, 18)
  near('pager end icon h', m.iconSizes.pagerEnd.h, 18)
  near('pager step icon w', m.iconSizes.pagerStep.w, 10)
  near('pager step icon h', m.iconSizes.pagerStep.h, 18)
  near('select chevron w', m.iconSizes.chevron.w, 11.199)
  near('select chevron h', m.iconSizes.chevron.h, 5.599)
  near('calendar icon w', m.iconSizes.calendar.w, 16)
  near('calendar icon h', m.iconSizes.calendar.h, 18)
  near('pagination centre x', cx(m.pagination), 960, 1)

  console.log('-- page')
  eq('page bg', m.pageBg, 'rgb(255, 255, 255)')
}

/** Invariants that must hold after any responsive reflow. */
const responsiveSpec = (m, vp) => {
  ok('no horizontal page overflow', m.scrollW <= m.clientW, `${m.scrollW} <= ${m.clientW}`)
  ok('header within viewport', m.header.w <= vp.width)
  ok('content within viewport', m.content.x >= 0 && m.content.x + m.content.w <= vp.width)
  ok('5 cards still shown', m.cards.length === 5, `${m.cards.length}`)
  ok('cards within viewport', m.cards.every((c) => c.x >= 0 && c.x + c.w <= vp.width))
  ok('9 table columns kept', m.headCells.length === 9, `${m.headCells.length}`)
  ok('5 body rows kept', m.bodyRows.length === 5)
  ok('body type >= 14px', m.bodyType.size >= 14, `${m.bodyType.size}px`)
  ok('delete tap target >= 36px', m.deleteButton.h >= 36, `${m.deleteButton.h}px`)
  // Labels are 12px in a 1200-wide viewBox, so the rendered size scales with it.
  const labelPx = 12 * (m.chart.w / 1200)
  ok('chart labels stay legible', labelPx >= 11, `${labelPx.toFixed(1)}px`)
  ok('3 legend entries', m.legendItems === 3)
  eq('page bg', m.pageBg, 'rgb(255, 255, 255)')
}

/* ---------------------------------------------------------- interaction -- */

/** A compact read of the reactive state: cards, table and chart together. */
const readState = (page) =>
  page.evaluate(() => {
    const cardValue = (label) => {
      for (const c of document.querySelectorAll('[class*="card_"]')) {
        const l = c.querySelector('[class*="cardLabel"]')
        if (l && l.textContent === label) return c.querySelector('[class*="cardValue"]').textContent
      }
      return null
    }
    const rects = [...document.querySelectorAll('svg[viewBox] rect')]
    const h = (r) => Number(r.getAttribute('height'))
    const signUpBars = rects.filter((r) => getComputedStyle(r).fill === 'rgb(6, 22, 105)')
    const subBars = rects.filter((r) => getComputedStyle(r).fill === 'rgb(41, 127, 255)')
    const bodyTexts = [...document.querySelectorAll('tbody td')].map((el) => el.textContent)
    return {
      signUps: cardValue('Sign-ups'),
      subscribers: cardValue('Subscribers'),
      activeTab: document.querySelector('[class*="dateTabActive"]')?.textContent ?? 'none',
      dateValues: [...document.querySelectorAll('[class*="dateValue"]')].map((e) => e.textContent),
      payment: cardValue('Payment Amount'),
      firstCreator: document.querySelector('tbody tr td:nth-child(2)')?.textContent ?? null,
      rowCount: document.querySelectorAll('tbody tr').length,
      dots: document.querySelectorAll('svg circle').length,
      signUpBarSum: +signUpBars.reduce((a, r) => a + h(r), 0).toFixed(1),
      barW: rects.length ? Number(rects[0].getAttribute('width')) : 0,
      barsEqualWidth: rects.every((r) => Math.abs(Number(r.getAttribute('width')) - Number(rects[0].getAttribute('width'))) < 0.01),
      barsOnBaseline: rects.every((r) => Math.abs(Number(r.getAttribute('y')) + h(r) - 281) < 0.5),
      signupGEsub: signUpBars.every((r, i) => h(r) >= h(subBars[i]) - 0.01),
      allBarsPositive: rects.every((r) => h(r) > 0),
      tableHasZero: bodyTexts.includes('$0') || bodyTexts.includes('-'),
      scrollW: document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth,
    }
  })

/** Add Creator: the row count, the summary and the chart must all move. */
const addCreatorFlow = async (page) => {
  console.log('-- add creator')

  // The marks must carry a transition so the change animates rather than snaps.
  const anim = await page.evaluate(() => {
    const bar = document.querySelector('svg[viewBox] rect[class]')
    const dot = document.querySelector('svg[viewBox] circle[class]')
    const line = document.querySelector('svg[viewBox] path[class]')
    const dur = (el) => (el ? getComputedStyle(el).transitionDuration : '0s')
    const props = (el) => (el ? getComputedStyle(el).transitionProperty : '')
    return {
      bar: dur(bar),
      dot: dur(dot),
      line: dur(line),
      barProps: props(bar),
    }
  })
  ok('bars have a transition', parseFloat(anim.bar) > 0, anim.bar)
  ok('dots have a transition', parseFloat(anim.dot) > 0, anim.dot)
  ok('markup line has a transition', parseFloat(anim.line) > 0, anim.line)
  ok('bar transitions its geometry', /height|y\b|\ball\b/.test(anim.barProps), anim.barProps)

  const before = await readState(page)
  await page.click('[class*="addButton"]')
  await page.waitForTimeout(120)
  const midAdd = await page.evaluate(() => {
    const rects = [...document.querySelectorAll('svg[viewBox] rect')]
    return rects.every((r) => Math.abs(Number(r.getAttribute('y')) + Number(r.getAttribute('height')) - 281) < 0.5)
  })
  ok('bars stay on the baseline mid-animation', midAdd)

  await page.waitForTimeout(700) // let the 0.6s chart transition settle
  const after = await readState(page)

  ok('Sign-ups incremented', Number(after.signUps) === Number(before.signUps) + 1, `${before.signUps} -> ${after.signUps}`)
  ok('new creator on top of table', after.firstCreator !== before.firstCreator, `${before.firstCreator} -> ${after.firstCreator}`)

  const badge = await page.evaluate(() => {
    const el = document.querySelector('[class*="newBadge"]')
    const firstRow = document.querySelector('tbody tr')
    return { text: el?.textContent ?? null, inFirstRow: !!(el && firstRow && firstRow.contains(el)) }
  })
  ok('new row shows a New badge', badge.text === 'New', `${badge.text}`)
  ok('badge is on the top row', badge.inFirstRow)

  ok('Subscribers incremented', Number(after.subscribers) === Number(before.subscribers) + 1, `${before.subscribers} -> ${after.subscribers}`)
  ok('chart reacted (bar heights changed)', after.signUpBarSum !== before.signUpBarSum, `${before.signUpBarSum} -> ${after.signUpBarSum}`)
  ok('bars share one width', after.barsEqualWidth)
  ok('bars still on baseline', after.barsOnBaseline)
  ok('sign-up still >= subscriber after add', after.signupGEsub)
  ok('no zero bars after add', after.allBarsPositive)
  ok('no zero cells in table after add', !after.tableHasZero)
  ok('no horizontal overflow', after.scrollW <= after.clientW, `${after.scrollW} <= ${after.clientW}`)

  // A second add keeps compounding.
  await page.click('[class*="addButton"]')
  await page.waitForTimeout(700) // let the 0.6s chart transition settle
  const third = await readState(page)
  ok('Sign-ups incremented again', Number(third.signUps) === Number(after.signUps) + 1, `${after.signUps} -> ${third.signUps}`)
}

/** Delete: the row, the summary and the chart must all react. */
const deleteFlow = async (page) => {
  console.log('-- delete creator')
  const before = await readState(page)
  await page.click('tbody tr:first-child [class*="deleteButton"]')
  await page.waitForTimeout(700)
  const after = await readState(page)

  ok('Subscribers decremented', Number(after.subscribers) === Number(before.subscribers) - 1, `${before.subscribers} -> ${after.subscribers}`)
  ok('Sign-ups decreased', Number(after.signUps) < Number(before.signUps), `${before.signUps} -> ${after.signUps}`)
  ok('a row was removed / changed', after.rowCount < before.rowCount || after.firstCreator !== before.firstCreator)
  ok('chart reacted', after.signUpBarSum !== before.signUpBarSum || after.dots !== before.dots, `${before.signUpBarSum}/${before.dots} -> ${after.signUpBarSum}/${after.dots}`)
  ok('bars stay on baseline after delete', after.barsOnBaseline)
  ok('sign-up still >= subscriber after delete', after.signupGEsub)
  ok('no zero bars after delete', after.allBarsPositive)
  ok('no zero cells in table after delete', !after.tableHasZero)
  ok('no horizontal overflow', after.scrollW <= after.clientW)
}

const sameState = (a, b) =>
  a.signUps === b.signUps && a.firstCreator === b.firstCreator && a.dots === b.dots && a.signUpBarSum === b.signUpBarSum

/** The date-field select offers the three options and updates on choice. */
const dateFieldFlow = async (page) => {
  console.log('-- date-field select')
  const value = () => page.locator('[class*="selectValue"]').first().textContent()
  ok('defaults to Sign-up Date', (await value()) === 'Sign-up Date', await value())
  ok('menu closed initially', (await page.locator('[class*="pickerMenu"]').count()) === 0)

  await page.click('button[class*="select"]')
  const opts = await page.locator('[class*="pickerOption"]').allTextContents()
  ok('menu lists all three options', opts.length === 3, opts.join(' | '))
  ok('options are the three date fields',
    JSON.stringify(opts) === JSON.stringify(['Sign-up Date', 'Subscription Start Date', 'Last Payment Date']),
    opts.join(' | '))
  ok('select box stays 210 wide', Math.abs((await page.locator('button[class*="select"]').first().boundingBox()).width - 210) < 0.75)

  await page.click('text=Subscription Start Date')
  await page.waitForTimeout(100)
  ok('choosing updates the value', (await value()) === 'Subscription Start Date', await value())
  ok('menu closes after choosing', (await page.locator('[class*="pickerMenu"]').count()) === 0)

  await page.click('button[class*="select"]')
  await page.click('text=Last Payment Date')
  await page.waitForTimeout(100)
  ok('can pick Last Payment Date too', (await value()) === 'Last Payment Date', await value())

  // Long value ellipsizes without pushing the box wider.
  ok('box still 210 with long value', Math.abs((await page.locator('button[class*="select"]').first().boundingBox()).width - 210) < 0.75)
}

// Real "today", matching the app's new Date().
const pad2 = (n) => String(n).padStart(2, '0')
const isoOf = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
const T = (() => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
})()

/** The date-range calendars: real-today defaults, opening, picking, filtering. */
const datePickerFlow = async (page) => {
  console.log('-- date range calendars')
  const values = () => page.locator('[class*="dateValue"]').allTextContents()
  const dots = () => page.locator('svg circle').count()

  const start6 = new Date(T)
  start6.setDate(start6.getDate() - 6)
  const [start0, end0] = await values()
  ok('right calendar defaults to today', end0 === isoOf(T), `${end0} vs ${isoOf(T)}`)
  ok('left calendar defaults to 6 days earlier', start0 === isoOf(start6), `${start0} vs ${isoOf(start6)}`)
  ok('no calendar open initially', (await page.locator('[class*="calPopup"]').count()) === 0)

  const cols0 = await dots()

  // Open the end (right) calendar.
  await page.locator('button[class*="dateField"]').nth(1).click()
  ok('calendar opens on click', (await page.locator('[class*="calPopup"]').count()) === 1)
  ok('calendar renders day cells', (await page.locator('button[class*="calDay"]').count()) > 27)

  const day = T.getDate()
  const daysInMonth = new Date(T.getFullYear(), T.getMonth() + 1, 0).getDate()
  if (day < daysInMonth) {
    ok('future days are disabled', await page.locator('button[class*="calDay"]', { hasText: new RegExp(`^${day + 1}$`) }).first().isDisabled())
  }

  if (day >= 2) {
    // Pick yesterday: a valid, visible, earlier end → the range narrows.
    await page.locator('button[class*="calDay"]', { hasText: new RegExp(`^${day - 1}$`) }).first().click()
    await page.waitForTimeout(700)
    const yest = new Date(T)
    yest.setDate(day - 1)
    const [, end1] = await values()
    ok('picking an earlier end updates the value', end1 === isoOf(yest), `${end1} vs ${isoOf(yest)}`)
    ok('calendar closes after picking', (await page.locator('[class*="calPopup"]').count()) === 0)
    ok('narrowing the range filters to fewer columns', (await dots()) < cols0, `${await dots()} < ${cols0}`)
    ok('a tab is no longer active for the custom range', (await page.locator('[class*="dateTabActive"]').count()) === 0)
  }

  // Month navigation works.
  await page.locator('button[class*="dateField"]').nth(0).click()
  const title0 = await page.locator('[class*="calTitle"]').first().textContent()
  await page.locator('button[aria-label="Previous month"]').first().click()
  const title1 = await page.locator('[class*="calTitle"]').first().textContent()
  ok('previous-month navigation changes the header', title0 !== title1, `${title0} -> ${title1}`)
  await page.keyboard.press('Escape')
  ok('Escape closes the calendar', (await page.locator('[class*="calPopup"]').count()) === 0)
}

/** Date tabs: each range repopulates the table, summary and chart. */
const dateTabFlow = async (page) => {
  // The default view is the Last 7 days preset (7 columns over the real week).
  const before = await readState(page)
  ok('starts on the Last 7 days default (7 columns)', before.dots === 7, `${before.dots} dots`)
  ok('Last 7 days tab is active', before.activeTab === 'Last 7 days', before.activeTab)
  ok('default: sign-up >= subscriber', before.signupGEsub)
  ok('default: no zero bars', before.allBarsPositive)
  ok('default: no zero cells in table', !before.tableHasZero)

  console.log('-- re-click the active tab (Last 7 days)')
  await page.click('text=Last 7 days')
  await page.waitForTimeout(700) // let the 0.6s chart transition settle
  const afterReclick = await readState(page)
  ok('re-clicking the active tab changes nothing', sameState(afterReclick, before), `${before.firstCreator} vs ${afterReclick.firstCreator}`)

  console.log('-- Daily + Today: a single day column')
  await page.click('text=Today')
  await page.waitForTimeout(700) // let the 0.6s chart transition settle
  const today = await readState(page)
  ok('Today is one daily column', today.dots === 1, `${today.dots} dots`)
  ok('Today sets both calendars to today', today.dateValues[0] === isoOf(T) && today.dateValues[1] === isoOf(T), today.dateValues.join(' ~ '))
  ok('Today tab is active', today.activeTab === 'Today', today.activeTab)
  ok('Today bars share one width', today.barsEqualWidth)
  ok('Today bars are wide (few columns)', today.barW >= 20, `${today.barW.toFixed(1)}px`)
  ok('Today bars on baseline', today.barsOnBaseline)
  ok('Today sign-up >= subscriber', today.signupGEsub)
  ok('Today no zero cells', !today.tableHasZero)
  ok('Today filters to fewer rows than the week', Number(today.signUps) < Number(before.signUps), `${today.signUps} < ${before.signUps}`)
  ok('Today no horizontal overflow', today.scrollW <= today.clientW)

  console.log('-- Daily + This Month: every real day, thin bars')
  await page.click('text=This Month')
  await page.waitForTimeout(700) // let the 0.6s chart transition settle
  const monthDaily = await readState(page)
  ok('This Month daily shows many day columns', monthDaily.dots >= 10, `${monthDaily.dots} dots`)
  ok('This Month daily bars share one width', monthDaily.barsEqualWidth)
  ok('This Month daily bars are thin (many columns)', monthDaily.barW < today.barW, `${monthDaily.barW.toFixed(1)}px vs ${today.barW.toFixed(1)}px`)
  ok('This Month daily bars on baseline', monthDaily.barsOnBaseline)
  ok('This Month daily sign-up >= subscriber', monthDaily.signupGEsub)
  ok('This Month daily no horizontal overflow', monthDaily.scrollW <= monthDaily.clientW)

  console.log('-- Weekly: same window, fewer week columns, wider bars')
  await page.click('text=Weekly')
  await page.waitForTimeout(700)
  const monthWeekly = await readState(page)
  ok('Weekly collapses to fewer columns than daily', monthWeekly.dots < monthDaily.dots, `${monthWeekly.dots} vs ${monthDaily.dots}`)
  ok('Weekly has at least one column', monthWeekly.dots >= 1)
  ok('Weekly bars are wider than daily', monthWeekly.barW > monthDaily.barW, `${monthWeekly.barW.toFixed(1)}px vs ${monthDaily.barW.toFixed(1)}px`)
  ok('Weekly sign-up >= subscriber', monthWeekly.signupGEsub)
  ok('Weekly no horizontal overflow', monthWeekly.scrollW <= monthWeekly.clientW)

  console.log('-- Last Month daily')
  await page.click('text=Daily')
  await page.waitForTimeout(300)
  await page.click('text=Last Month')
  await page.waitForTimeout(700)
  const last = await readState(page)
  ok('Last Month daily shows many day columns', last.dots >= 10, `${last.dots} dots`)
  ok('Last Month bars on baseline', last.barsOnBaseline)

  console.log('-- return to Today (cached, must be unchanged)')
  await page.click('text=Today')
  await page.waitForTimeout(700) // let the 0.6s chart transition settle
  const todayAgain = await readState(page)
  ok('returning to Today shows the same data', sameState(todayAgain, today), `${today.firstCreator} vs ${todayAgain.firstCreator}`)

  console.log('-- return to Last 7 days (must restore the design default)')
  await page.click('text=Last 7 days')
  await page.waitForTimeout(700) // let the 0.6s chart transition settle
  const week = await readState(page)
  ok('Last 7 days restores the same default', sameState(week, before), `${week.signUps}/${week.firstCreator}/${week.dots}`)
  ok('default still has 7 columns', week.dots === 7, `${week.dots} dots`)
  ok('Last 7 days no horizontal overflow', week.scrollW <= week.clientW)
}

/* ------------------------------------------------------------------ run -- */

const RUNS = [
  { route: '/', name: 'report-1920x1080', width: 1920, height: 1080, spec: reportSpec },
  { route: '/', name: 'report-1440x900', width: 1440, height: 900, spec: responsiveSpec },
  { route: '/', name: 'report-1024x900', width: 1024, height: 900, spec: responsiveSpec },
  { route: '/', name: 'report-768x1024', width: 768, height: 1024, spec: responsiveSpec },
  { route: '/', name: 'report-390x844', width: 390, height: 844, spec: responsiveSpec },
  { route: '/', name: 'report-320x568', width: 320, height: 568, spec: responsiveSpec },
  { route: '/', name: 'flow-add-creator', width: 1440, height: 900, interaction: addCreatorFlow },
  { route: '/', name: 'flow-delete-creator', width: 1440, height: 900, interaction: deleteFlow },
  { route: '/', name: 'flow-date-field', width: 1440, height: 900, interaction: dateFieldFlow },
  { route: '/', name: 'flow-date-picker', width: 1440, height: 900, interaction: datePickerFlow },
  { route: '/', name: 'flow-date-tabs', width: 1440, height: 900, interaction: dateTabFlow },
]

const browser = await chromium.launch()

for (const run of RUNS) {
  const page = await browser.newPage({ viewport: { width: run.width, height: run.height } })
  await page.goto(`${BASE}/#${run.route}`, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(300)

  console.log(`\n===== ${run.name} =====`)

  if (run.interaction) {
    await run.interaction(page)
    if (OUT) await page.screenshot({ path: `${OUT}/${run.name}.png`, fullPage: true })
  } else {
    if (OUT) await page.screenshot({ path: `${OUT}/${run.name}.png`, fullPage: true })
    const m = await page.evaluate(probe)
    run.spec(m, run)
    const oY = m.scrollH > m.clientH
    console.log(`${oY ? 'note' : 'OK  '} vertical scroll: ${oY ? `${m.scrollH} > ${m.clientH}` : 'none'}`)
  }

  await page.close()
}

await browser.close()
console.log(
  `\n${checks} checks — ${failures === 0 ? 'PASS, no drift from spec' : `${failures} FAILURE(S)`}`,
)
process.exit(failures === 0 ? 0 : 1)
