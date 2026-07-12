import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage.jsx'
import CheckinPage from './pages/CheckinPage.jsx'
import AgentPage from './pages/AgentPage.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/checkin/:sessionId" element={<CheckinPage />} />
        <Route path="/session/:sessionId" element={<AgentPage />} />
      </Routes>
    </BrowserRouter>
  )
}
