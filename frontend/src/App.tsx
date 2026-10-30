import { useCallback, useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Layout } from './components/Layout'
import { StartupLoader } from './components/Loading'
import { ToastProvider } from './components/Toast'
import { Catalogos } from './pages/Catalogos'
import { Conteos } from './pages/Conteos'
import { Dashboard } from './pages/Dashboard'
import { NotFound } from './pages/NotFound'
import { Registros } from './pages/Registros'

export default function App() {
  const [loaderReady, setLoaderReady] = useState(false)
  const [minimumElapsed, setMinimumElapsed] = useState(false)
  const [showSplash, setShowSplash] = useState(true)
  const { pathname } = useLocation()
  const [dashboardReady, setDashboardReady] = useState(false)
  const markLoaderReady = useCallback(() => setLoaderReady(true), [])
  const markDashboardReady = useCallback(() => setDashboardReady(true), [])

  useEffect(() => {
    if (!loaderReady) return

    const timer = window.setTimeout(() => setMinimumElapsed(true), 5000)
    return () => window.clearTimeout(timer)
  }, [loaderReady])

  useEffect(() => {
    const onDashboard = pathname === '/' || pathname === '/inicio'
    if (minimumElapsed && (!onDashboard || dashboardReady)) setShowSplash(false)
  }, [minimumElapsed, pathname, dashboardReady])

  return (
    <>
      <div aria-hidden={showSplash} inert={showSplash}>
        <ToastProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Dashboard onInitialLoadComplete={markDashboardReady} />} />
              <Route path="registros" element={<Registros />} />
              <Route path="conteos" element={<Conteos />} />
              <Route path="lugares" element={<Catalogos key="lugares" resource="lugares" />} />
              <Route path="vacunas" element={<Catalogos key="vacunas" resource="vacunas" />} />
              <Route path="tiempos" element={<Catalogos key="tiempos" resource="tiempos" />} />
              <Route path="dosis" element={<Catalogos key="dosis" resource="dosis" />} />
              <Route path="inicio" element={<Navigate to="/" replace />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </ToastProvider>
      </div>
      {showSplash && <StartupLoader onLoaded={markLoaderReady} />}
    </>
  )
}
