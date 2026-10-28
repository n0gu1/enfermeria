import { useCallback, useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { api } from '../api'
import { formatLongDate } from '../lib/format'
import { Icon, type IconName } from './Icon'

interface NavItem {
  to: string
  label: string
  icon: IconName
  end?: boolean
}

const principal: NavItem[] = [
  { to: '/', label: 'Panel', icon: 'dashboard', end: true },
  { to: '/registros', label: 'Registros', icon: 'records' },
  { to: '/conteos', label: 'Conteos', icon: 'chart' },
]

const catalogos: NavItem[] = [
  { to: '/lugares', label: 'Lugares', icon: 'place' },
  { to: '/vacunas', label: 'Vacunas', icon: 'vaccine' },
  { to: '/tiempos', label: 'Tiempos', icon: 'clock' },
  { to: '/dosis', label: 'Dosis', icon: 'dose' },
]

const pageTitles: Record<string, string> = {
  '/': 'Panel de control',
  '/registros': 'Registros de vacunación',
  '/conteos': 'Conteos y reportes',
  '/lugares': 'Lugares de vacunación',
  '/vacunas': 'Catálogo de vacunas',
  '/tiempos': 'Tiempos de esquema',
  '/dosis': 'Catálogo de dosis',
}

type HealthState = 'checking' | 'online' | 'offline'

function useApiHealth() {
  const [state, setState] = useState<HealthState>('checking')
  const [latency, setLatency] = useState<number | null>(null)
  const [database, setDatabase] = useState<string | null>(null)
  const [checkedAt, setCheckedAt] = useState<Date | null>(null)

  const check = useCallback(async () => {
    setState('checking')
    const started = performance.now()
    try {
      const health = await api.health()
      setLatency(Math.round(performance.now() - started))
      setDatabase(health.database)
      setState('online')
    } catch {
      setLatency(null)
      setDatabase(null)
      setState('offline')
    } finally {
      setCheckedAt(new Date())
    }
  }, [])

  useEffect(() => {
    void check()
    const interval = window.setInterval(() => void check(), 60_000)
    const onFocus = () => void check()
    window.addEventListener('focus', onFocus)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', onFocus)
    }
  }, [check])

  return { state, latency, database, checkedAt, check }
}

function NavSection({
  label,
  items,
  onNavigate,
}: {
  label: string
  items: NavItem[]
  onNavigate: () => void
}) {
  return (
    <div className="nav-group">
      <span className="nav-group__label">{label}</span>
      <nav aria-label={label}>
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              isActive ? 'nav-link nav-link--active' : 'nav-link'
            }
          >
            <Icon name={item.icon} />
            <span>{item.label}</span>
            <span className="nav-link__dot" aria-hidden="true" />
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export function Layout() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const location = useLocation()
  const health = useApiHealth()

  const title = useMemo(
    () => pageTitles[location.pathname] ?? 'Enfermería',
    [location.pathname],
  )

  useEffect(() => {
    setDrawerOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [location.pathname])

  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrawerOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [drawerOpen])

  const healthLabel =
    health.state === 'online'
      ? health.latency !== null
        ? `API en línea · ${health.latency} ms`
        : 'API en línea'
      : health.state === 'checking'
        ? 'Conectando con la API…'
        : 'API sin respuesta'

  const healthTitle =
    health.state === 'online'
      ? `Servicio y base de datos disponibles${health.database ? ` (${health.database})` : ''}.${
          health.checkedAt
            ? ` Última verificación: ${health.checkedAt.toLocaleTimeString('es-ES')}.`
            : ''
        }`
      : health.state === 'checking'
        ? 'Verificando el estado del servicio.'
        : 'No se pudo contactar la API. Si el servicio estaba dormido, puede tardar hasta un minuto en despertar.'

  return (
    <div className="app-shell">
      <div
        className={`drawer-overlay${drawerOpen ? ' drawer-overlay--visible' : ''}`}
        onClick={() => setDrawerOpen(false)}
        aria-hidden="true"
      />

      <aside className={`sidebar${drawerOpen ? ' sidebar--open' : ''}`}>
        <div className="sidebar__top">
          <NavLink to="/" className="brand" onClick={() => setDrawerOpen(false)}>
            <span className="brand__mark">
              <Icon name="syringe" />
            </span>
            <span className="brand__text">
              <strong>Enfermería</strong>
              <small>Control de vacunación</small>
            </span>
          </NavLink>

          <button
            type="button"
            className="icon-button sidebar__close"
            onClick={() => setDrawerOpen(false)}
            aria-label="Cerrar menú"
          >
            <Icon name="close" />
          </button>
        </div>

        <div className="sidebar__nav">
          <NavSection
            label="Operación"
            items={principal}
            onNavigate={() => setDrawerOpen(false)}
          />
          <NavSection
            label="Catálogos"
            items={catalogos}
            onNavigate={() => setDrawerOpen(false)}
          />
        </div>

        <div className="sidebar__footer">
          <button
            type="button"
            className={`health health--${health.state}`}
            onClick={() => void health.check()}
            title={healthTitle}
          >
            <span className="health__dot" />
            <span className="health__text">
              <strong>{healthLabel}</strong>
              <small>
                {health.state === 'offline'
                  ? 'Toca para reintentar'
                  : 'Render · Neon PostgreSQL'}
              </small>
            </span>
            <Icon name="refresh" />
          </button>
          <p className="sidebar__version">v1.0 · API .NET 10</p>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbar__left">
            <button
              type="button"
              className="icon-button topbar__menu"
              onClick={() => setDrawerOpen(true)}
              aria-label="Abrir menú"
              aria-expanded={drawerOpen}
            >
              <Icon name="menu" />
            </button>
            <div className="topbar__path">
              <span>Sistema de vacunación</span>
              <strong>{title}</strong>
            </div>
          </div>

          <div className="topbar__right">
            <span className="topbar__date">
              <Icon name="calendar" />
              {formatLongDate().replace(/^./, (letter) => letter.toUpperCase())}
            </span>
            <button
              type="button"
              className={`status-pill status-pill--${health.state}`}
              onClick={() => void health.check()}
              title={healthTitle}
            >
              <span className="status-pill__dot" />
              {health.state === 'online'
                ? 'En línea'
                : health.state === 'checking'
                  ? 'Verificando'
                  : 'Sin conexión'}
            </button>
            <div className="user-chip" title="Sesión de enfermería">
              <span className="user-chip__avatar">EN</span>
              <span className="user-chip__text">
                <strong>Enfermería</strong>
                <small>Equipo de vacunación</small>
              </span>
            </div>
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
