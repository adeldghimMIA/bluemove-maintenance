import { StrictMode, useCallback, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import 'leaflet/dist/leaflet.css'
import './index.css'
import { Splash } from './components/Splash'
import Home from './pages/Home'
import Technicien from './pages/Technicien'
import Dashboard from './pages/Dashboard'
import Telephone from './pages/Telephone'

function App() {
  const [splash, setSplash] = useState(true)
  const done = useCallback(() => setSplash(false), [])
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/technicien" element={<Technicien />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/telephone" element={<Telephone />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      {splash && <Splash onDone={done} />}
    </>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
