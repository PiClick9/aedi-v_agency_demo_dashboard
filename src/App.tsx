import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import PlaceholderPage from './pages/PlaceholderPage'

// HashRouter keeps deep links working on GitHub Pages, which serves no
// SPA rewrite rules.
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<PlaceholderPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
