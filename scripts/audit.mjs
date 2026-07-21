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
    exportButton: box(q('exportButton')),
    addButton: box(q('addButton')),
    addButtonStyle: style(q('addButton'), ['backgroundColor', 'color', 'borderTopLeftRadius']),
    exportButtonStyle: style(q('exportButton'), ['backgroundColor', 'color', 'borderTopWidth', 'borderTopColor']),

    table: box(document.querySelector('table')),
    headRow: box(document.querySelector('thead tr')),
    headCells: headCells.map((el) => ({ ...box(el), text: el.textContent })),
    headType: type(headCells[0]),
    markupHeadSize: headCells[7] ? parseFloat(getComputedStyle(headCells[7]).fontSize) : null,
    headBg: headCells[0] ? getComputedStyle(headCells[0]).backgroundColor : null,
    bodyRows: [...document.querySelectorAll('tbody tr')].map(box),
    bodyCells: firstRowCells.map((el) => ({ ...box(el), text: el.textContent })),
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
      download: box(document.querySelector('[class*="iconDownload"] img')),
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
  near('card value size', m.cardValueType.size, 20)
  eq('card value weight', m.cardValueType.weight, '700')
  near('card delta size', m.cardDeltaType.size, 14)

  console.log('-- graph tabs')
  near('graph tabs y (from summary)', m.graphTabs.y - (m.summary.y + m.summary.h), 16)
  near('graph tabs h', m.graphTabs.h, 48)
  ok('4 graph tabs', m.graphTabList.length === 4, `${m.graphTabList.length}`)
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
  ok('6 sign-up bars', signUps.length === 6, `${signUps.length}`)
  ok('6 subscriber bars', subs.length === 6, `${subs.length}`)
  ok('all bars 50 wide', m.bars.every((b) => b.w === 50))
  ok('all bars share the 281 baseline', m.bars.every((b) => Math.abs(b.y + b.h - 281) < 0.01))
  ok('6 markup dots', m.dots === 6, `${m.dots}`)
  ok('3 legend entries', m.legendItems === 3, `${m.legendItems}`)
  near('legend centre x', cx(m.legend), cx(m.chart), 1)

  console.log('-- actions')
  near('export button w', m.exportButton.w, 126)
  near('export button h', m.exportButton.h, 40)
  near('add button w', m.addButton.w, 130)
  near('add button h', m.addButton.h, 40)
  near('button gap', m.addButton.x - (m.exportButton.x + m.exportButton.w), 16)
  near('actions w', m.exportButton.w + 16 + m.addButton.w, 272)
  eq('add button bg', m.addButtonStyle.backgroundColor, 'rgb(26, 26, 26)')
  eq('add button colour', m.addButtonStyle.color, 'rgb(255, 255, 255)')
  near('add button radius', parseFloat(m.addButtonStyle.borderTopLeftRadius), 5)
  eq('export button bg', m.exportButtonStyle.backgroundColor, 'rgb(255, 255, 255)')
  eq('export button border', m.exportButtonStyle.borderTopColor, 'rgb(228, 231, 234)')
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

  console.log('-- pagination')
  near('pagination y (from table)', m.pagination.y - (m.table.y + m.table.h), 32)
  near('pager page', m.pagerPage.w, 30)
  near('pager page h', m.pagerPage.h, 30)
  eq('pager page bg', m.pagerPageStyle.backgroundColor, 'rgb(26, 26, 26)')
  eq('pager page colour', m.pagerPageStyle.color, 'rgb(255, 255, 255)')
  ok('4 pager arrows', m.pagerArrows === 4, `${m.pagerArrows}`)

  console.log('-- icon insets')
  near('download icon', m.iconSizes.download.w, 11.87, 0.2)
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
    const signUpBars = rects.filter((r) => getComputedStyle(r).fill === 'rgb(6, 22, 105)')
    return {
      signUps: cardValue('Sign-ups'),
      subscribers: cardValue('Subscribers'),
      payment: cardValue('Payment Amount'),
      firstCreator: document.querySelector('tbody tr td:nth-child(2)')?.textContent ?? null,
      rowCount: document.querySelectorAll('tbody tr').length,
      dots: document.querySelectorAll('svg circle').length,
      signUpBarSum: +signUpBars.reduce((a, r) => a + Number(r.getAttribute('height')), 0).toFixed(1),
      barsWidth50: rects.every((r) => Number(r.getAttribute('width')) === 50),
      barsOnBaseline: rects.every(
        (r) => Math.abs(Number(r.getAttribute('y')) + Number(r.getAttribute('height')) - 281) < 0.5,
      ),
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

  ok('chart reacted (bar heights changed)', after.signUpBarSum !== before.signUpBarSum, `${before.signUpBarSum} -> ${after.signUpBarSum}`)
  ok('bars still 50 wide', after.barsWidth50)
  ok('bars still on baseline', after.barsOnBaseline)
  ok('no horizontal overflow', after.scrollW <= after.clientW, `${after.scrollW} <= ${after.clientW}`)

  // A second add keeps compounding.
  await page.click('[class*="addButton"]')
  await page.waitForTimeout(700) // let the 0.6s chart transition settle
  const third = await readState(page)
  ok('Sign-ups incremented again', Number(third.signUps) === Number(after.signUps) + 1, `${after.signUps} -> ${third.signUps}`)
}

const sameState = (a, b) =>
  a.signUps === b.signUps && a.firstCreator === b.firstCreator && a.dots === b.dots && a.signUpBarSum === b.signUpBarSum

/** Date tabs: each range repopulates the table, summary and chart. */
const dateTabFlow = async (page) => {
  // The default view (Last 7 days) is the pinned design data.
  const before = await readState(page)
  ok('starts on the design default', before.signUps === '5' && before.dots === 6, `${before.signUps}, ${before.dots} dots`)

  console.log('-- re-click the active tab (Last 7 days)')
  await page.click('text=Last 7 days')
  await page.waitForTimeout(700) // let the 0.6s chart transition settle
  const afterReclick = await readState(page)
  ok('re-clicking the active tab changes nothing', sameState(afterReclick, before), `${before.firstCreator} vs ${afterReclick.firstCreator}`)

  console.log('-- date tab: Today')
  await page.click('text=Today')
  await page.waitForTimeout(700) // let the 0.6s chart transition settle
  const today = await readState(page)
  ok('Today reconfigures the chart to 1 column', today.dots === 1, `${today.dots} dots`)
  ok('Today bars 50 wide', today.barsWidth50)
  ok('Today bars on baseline', today.barsOnBaseline)
  ok('Today data differs from initial', today.firstCreator !== before.firstCreator || today.signUps !== before.signUps)
  ok('Today no horizontal overflow', today.scrollW <= today.clientW)

  console.log('-- date tab: This Month')
  await page.click('text=This Month')
  await page.waitForTimeout(700) // let the 0.6s chart transition settle
  const month = await readState(page)
  ok('This Month uses weekly columns', month.dots >= 4, `${month.dots} dots`)
  ok('This Month bars 50 wide', month.barsWidth50)
  ok('This Month bars on baseline', month.barsOnBaseline)
  ok('This Month no horizontal overflow', month.scrollW <= month.clientW)

  console.log('-- date tab: Last Month')
  await page.click('text=Last Month')
  await page.waitForTimeout(700) // let the 0.6s chart transition settle
  const last = await readState(page)
  ok('Last Month uses weekly columns', last.dots >= 4, `${last.dots} dots`)
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
  ok('Last 7 days restores the exact default', sameState(week, before), `${week.signUps}/${week.firstCreator}/${week.dots}`)
  ok('default is still the design data', week.signUps === '5' && week.dots === 6, `${week.signUps}, ${week.dots} dots`)
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
