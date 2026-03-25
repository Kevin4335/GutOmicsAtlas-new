import { Route, Routes } from 'react-router-dom'
import Home from '../pages/Home'
import PlaceholderPage from '../pages/PlaceholderPage'

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/chat" element={<PlaceholderPage />} />
      <Route path="/help" element={<PlaceholderPage />} />
      <Route path="/about" element={<PlaceholderPage />} />
      <Route path="/scrna" element={<PlaceholderPage />} />
      <Route path="/spatial-metabolomics" element={<PlaceholderPage />} />
      <Route path="*" element={<PlaceholderPage />} />
    </Routes>
  )
}
