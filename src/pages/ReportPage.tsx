import { useState } from 'react'
import HeaderPc from '../components/HeaderPc'
import SignupChart from '../components/SignupChart'
import { DATE_TABS, GRAPH_TABS, ROWS, SUMMARY } from '../data/report'
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

/** "보고서 영문" — Creator Sign-up Report (Figma node 3910:19916). */
export default function ReportPage() {
  const [dateTab, setDateTab] = useState<string>('Last 7 days')
  const [graphTab, setGraphTab] = useState<string>('Daily')

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
                  className={`${styles.dateTab} ${tab === dateTab ? styles.dateTabActive : ''}`}
                  onClick={() => setDateTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.summary}>
            {SUMMARY.map((item) => (
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
            <SignupChart className={styles.chart} />
            <div className={styles.legend}>
              <span className={styles.legendItem}>
                <span
                  className={styles.legendDot}
                  style={{ background: 'var(--color-border-pd01)' }}
                />
                Sign-ups
              </span>
              <span className={styles.legendItem}>
                <span
                  className={styles.legendDot}
                  style={{ background: 'var(--color-border-pd02)' }}
                />
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
              <span className={`${styles.buttonIcon} ${styles.iconDownload}`}><img src={download} alt="" /></span>
              Export CSV
            </button>
            <button type="button" className={styles.addButton}>
              <span className={`${styles.buttonIcon} ${styles.iconAdd}`}><img src={add} alt="" /></span>
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
                {ROWS.map((row) => (
                  <tr key={row.creator}>
                    <td className={styles.colFlex}>{row.signUpDate}</td>
                    <td className={styles.colCreator}>{row.creator}</td>
                    <td className={styles.colFlex}>{row.promoCredit}</td>
                    <td className={styles.colStart}>{row.startDate}</td>
                    <td className={styles.colFlex}>{row.plan}</td>
                    <td className={styles.colFlex}>{row.lastPayment}</td>
                    <td className={styles.colFlex}>{row.amount}</td>
                    <td className={styles.colFlex}>{row.markup}</td>
                    <td className={styles.colAction}>
                      <button type="button" className={styles.deleteButton}>
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
              <button type="button" className={`${styles.pagerArrow} ${styles.pagerEnd}`} aria-label="First page">
                <img src={pageFirst} alt="" />
              </button>
              <button type="button" className={`${styles.pagerArrow} ${styles.pagerStep}`} aria-label="Previous page">
                <img src={pagePrev} alt="" />
              </button>
            </span>
            <button type="button" className={styles.pagerPage} aria-current="page">
              1
            </button>
            <span className={styles.pagerGroup}>
              <button type="button" className={`${styles.pagerArrow} ${styles.pagerStep}`} aria-label="Next page">
                <img src={pageNext} alt="" />
              </button>
              <button type="button" className={`${styles.pagerArrow} ${styles.pagerEnd}`} aria-label="Last page">
                <img src={pageLast} alt="" />
              </button>
            </span>
          </nav>
        </section>
      </main>
    </div>
  )
}
