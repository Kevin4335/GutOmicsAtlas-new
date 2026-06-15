import { Navigate, Route, Routes } from 'react-router-dom'
import Home from '../pages/Home'
import PlaceholderPage from '../pages/PlaceholderPage'
import Scrna from '../pages/Scrna'
import Snatac from '../pages/Snatac'
import SpatialTranscriptomics from '../pages/SpatialTranscriptomics'
import AILanding from '../pages/AILanding'
import AIChat from '../pages/AIChat'
import Help from '../pages/Help'
import About from '../pages/About'

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/chat" element={<AILanding />} />
      <Route path="/chat/conversation" element={<AIChat />} />
      <Route path="/help" element={<Help />} />
      <Route path="/about" element={<About />} />
      <Route path="/scrna" element={<Scrna />} />
      <Route path="/snatac" element={<Snatac />} />
      <Route path="/spatial-metabolomics" element={<Navigate to="/spatial-transcriptomics" replace />} />
      <Route path="/spatial-transcriptomics" element={<SpatialTranscriptomics />} />
      <Route path="*" element={<PlaceholderPage />} />
    </Routes>
  )
}
