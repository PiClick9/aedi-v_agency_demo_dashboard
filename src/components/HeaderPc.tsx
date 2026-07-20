import symbol from '../assets/aedi-v-symbol.svg'
import wordmark from '../assets/aedi-v-wordmark.svg'
import globe from '../assets/icon-globe.svg'
import styles from './HeaderPc.module.css'

/** header_pc (Figma node 3910:19917). */
export default function HeaderPc() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.logo}>
          <img className={styles.logoSymbol} src={symbol} alt="" />
          <img className={styles.logoWordmark} src={wordmark} alt="aedi-v" />
        </div>
        <img className={styles.globe} src={globe} alt="Language" />
      </div>
    </header>
  )
}
