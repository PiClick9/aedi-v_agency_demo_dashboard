import { useMemo, useRef, useState } from 'react'
import HeaderPc from '../components/HeaderPc'
import SignupChart from '../components/SignupChart'
import {
  GRAPH_TABS,
  DATE_TABS,
  INITIAL_BUCKETS,
  INITIAL_CARDS,
  INITIAL_CREATORS,
  buildCards,
  bumpBucket,
  computeValues,
  generateDataset,
  makeCreator,
  type Card,
  type Creator,
  type Bucket,
  type Range,
} from '../data/report'
import chevron from '../assets/icon-chevron.svg'
import calendar from '../assets/icon-calendar.svg'
import download from '../assets/icon-download.svg'
import add from '../assets/icon-add.svg'
import pageFirst from '../assets/icon-page-first.svg'
import pagePrev from '../assets/icon-page-prev.svg'
import pageNext from '../assets/icon-page-next.svg'
import pageLast from '../assets/icon-page-last.svg'
import trendUp from '../assets/icon-trend-up.png'
import styles from './ReportPage.module.css'

const PAGE_SIZE = 5

type Dataset = { creators: Creator[]; buckets: Bucket[]; cards: Card[] }

// "Last 7 days" is the default and is pinned to the exact design data. Other
// ranges are generated once, on first visit, then cached — so re-clicking an
// active tab does nothing and returning to a tab shows the same data.
const INITIAL_DATASETS: Partial<Record<Range, Dataset>> = {
  'Last 7 days': { creators: INITIAL_CREATORS, buckets: INITIAL_BUCKETS, cards: INITIAL_CARDS },
}

/** "보고서 영문" — Creator Sign-up Report (Figma node 3910:19916). */
export default function ReportPage() {
  const [range, setRange] = useState<Range>('Last 7 days')
  const [graphTab, setGraphTab] = useState<string>('Daily')
  const [datasets, setDatasets] = useState<Partial<Record<Range, Dataset>>>(INITIAL_DATASETS)
  const [page, setPage] = useState(1)
  // Id of the just-added creator, so its table row can flag itself as new.
  const [newId, setNewId] = useState<number | null>(null)
  const newTimer = useRef<number | undefined>(undefined)

  const flagNew = (id: number | null) => {
    window.clearTimeout(newTimer.current)
    setNewId(id)
    if (id !== null) newTimer.current = window.setTimeout(() => setNewId(null), 2400)
  }

  const { creators, buckets, cards } = datasets[range]!

  const pageCount = Math.max(1, Math.ceil(creators.length / PAGE_SIZE))
  const current = Math.min(page, pageCount)
  const pageRows = useMemo(
    () => creators.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE),
    [creators, current],
  )

  const selectRange = (next: Range) => {
    if (next === range) return // already active — nothing to change
    // Generate a range's data only the first time it is opened; keep it after.
    setDatasets((prev) => (prev[next] ? prev : { ...prev, [next]: generateDataset(next) }))
    setRange(next)
    setPage(1)
    flagNew(null)
  }

  const updateCurrent = (dataset: Dataset) =>
    setDatasets((prev) => ({ ...prev, [range]: dataset }))

  const addCreator = () => {
    const prev = computeValues(creators)
    const { creator, bucketIndex } = makeCreator(creators, buckets)
    const nextCreators = [creator, ...creators]
    updateCurrent({
      creators: nextCreators,
      buckets: bumpBucket(buckets, bucketIndex, creator),
      cards: buildCards(computeValues(nextCreators), prev),
    })
    setPage(1)
    flagNew(creator.id)
  }

  const deleteCreator = (id: number) => {
    const prev = computeValues(creators)
    const nextCreators = creators.filter((c) => c.id !== id)
    updateCurrent({ creators: nextCreators, buckets, cards: buildCards(computeValues(nextCreators), prev) })
  }

  const goToPage = (p: number) => setPage(Math.min(pageCount, Math.max(1, p)))

  return (
    <div className={styles.page}>
      <HeaderPc />

      <main className={styles.content}>
        <h1 className={styles.title}>Creator Sign-up Report</h1>

        <section className={styles.viz}>
          <div className={styles.dateRow}>
            <span className={styles.dateLabel}>Date Range</span>

            <div className={styles.select}>
              <span className={styles.selectValue}>Sign-up Date</span>
              <span className={styles.selectDivider} />
              <img className={styles.selectArrow} src={chevron} alt="" />
            </div>

            <div className={styles.datepicker}>
              <div className={styles.dateField}>
                <img className={styles.calendarIcon} src={calendar} alt="" />
                <span className={styles.dateValue}>2026-07-22</span>
              </div>
              <span className={styles.dateSeparator}>~</span>
              <div className={styles.dateField}>
                <img className={styles.calendarIcon} src={calendar} alt="" />
                <span className={styles.dateValue}>2026-07-28</span>
              </div>
            </div>

            <div className={styles.dateTabs}>
              {DATE_TABS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={`${styles.dateTab} ${tab === range ? styles.dateTabActive : ''}`}
                  onClick={() => selectRange(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.summary}>
            {cards.map((item) => (
              <div
                key={item.label}
                className={styles.card}
                style={{ '--card-accent': item.accent } as React.CSSProperties}
              >
                <span className={styles.cardLabel}>{item.label}</span>
                <span className={styles.cardValue}>{item.value}</span>
                <span className={styles.cardDelta}>
                  {item.delta}
                  <img className={styles.cardTrend} src={trendUp} alt="" />
                </span>
              </div>
            ))}
          </div>

          <div className={styles.graphTabs}>
            {GRAPH_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                className={`${styles.graphTab} ${tab === graphTab ? styles.graphTabActive : ''}`}
                onClick={() => setGraphTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className={styles.chartArea}>
            <SignupChart className={styles.chart} buckets={buckets} />
            <div className={styles.legend}>
              <span className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: 'var(--color-border-pd01)' }} />
                Sign-ups
              </span>
              <span className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: 'var(--color-border-pd02)' }} />
                Subscribers
              </span>
              <span className={styles.legendItem}>
                <span className={styles.legendLine} />
                Markup
              </span>
            </div>
          </div>
        </section>

        <section>
          <div className={styles.actions}>
            <button type="button" className={styles.exportButton}>
              <span className={`${styles.buttonIcon} ${styles.iconDownload}`}>
                <img src={download} alt="" />
              </span>
              Export CSV
            </button>
            <button type="button" className={styles.addButton} onClick={addCreator}>
              <span className={`${styles.buttonIcon} ${styles.iconAdd}`}>
                <img src={add} alt="" />
              </span>
              Add Creator
            </button>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={`${styles.colFlex} ${styles.headNowrap}`}>Sign-up Date</th>
                  <th className={`${styles.colCreator} ${styles.headNowrap}`}>Creator Name</th>
                  <th className={`${styles.colFlex} ${styles.headNowrap}`}>Promo Credit</th>
                  <th className={styles.colStart}>Subscription Start Date</th>
                  <th className={styles.colFlex}>Subscription Plan</th>
                  <th className={`${styles.colFlex} ${styles.headLastPayment}`}>Last Payment Date</th>
                  <th className={`${styles.colFlex} ${styles.alignRight}`}>Payment Amount</th>
                  <th className={`${styles.colFlex} ${styles.headMarkup} ${styles.headNowrap}`}>Markup</th>
                  <th className={styles.colAction} aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => (
                  <tr key={row.id} className={row.id === newId ? styles.rowNew : undefined}>
                    <td className={styles.colFlex}>{row.signUpDate}</td>
                    <td className={styles.colCreator}>
                      {row.creator}
                      {row.id === newId && <span className={styles.newBadge}>New</span>}
                    </td>
                    <td className={styles.colFlex}>{row.promoCredit}</td>
                    <td className={styles.colStart}>{row.startDate}</td>
                    <td className={styles.colFlex}>{row.plan}</td>
                    <td className={styles.colFlex}>{row.lastPayment}</td>
                    <td className={styles.colFlex}>{row.amount}</td>
                    <td className={styles.colFlex}>{row.markup}</td>
                    <td className={styles.colAction}>
                      <button
                        type="button"
                        className={styles.deleteButton}
                        onClick={() => deleteCreator(row.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <nav className={styles.pagination} aria-label="Pagination">
            <span className={styles.pagerGroup}>
              <button
                type="button"
                className={`${styles.pagerArrow} ${styles.pagerEnd}`}
                aria-label="First page"
                onClick={() => goToPage(1)}
              >
                <img src={pageFirst} alt="" />
              </button>
              <button
                type="button"
                className={`${styles.pagerArrow} ${styles.pagerStep}`}
                aria-label="Previous page"
                onClick={() => goToPage(current - 1)}
              >
                <img src={pagePrev} alt="" />
              </button>
            </span>

            <span className={styles.pagerPages}>
              {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  className={p === current ? styles.pagerPage : styles.pagerPageInactive}
                  aria-current={p === current ? 'page' : undefined}
                  onClick={() => goToPage(p)}
                >
                  {p}
                </button>
              ))}
            </span>

            <span className={styles.pagerGroup}>
              <button
                type="button"
                className={`${styles.pagerArrow} ${styles.pagerStep}`}
                aria-label="Next page"
                onClick={() => goToPage(current + 1)}
              >
                <img src={pageNext} alt="" />
              </button>
              <button
                type="button"
                className={`${styles.pagerArrow} ${styles.pagerEnd}`}
                aria-label="Last page"
                onClick={() => goToPage(pageCount)}
              >
                <img src={pageLast} alt="" />
              </button>
            </span>
          </nav>
        </section>
      </main>
    </div>
  )
}
