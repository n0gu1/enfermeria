import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  api,
  ApiError,
  type ConteoPorFecha,
  type Registro,
  type ResumenConteo,
} from '../api'
import { EmptyState } from '../components/EmptyState'
import { Icon } from '../components/Icon'
import { CardsSkeleton, TableSkeleton } from '../components/Loading'
import { PageHeader } from '../components/PageHeader'
import { StatCard } from '../components/StatCard'
import {
  formatDate,
  formatMonthDay,
  formatNumber,
  greeting,
  toLocalISO,
  todayISO,
} from '../lib/format'

const DONUT_COLORS = [
  '#0f766e',
  '#d99a2b',
  '#3f7f9c',
  '#c2644a',
  '#7a6aae',
  '#6b8f5e',
]

interface DayPoint {
  iso: string
  day: string
  weekday: string
  total: number
  isToday: boolean
}

function buildDays(porFecha: ConteoPorFecha[]): DayPoint[] {
  const totals = new Map(porFecha.map((item) => [item.fecha.slice(0, 10), item.totalVacunas]))
  const today = todayISO()

  return Array.from({ length: 14 }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() - (13 - index))
    const iso = toLocalISO(date)
    return {
      iso,
      day: String(date.getDate()),
      weekday: date.toLocaleDateString('es-ES', { weekday: 'short' }).slice(0, 2),
      total: totals.get(iso) ?? 0,
      isToday: iso === today,
    }
  })
}

export function Dashboard() {
  const [resumen, setResumen] = useState<ResumenConteo | null>(null)
  const [porFecha, setPorFecha] = useState<ConteoPorFecha[]>([])
  const [recientes, setRecientes] = useState<Registro[]>([])
  const [lugares, setLugares] = useState(0)
  const [vacunas, setVacunas] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const desde = toLocalISO(new Date(Date.now() - 13 * 86_400_000))

    try {
      const [resumenData, porFechaData, registrosData, lugaresData, vacunasData] =
        await Promise.all([
          api.conteos.resumen(),
          api.conteos.porFecha({ desde, hasta: todayISO() }),
          api.registros.list({ page: 1, pageSize: 6 }),
          api.lugares.list(),
          api.vacunas.list(),
        ])

      setResumen(resumenData)
      setPorFecha(porFechaData)
      setRecientes(registrosData.items)
      setLugares(lugaresData.length)
      setVacunas(vacunasData.length)
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'Ocurrió un error inesperado al cargar el panel.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const days = useMemo(() => buildDays(porFecha), [porFecha])
  const maxDay = Math.max(...days.map((day) => day.total), 1)
  const todayTotal = days.find((day) => day.isToday)?.total ?? 0
  const totalVacunas = resumen?.totalVacunas ?? 0
  const totalRegistros = resumen?.totalRegistros ?? 0
  const averagePerBatch =
    totalRegistros > 0 ? totalVacunas / totalRegistros : 0

  const donutSegments = useMemo(() => {
    if (!resumen || resumen.totalVacunas <= 0) return []
    let cursor = 0
    return resumen.porDosis.map((item, index) => {
      const share = (item.totalVacunas / resumen.totalVacunas) * 100
      const segment = {
        label: item.dosis,
        value: item.totalVacunas,
        share,
        color: DONUT_COLORS[index % DONUT_COLORS.length],
        from: cursor,
        to: cursor + share,
      }
      cursor += share
      return segment
    })
  }, [resumen])

  const donutStyle = donutSegments.length
    ? {
        background: `conic-gradient(${donutSegments
          .map((segment) => `${segment.color} ${segment.from}% ${segment.to}%`)
          .join(', ')})`,
      }
    : undefined

  const topVacunas = resumen?.porVacuna.slice(0, 5) ?? []
  const topVacunaTotal = topVacunas[0]?.totalVacunas ?? 1

  if (loading && !resumen) {
    return (
      <>
        <PageHeader
          eyebrow="Panel de control"
          title="Resumen de vacunación"
          description="Cargando la actividad más reciente del servicio…"
        />
        <CardsSkeleton />
        <div className="dashboard-grid">
          <div className="card">
            <div className="card__body">
              <div className="skeleton" style={{ height: 260 }} />
            </div>
          </div>
          <div className="card">
            <div className="card__body">
              <div className="skeleton" style={{ height: 260 }} />
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card__body">
            <TableSkeleton rows={5} columns={5} />
          </div>
        </div>
      </>
    )
  }

  if (error && !resumen) {
    return (
      <>
        <PageHeader
          eyebrow="Panel de control"
          title="Resumen de vacunación"
          description="No fue posible cargar la información del servicio."
        />
        <div className="error-panel">
          <span className="error-panel__icon">
            <Icon name="alert" />
          </span>
          <div>
            <h2>No se pudo conectar con la API</h2>
            <p>{error}</p>
            <p className="error-panel__hint">
              El servicio en Render puede tardar hasta un minuto en despertar si
              estuvo inactivo.
            </p>
          </div>
          <button type="button" className="button button--primary" onClick={() => void load()}>
            <Icon name="refresh" />
            Reintentar
          </button>
        </div>
      </>
    )
  }

  const today = formatDate(todayISO())

  return (
    <>
      <PageHeader
        eyebrow="Panel de control"
        title={`${greeting()}, equipo de enfermería`}
        description={`${today.charAt(0).toUpperCase()}${today.slice(1)} · Este es el pulso de la vacunación registrada.`}
        actions={
          <>
            <button
              type="button"
              className="button button--ghost"
              onClick={() => void load()}
              disabled={loading}
            >
              <Icon name="refresh" />
              {loading ? 'Actualizando…' : 'Actualizar'}
            </button>
            <Link className="button button--primary" to="/registros?nuevo=1">
              <Icon name="plus" />
              Nuevo registro
            </Link>
          </>
        }
      />

      {totalVacunas === 0 && (
        <section className="onboarding">
          <div className="onboarding__content">
            <span className="eyebrow eyebrow--light">Primeros pasos</span>
            <h2>La primera dosis empieza aquí</h2>
            <p>
              Aún no hay vacunas registradas. Crea tus lugares de vacunación y
              luego registra la primera jornada para ver los conteos en tiempo
              real.
            </p>
            <div className="onboarding__actions">
              <Link className="button button--medical" to="/lugares">
                <Icon name="place" />
                Crear lugar
              </Link>
              <Link className="button button--outline-light" to="/registros?nuevo=1">
                <Icon name="syringe" />
                Registrar vacunación
              </Link>
            </div>
          </div>
          <div className="onboarding__steps">
            <div className="onboarding__step">
              <span>01</span>
              <strong>Configura</strong>
              <small>Lugares, vacunas y esquemas</small>
            </div>
            <div className="onboarding__step">
              <span>02</span>
              <strong>Registra</strong>
              <small>Dosis aplicadas por jornada</small>
            </div>
            <div className="onboarding__step">
              <span>03</span>
              <strong>Analiza</strong>
              <small>Conteos listos para reportar</small>
            </div>
          </div>
        </section>
      )}

      <div className="stats-grid">
        <StatCard
          label="Dosis aplicadas"
          value={formatNumber(totalVacunas)}
          hint={`${resumen?.porDosis.length ?? 0} tipos de dosis en uso`}
          icon="syringe"
          tone="teal"
        />
        <StatCard
          label="Lotes registrados"
          value={formatNumber(totalRegistros)}
          hint={
            totalRegistros > 0
              ? `${formatNumber(Math.round(averagePerBatch))} dosis por lote en promedio`
              : 'Sin movimientos todavía'
          }
          icon="records"
          tone="amber"
        />
        <StatCard
          label="Aplicadas hoy"
          value={formatNumber(todayTotal)}
          hint={todayTotal > 0 ? 'Buen ritmo de jornada' : 'Aún sin dosis hoy'}
          icon="calendar"
          tone="blue"
        />
        <StatCard
          label="Lugares activos"
          value={formatNumber(lugares)}
          hint={`${formatNumber(vacunas)} vacunas activas`}
          icon="place"
          tone="coral"
        />
      </div>

      <div className="dashboard-grid">
        <section className="card card--chart">
          <div className="card__header">
            <div>
              <h2>Últimos 14 días</h2>
              <p>Dosis aplicadas por día en todos los lugares.</p>
            </div>
            <span className="badge badge--soft">
              Máx. {formatNumber(maxDay)}
            </span>
          </div>
          <div className="card__body">
            {days.every((day) => day.total === 0) ? (
              <EmptyState
                icon="chart"
                title="Sin actividad en dos semanas"
                description="Cuando registres dosis, aquí verás la tendencia diaria."
                action={
                  <Link className="button button--ghost" to="/registros?nuevo=1">
                    Registrar ahora
                  </Link>
                }
              />
            ) : (
              <div className="chart__scroll">
                <div
                  className="chart__plot"
                  role="img"
                  aria-label="Gráfico de dosis aplicadas en los últimos 14 días"
                >
                  {days.map((day) => {
                    const height =
                      day.total > 0
                        ? Math.max((day.total / maxDay) * 100, 4)
                        : 2
                    return (
                      <div
                        key={day.iso}
                        className={`chart__col${day.isToday ? ' chart__col--today' : ''}`}
                        title={`${formatMonthDay(day.iso)}: ${formatNumber(day.total)} dosis`}
                      >
                        <span className="chart__tooltip">
                          {formatNumber(day.total)}
                        </span>
                        <div className="chart__track">
                          <div
                            className={`chart__bar${day.total === 0 ? ' chart__bar--empty' : ''}`}
                            style={{ height: `${height}%` }}
                          />
                        </div>
                        <span className="chart__day">{day.day}</span>
                        <span className="chart__weekday">{day.weekday}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="card">
          <div className="card__header">
            <div>
              <h2>Por tipo de dosis</h2>
              <p>Distribución histórica de dosis aplicadas.</p>
            </div>
          </div>
          <div className="card__body">
            {donutSegments.length === 0 ? (
              <EmptyState
                icon="dose"
                title="Sin distribución"
                description="Registra dosis para ver cómo se reparten por esquema."
              />
            ) : (
              <div className="donut-layout">
                <div className="donut" style={donutStyle}>
                  <div className="donut__hole">
                    <strong>{formatNumber(totalVacunas)}</strong>
                    <span>dosis</span>
                  </div>
                </div>
                <ul className="legend">
                  {donutSegments.map((segment) => (
                    <li key={segment.label} className="legend__item">
                      <span
                        className="legend__dot"
                        style={{ background: segment.color }}
                      />
                      <span className="legend__label">{segment.label}</span>
                      <strong>{formatNumber(segment.value)}</strong>
                      <small>{Math.round(segment.share)}%</small>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="dashboard-grid dashboard-grid--bottom">
        <section className="card">
          <div className="card__header">
            <div>
              <h2>Vacunas con más aplicación</h2>
              <p>Ranking histórico por dosis aplicadas.</p>
            </div>
            <Link className="text-link" to="/conteos">
              Ver conteos
              <Icon name="arrowRight" />
            </Link>
          </div>
          <div className="card__body">
            {topVacunas.length === 0 ? (
              <EmptyState
                icon="vaccine"
                title="Todavía no hay ranking"
                description="Los conteos por vacuna aparecerán al registrar la primera jornada."
              />
            ) : (
              <div className="bar-list">
                {topVacunas.map((item, index) => (
                  <div key={item.vacunaId} className="bar-row">
                    <span className="bar-row__rank">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div className="bar-row__main">
                      <div className="bar-row__head">
                        <strong>{item.vacuna}</strong>
                        <span>{formatNumber(item.totalVacunas)}</span>
                      </div>
                      <div className="bar-row__track">
                        <div
                          className="bar-row__fill"
                          style={{
                            width: `${Math.max((item.totalVacunas / topVacunaTotal) * 100, 2)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="card card--table">
          <div className="card__header">
            <div>
              <h2>Registros recientes</h2>
              <p>Los últimos lotes capturados en el sistema.</p>
            </div>
            <Link className="text-link" to="/registros">
              Ver todos
              <Icon name="arrowRight" />
            </Link>
          </div>
          <div className="card__body card__body--flush">
            {recientes.length === 0 ? (
              <EmptyState
                icon="records"
                title="Sin registros recientes"
                description="La actividad de vacunación aparecerá aquí."
                action={
                  <Link className="button button--primary" to="/registros?nuevo=1">
                    <Icon name="plus" />
                    Crear registro
                  </Link>
                }
              />
            ) : (
              <div className="table-wrap">
                <table className="data-table data-table--compact">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Lugar</th>
                      <th>Vacuna</th>
                      <th className="hide-sm">Dosis</th>
                      <th className="cell-num">Cant.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recientes.map((registro) => (
                      <tr key={registro.id}>
                        <td className="cell-nowrap">{formatDate(registro.fecha)}</td>
                        <td className="cell-strong">{registro.lugar}</td>
                        <td>{registro.vacuna}</td>
                        <td className="hide-sm">{registro.dosis}</td>
                        <td className="cell-num">
                          <span className="qty">{registro.cantidad}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  )
}
