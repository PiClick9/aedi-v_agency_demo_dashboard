import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import ReportPage from './pages/ReportPage'

// HashRouter keeps deep links working on GitHub Pages, which serves no
// SPA rewrite rules.
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<ReportPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
