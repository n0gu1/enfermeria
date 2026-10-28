import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
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
  const [showSplash, setShowSplash] = useState(true)

  useEffect(() => {
    if (!loaderReady) return

    const timer = window.setTimeout(() => setShowSplash(false), 5000)
    return () => window.clearTimeout(timer)
  }, [loaderReady])

  return (
    <>
      <div aria-hidden={showSplash} inert={showSplash}>
        <ToastProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Dashboard />} />
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
      {showSplash && <StartupLoader onLoaded={() => setLoaderReady(true)} />}
    </>
  )
}
