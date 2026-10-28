import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  api,
  ApiError,
  type ConteoParams,
  type Dosis,
  type Lugar,
  type Tiempo,
  type Vacuna,
} from '../api'
import { EmptyState } from '../components/EmptyState'
import { Icon, type IconName } from '../components/Icon'
import { PageLoader } from '../components/Loading'
import { PageHeader } from '../components/PageHeader'
import { useToast } from '../components/Toast'
import { downloadCsv } from '../lib/csv'
import { formatDate, formatNumber, toLocalISO, todayISO } from '../lib/format'

type TabKey =
  | 'lugar-fecha'
  | 'lugar-fecha-vacuna'
  | 'detalle'
  | 'por-fecha'
  | 'por-lugar'
  | 'por-vacuna'
  | 'por-dosis'

type FilterKey = 'lugarId' | 'vacunaId' | 'tiempoId' | 'dosisId' | 'desde' | 'hasta'

interface Column {
  label: string
  kind?: 'date' | 'number' | 'strong'
  hide?: 'sm' | 'md' | 'lg'
}

interface TabMeta {
  label: string
  icon: IconName
  description: string
  supports: FilterKey[]
  columns: Column[]
}

interface ReportRow {
  id: string
  values: Array<string | number>
  total: number
}

interface FilterState {
  lugarId: string
  vacunaId: string
  tiempoId: string
  dosisId: string
  desde: string
  hasta: string
}

const emptyFilters: FilterState = {
  lugarId: '',
  vacunaId: '',
  tiempoId: '',
  dosisId: '',
  desde: '',
  hasta: '',
}

const TABS: Record<TabKey, TabMeta> = {
  'lugar-fecha': {
    label: 'Lugar y fecha',
    icon: 'place',
    description:
      'Conteo principal: dosis aplicadas por cada lugar en cada jornada.',
    supports: ['lugarId', 'desde', 'hasta'],
    columns: [
      { label: 'Lugar', kind: 'strong' },
      { label: 'Fecha', kind: 'date' },
      { label: 'Lotes', kind: 'number', hide: 'sm' },
      { label: 'Dosis aplicadas', kind: 'number' },
    ],
  },
  'lugar-fecha-vacuna': {
    label: 'Lugar · fecha · vacuna',
    icon: 'vaccine',
    description:
      'Dosis aplicadas por lugar, jornada y biológico. Ideal para reportes de cobertura.',
    supports: ['lugarId', 'vacunaId', 'desde', 'hasta'],
    columns: [
      { label: 'Lugar', kind: 'strong' },
      { label: 'Fecha', kind: 'date' },
      { label: 'Vacuna' },
      { label: 'Dosis aplicadas', kind: 'number' },
    ],
  },
  detalle: {
    label: 'Detalle completo',
    icon: 'layers',
    description:
      'Máximo nivel de detalle: lugar, fecha, vacuna, tiempo del esquema y dosis.',
    supports: ['lugarId', 'vacunaId', 'tiempoId', 'dosisId', 'desde', 'hasta'],
    columns: [
      { label: 'Lugar', kind: 'strong' },
      { label: 'Fecha', kind: 'date' },
      { label: 'Vacuna' },
      { label: 'Tiempo', hide: 'md' },
      { label: 'Dosis' },
      { label: 'Dosis aplicadas', kind: 'number' },
    ],
  },
  'por-fecha': {
    label: 'Por fecha',
    icon: 'calendar',
    description: 'Total general de dosis aplicadas en cada fecha registrada.',
    supports: ['desde', 'hasta'],
    columns: [
      { label: 'Fecha', kind: 'date' },
      { label: 'Dosis aplicadas', kind: 'number' },
    ],
  },
  'por-lugar': {
    label: 'Por lugar',
    icon: 'place',
    description: 'Acumulado histórico de dosis aplicadas en cada lugar.',
    supports: ['lugarId'],
    columns: [
      { label: 'Lugar', kind: 'strong' },
      { label: 'Dosis aplicadas', kind: 'number' },
    ],
  },
  'por-vacuna': {
    label: 'Por vacuna',
    icon: 'vaccine',
    description: 'Acumulado histórico de dosis aplicadas por biológico.',
    supports: ['vacunaId'],
    columns: [
      { label: 'Vacuna', kind: 'strong' },
      { label: 'Dosis aplicadas', kind: 'number' },
    ],
  },
  'por-dosis': {
    label: 'Por dosis',
    icon: 'dose',
    description: 'Acumulado histórico según la dosis del esquema aplicada.',
    supports: ['dosisId'],
    columns: [
      { label: 'Dosis', kind: 'strong' },
      { label: 'Dosis aplicadas', kind: 'number' },
    ],
  },
}

const TAB_ORDER: TabKey[] = [
  'lugar-fecha',
  'lugar-fecha-vacuna',
  'detalle',
  'por-fecha',
  'por-lugar',
  'por-vacuna',
  'por-dosis',
]

const PAGE_SIZE = 30

function filterLabel(key: FilterKey, value: string) {
  const labels: Record<FilterKey, string> = {
    lugarId: 'Lugar',
    vacunaId: 'Vacuna',
    tiempoId: 'Tiempo',
    dosisId: 'Dosis',
    desde: 'Desde',
    hasta: 'Hasta',
  }
  return `${labels[key]}: ${value}`
}

export function Conteos() {
  const toast = useToast()
  const [tab, setTab] = useState<TabKey>('lugar-fecha')
  const [filters, setFilters] = useState<FilterState>(emptyFilters)
  const [page, setPage] = useState(1)
  const [refreshKey, setRefreshKey] = useState(0)

  const [catalogos, setCatalogos] = useState<{
    lugares: Lugar[]
    vacunas: Vacuna[]
    tiempos: Tiempo[]
    dosis: Dosis[]
  }>({ lugares: [], vacunas: [], tiempos: [], dosis: [] })

  const [rows, setRows] = useState<ReportRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const requestId = useRef(0)

  const meta = TABS[tab]

  useEffect(() => {
    let active = true
    Promise.all([
      api.lugares.list({ incluirInactivos: true }),
      api.vacunas.list({ incluirInactivos: true }),
      api.tiempos.list({ incluirInactivos: true }),
      api.dosis.list({ incluirInactivos: true }),
    ])
      .then(([lugares, vacunas, tiempos, dosis]) => {
        if (active) setCatalogos({ lugares, vacunas, tiempos, dosis })
      })
      .catch(() => {
        if (active) {
          toast.show('No se pudieron cargar los catálogos para los filtros.', 'error')
        }
      })
    return () => {
      active = false
    }
  }, [toast])

  const params = useMemo<ConteoParams>(() => {
    const next: ConteoParams = {}
    if (meta.supports.includes('lugarId') && filters.lugarId) {
      next.lugarId = Number(filters.lugarId)
    }
    if (meta.supports.includes('vacunaId') && filters.vacunaId) {
      next.vacunaId = Number(filters.vacunaId)
    }
    if (meta.supports.includes('tiempoId') && filters.tiempoId) {
      next.tiempoId = Number(filters.tiempoId)
    }
    if (meta.supports.includes('dosisId') && filters.dosisId) {
      next.dosisId = Number(filters.dosisId)
    }
    if (meta.supports.includes('desde') && filters.desde) {
      next.desde = filters.desde
    }
    if (meta.supports.includes('hasta') && filters.hasta) {
      next.hasta = filters.hasta
    }
    return next
  }, [meta, filters])

  useEffect(() => {
    const id = ++requestId.current
    setLoading(true)
    setError(null)

    const run = async () => {
      try {
        let nextRows: ReportRow[] = []

        switch (tab) {
          case 'lugar-fecha': {
            const items = await api.conteos.lugarFecha(params)
            nextRows = items.map((item) => ({
              id: `${item.lugarId}-${item.fecha}`,
              values: [item.lugar, item.fecha, item.totalRegistros, item.totalVacunas],
              total: item.totalVacunas,
            }))
            break
          }
          case 'lugar-fecha-vacuna': {
            const items = await api.conteos.lugarFechaVacuna(params)
            nextRows = items.map((item) => ({
              id: `${item.lugarId}-${item.fecha}-${item.vacunaId}`,
              values: [item.lugar, item.fecha, item.vacuna, item.totalVacunas],
              total: item.totalVacunas,
            }))
            break
          }
          case 'detalle': {
            const items = await api.conteos.lugarFechaVacunaDosis(params)
            nextRows = items.map((item) => ({
              id: `${item.lugarId}-${item.fecha}-${item.vacunaId}-${item.tiempoId}-${item.dosisId}`,
              values: [
                item.lugar,
                item.fecha,
                item.vacuna,
                item.tiempo,
                item.dosis,
                item.totalVacunas,
              ],
              total: item.totalVacunas,
            }))
            break
          }
          case 'por-fecha': {
            const items = await api.conteos.porFecha(params)
            nextRows = items.map((item) => ({
              id: item.fecha,
              values: [item.fecha, item.totalVacunas],
              total: item.totalVacunas,
            }))
            break
          }
          case 'por-lugar': {
            const items = await api.conteos.porLugar(params)
            nextRows = items.map((item) => ({
              id: String(item.lugarId),
              values: [item.lugar, item.totalVacunas],
              total: item.totalVacunas,
            }))
            break
          }
          case 'por-vacuna': {
            const items = await api.conteos.porVacuna(params)
            nextRows = items.map((item) => ({
              id: String(item.vacunaId),
              values: [item.vacuna, item.totalVacunas],
              total: item.totalVacunas,
            }))
            break
          }
          case 'por-dosis': {
            const items = await api.conteos.porDosis(params)
            nextRows = items.map((item) => ({
              id: String(item.dosisId),
              values: [item.dosis, item.totalVacunas],
              total: item.totalVacunas,
            }))
            break
          }
        }

        if (id !== requestId.current) return
        setRows(nextRows)
      } catch (caught) {
        if (id !== requestId.current) return
        setError(
          caught instanceof ApiError
            ? caught.message
            : 'No se pudo generar el reporte.',
        )
      } finally {
        if (id === requestId.current) setLoading(false)
      }
    }

    void run()
  }, [tab, params, refreshKey])

  function selectTab(next: TabKey) {
    if (next === tab) return
    setRows([])
    setTab(next)
    setPage(1)
  }

  function updateFilter(key: FilterKey, value: string) {
    setFilters((current) => {
      const next = { ...current, [key]: value }
      if (key === 'desde' && next.hasta && value > next.hasta) next.hasta = ''
      if (key === 'hasta' && next.desde && value < next.desde) next.desde = ''
      return next
    })
    setPage(1)
  }

  function clearFilters() {
    setFilters(emptyFilters)
    setPage(1)
  }

  function applyRange(range: 'today' | '7' | '30' | 'month' | 'all') {
    const today = todayISO()
    if (range === 'all') {
      setFilters((current) => ({ ...current, desde: '', hasta: '' }))
      setPage(1)
      return
    }

    if (range === 'today') {
      setFilters((current) => ({ ...current, desde: today, hasta: today }))
    } else if (range === 'month') {
      const now = new Date()
      const first = toLocalISO(new Date(now.getFullYear(), now.getMonth(), 1))
      setFilters((current) => ({ ...current, desde: first, hasta: today }))
    } else {
      const days = range === '7' ? 6 : 29
      const from = toLocalISO(new Date(Date.now() - days * 86_400_000))
      setFilters((current) => ({ ...current, desde: from, hasta: today }))
    }
    setPage(1)
  }

  const supportedFilters = meta.supports
  const activeFilters = supportedFilters.filter((key) => filters[key]).length
  const ignoredFilters = (Object.keys(filters) as FilterKey[]).filter(
    (key) => filters[key] && !supportedFilters.includes(key),
  )

  const totalDosis = rows.reduce((sum, row) => sum + row.total, 0)
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageRows = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const periodLabel =
    filters.desde || filters.hasta
      ? `${filters.desde ? formatDate(filters.desde) : 'Inicio'} — ${
          filters.hasta ? formatDate(filters.hasta) : 'Hoy'
        }`
      : 'Histórico completo'

  function handleExport() {
    if (rows.length === 0) {
      toast.show('No hay datos para exportar en este reporte.', 'info')
      return
    }
    downloadCsv(
      `conteo-${tab}-${todayISO()}.csv`,
      meta.columns.map((column) => column.label),
      rows.map((row) => row.values),
    )
    toast.show(`Se exportaron ${formatNumber(rows.length)} filas del reporte.`)
  }

  return (
    <>
      <PageHeader
        eyebrow="Análisis y reportes"
        title="Conteos de vacunación"
        description="Explora las dosis aplicadas desde distintos ángulos y exporta los totales para tus informes."
        actions={
          <>
            <button
              type="button"
              className="button button--ghost"
              onClick={() => setRefreshKey((key) => key + 1)}
              disabled={loading}
            >
              <Icon name="refresh" />
              {loading ? 'Actualizando…' : 'Actualizar'}
            </button>
            <button
              type="button"
              className="button button--primary"
              onClick={handleExport}
              disabled={rows.length === 0}
            >
              <Icon name="download" />
              Exportar CSV
            </button>
          </>
        }
      />

      <section className="summary-strip">
        <div className="summary-strip__item">
          <span className="summary-strip__icon summary-strip__icon--teal">
            <Icon name="syringe" />
          </span>
          <div>
            <small>Dosis en el reporte</small>
            <strong>{formatNumber(totalDosis)}</strong>
          </div>
        </div>
        <div className="summary-strip__item">
          <span className="summary-strip__icon summary-strip__icon--amber">
            <Icon name="layers" />
          </span>
          <div>
            <small>Filas del reporte</small>
            <strong>{formatNumber(rows.length)}</strong>
          </div>
        </div>
        <div className="summary-strip__item summary-strip__item--wide">
          <span className="summary-strip__icon summary-strip__icon--blue">
            <Icon name="calendar" />
          </span>
          <div>
            <small>Periodo</small>
            <strong>{periodLabel}</strong>
          </div>
        </div>
        <div className="summary-strip__item summary-strip__item--note">
          <Icon name="spark" />
          <p>
            Cada total suma la cantidad de dosis registrada, no la cantidad de
            filas.
          </p>
        </div>
      </section>

      <section className="card filters-card">
        <div className="card__header">
          <div>
            <h2>
              <Icon name="filter" />
              Filtros del reporte
              {activeFilters > 0 && (
                <span className="badge badge--count">{activeFilters}</span>
              )}
            </h2>
            <p>
              {meta.supports.includes('desde')
                ? 'Combina ubicación, biológico y periodo.'
                : 'Este reporte usa únicamente los filtros habilitados.'}
            </p>
          </div>
          {activeFilters > 0 && (
            <button type="button" className="button button--subtle button--sm" onClick={clearFilters}>
              <Icon name="close" />
              Limpiar filtros
            </button>
          )}
        </div>
        <div className="card__body">
          <div className="filters-grid">
            <label className={`field${supportedFilters.includes('lugarId') ? '' : ' field--disabled'}`}>
              <span>Lugar</span>
              <select
                value={filters.lugarId}
                disabled={!supportedFilters.includes('lugarId')}
                onChange={(event) => updateFilter('lugarId', event.target.value)}
              >
                <option value="">Todos los lugares</option>
                {catalogos.lugares.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nombre}
                    {item.activo ? '' : ' · inactivo'}
                  </option>
                ))}
              </select>
            </label>
            <label className={`field${supportedFilters.includes('vacunaId') ? '' : ' field--disabled'}`}>
              <span>Vacuna</span>
              <select
                value={filters.vacunaId}
                disabled={!supportedFilters.includes('vacunaId')}
                onChange={(event) => updateFilter('vacunaId', event.target.value)}
              >
                <option value="">Todas las vacunas</option>
                {catalogos.vacunas.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nombre}
                    {item.activo ? '' : ' · inactivo'}
                  </option>
                ))}
              </select>
            </label>
            <label className={`field${supportedFilters.includes('tiempoId') ? '' : ' field--disabled'}`}>
              <span>Tiempo del esquema</span>
              <select
                value={filters.tiempoId}
                disabled={!supportedFilters.includes('tiempoId')}
                onChange={(event) => updateFilter('tiempoId', event.target.value)}
              >
                <option value="">Todos los tiempos</option>
                {catalogos.tiempos.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nombre}
                    {item.activo ? '' : ' · inactivo'}
                  </option>
                ))}
              </select>
            </label>
            <label className={`field${supportedFilters.includes('dosisId') ? '' : ' field--disabled'}`}>
              <span>Dosis</span>
              <select
                value={filters.dosisId}
                disabled={!supportedFilters.includes('dosisId')}
                onChange={(event) => updateFilter('dosisId', event.target.value)}
              >
                <option value="">Todas las dosis</option>
                {catalogos.dosis.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nombre}
                    {item.activo ? '' : ' · inactivo'}
                  </option>
                ))}
              </select>
            </label>
            <label className={`field${supportedFilters.includes('desde') ? '' : ' field--disabled'}`}>
              <span>Desde</span>
              <input
                type="date"
                value={filters.desde}
                max={filters.hasta || undefined}
                disabled={!supportedFilters.includes('desde')}
                onChange={(event) => updateFilter('desde', event.target.value)}
              />
            </label>
            <label className={`field${supportedFilters.includes('hasta') ? '' : ' field--disabled'}`}>
              <span>Hasta</span>
              <input
                type="date"
                value={filters.hasta}
                min={filters.desde || undefined}
                disabled={!supportedFilters.includes('hasta')}
                onChange={(event) => updateFilter('hasta', event.target.value)}
              />
            </label>
          </div>

          {meta.supports.includes('desde') && (
            <div className="quick-ranges">
              <span>Rangos rápidos</span>
              <button type="button" onClick={() => applyRange('today')}>Hoy</button>
              <button type="button" onClick={() => applyRange('7')}>7 días</button>
              <button type="button" onClick={() => applyRange('30')}>30 días</button>
              <button type="button" onClick={() => applyRange('month')}>Este mes</button>
              <button type="button" onClick={() => applyRange('all')}>Todo</button>
            </div>
          )}

          {ignoredFilters.length > 0 && (
            <p className="inline-warning">
              <Icon name="alert" />
              {ignoredFilters.map((key) => filterLabel(key, filters[key])).join(' · ')}{' '}
              no aplica(n) a este reporte y se ignora(n).
            </p>
          )}
        </div>
      </section>

      <section className="card report-card">
        <div className="tabs-scroll">
          <div className="tabs" role="tablist" aria-label="Tipo de reporte">
            {TAB_ORDER.map((key) => {
              const item = TABS[key]
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={tab === key}
                  className={`tab${tab === key ? ' tab--active' : ''}`}
                  onClick={() => selectTab(key)}
                >
                  <Icon name={item.icon} />
                  {item.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="card__header">
          <div>
            <h2>{meta.label}</h2>
            <p>{meta.description}</p>
          </div>
          {loading && <span className="badge badge--soft">Calculando…</span>}
        </div>

        <div className="card__body card__body--flush">
          {error ? (
            <div className="error-inline">
              <Icon name="alert" />
              <div>
                <strong>No se pudo generar el reporte</strong>
                <p>{error}</p>
              </div>
              <button
                type="button"
                className="button button--ghost button--sm"
                onClick={() => setRefreshKey((key) => key + 1)}
              >
                Reintentar
              </button>
            </div>
          ) : loading && rows.length === 0 ? (
            <PageLoader label="Preparando el reporte de vacunación…" />
          ) : rows.length === 0 ? (
            <EmptyState
              icon="chart"
              title="Sin datos para este reporte"
              description="No hay dosis que coincidan con los filtros seleccionados. Prueba ampliar el periodo o limpiar los filtros."
              action={
                activeFilters > 0 ? (
                  <button type="button" className="button button--ghost" onClick={clearFilters}>
                    Limpiar filtros
                  </button>
                ) : (
                  <span className="empty-state__hint">
                    Registra dosis desde la sección Registros.
                  </span>
                )
              }
            />
          ) : (
            <>
              <div className={`table-wrap${loading ? ' table-wrap--loading' : ''}`}>
                <table className="data-table">
                  <thead>
                    <tr>
                      {meta.columns.map((column) => (
                        <th
                          key={column.label}
                          className={[
                            column.kind === 'number' ? 'cell-num' : '',
                            column.hide ? `hide-${column.hide}` : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                        >
                          {column.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((row) => (
                      <tr key={row.id}>
                        {row.values.map((value, index) => {
                          const column = meta.columns[index]
                          if (!column) return null
                          const isTotal = index === meta.columns.length - 1
                          const share = totalDosis > 0 ? row.total / totalDosis : 0

                          if (isTotal) {
                            return (
                              <td key={column.label} className="cell-num">
                                <div className="total-cell">
                                  <strong>{formatNumber(Number(value))}</strong>
                                  <span className="total-cell__track">
                                    <span
                                      className="total-cell__fill"
                                      style={{
                                        width: `${Math.max(share * 100, 2)}%`,
                                      }}
                                    />
                                  </span>
                                </div>
                              </td>
                            )
                          }

                          return (
                            <td
                              key={column.label}
                              className={[
                                column.kind === 'number' ? 'cell-num' : '',
                                column.kind === 'strong' ? 'cell-strong' : '',
                                column.hide ? `hide-${column.hide}` : '',
                              ]
                                .filter(Boolean)
                                .join(' ')}
                            >
                              {column.kind === 'date'
                                ? formatDate(String(value))
                                : column.kind === 'number'
                                  ? formatNumber(Number(value))
                                  : String(value)}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pagination">
                <div className="pagination__info">
                  Mostrando{' '}
                  <strong>
                    {(safePage - 1) * PAGE_SIZE + 1}–
                    {Math.min(safePage * PAGE_SIZE, rows.length)}
                  </strong>{' '}
                  de <strong>{formatNumber(rows.length)}</strong> filas
                </div>
                {rows.length > PAGE_SIZE && (
                  <div className="pagination__controls">
                    <button
                      type="button"
                      className="icon-button icon-button--sm"
                      onClick={() => setPage(Math.max(1, safePage - 1))}
                      disabled={safePage <= 1}
                      aria-label="Página anterior"
                    >
                      <Icon name="chevronLeft" />
                    </button>
                    <span className="pagination__page">
                      {safePage} / {totalPages}
                    </span>
                    <button
                      type="button"
                      className="icon-button icon-button--sm"
                      onClick={() => setPage(Math.min(totalPages, safePage + 1))}
                      disabled={safePage >= totalPages}
                      aria-label="Página siguiente"
                    >
                      <Icon name="chevronRight" />
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </section>
    </>
  )
}
