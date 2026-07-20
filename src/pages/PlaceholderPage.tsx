import symbol from '../assets/aedi-v-symbol.svg'
import wordmark from '../assets/aedi-v-wordmark.svg'
import styles from './PlaceholderPage.module.css'

/**
 * Temporary landing page so the deployment is verifiable before any dashboard
 * screen exists. Replace with the first Figma screen.
 */
export default function PlaceholderPage() {
  return (
    <main className={styles.page}>
      <div className={styles.logo}>
        <img className={styles.logoSymbol} src={symbol} alt="" />
        <img className={styles.logoWordmark} src={wordmark} alt="aedi-v" />
      </div>

      <section className={styles.card}>
        <h1 className={styles.title}>AGENCY DASHBOARD</h1>
        <p className={styles.note}>화면 작업 예정</p>
      </section>
    </main>
  )
}
