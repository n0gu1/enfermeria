import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  api,
  ApiError,
  type Dosis,
  type Lugar,
  type PagedResult,
  type Registro,
  type RegistroListParams,
  type Tiempo,
  type Vacuna,
} from '../api'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { EmptyState } from '../components/EmptyState'
import { Icon } from '../components/Icon'
import { PageLoader } from '../components/Loading'
import { Modal } from '../components/Modal'
import { PageHeader } from '../components/PageHeader'
import { useToast } from '../components/Toast'
import { downloadCsv } from '../lib/csv'
import { formatDate, formatNumber, todayISO } from '../lib/format'

interface Catalogs {
  lugares: Lugar[]
  vacunas: Vacuna[]
  tiempos: Tiempo[]
  dosis: Dosis[]
}

interface FilterState {
  lugarId: string
  vacunaId: string
  tiempoId: string
  dosisId: string
  desde: string
  hasta: string
}

interface RegistroForm {
  fecha: string
  lugarId: string
  vacunaId: string
  tiempoId: string
  dosisId: string
  cantidad: string
  observacion: string
}

const emptyFilters: FilterState = {
  lugarId: '',
  vacunaId: '',
  tiempoId: '',
  dosisId: '',
  desde: '',
  hasta: '',
}

const emptyForm: RegistroForm = {
  fecha: todayISO(),
  lugarId: '',
  vacunaId: '',
  tiempoId: '',
  dosisId: '',
  cantidad: '1',
  observacion: '',
}

function catalogLabel(nombre: string, activo: boolean) {
  return activo ? nombre : `${nombre} · inactivo`
}

export function Registros() {
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()

  const [catalogos, setCatalogos] = useState<Catalogs>({
    lugares: [],
    vacunas: [],
    tiempos: [],
    dosis: [],
  })
  const [catalogError, setCatalogError] = useState(false)

  const [filters, setFilters] = useState<FilterState>(emptyFilters)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const [data, setData] = useState<PagedResult<Registro> | null>(null)
  const [totalDosis, setTotalDosis] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const requestId = useRef(0)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Registro | null>(null)
  const [form, setForm] = useState<RegistroForm>(emptyForm)
  const [selectedVacunas, setSelectedVacunas] = useState<string[]>([])
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<Registro | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    let active = true
    Promise.all([
      api.lugares.list({ incluirInactivos: true }),
      api.vacunas.list({ incluirInactivos: true }),
      api.tiempos.list({ incluirInactivos: true }),
      api.dosis.list({ incluirInactivos: true }),
    ])
      .then(([lugares, vacunas, tiempos, dosis]) => {
        if (!active) return
        setCatalogos({ lugares, vacunas, tiempos, dosis })
        setCatalogError(false)
      })
      .catch((caught) => {
        if (!active) return
        setCatalogError(true)
        toast.show(
          caught instanceof ApiError
            ? caught.message
            : 'No se pudieron cargar los catálogos.',
          'error',
        )
      })
    return () => {
      active = false
    }
  }, [toast])

  const queryParams = useMemo<RegistroListParams>(
    () => ({
      lugarId: filters.lugarId ? Number(filters.lugarId) : undefined,
      vacunaId: filters.vacunaId ? Number(filters.vacunaId) : undefined,
      tiempoId: filters.tiempoId ? Number(filters.tiempoId) : undefined,
      dosisId: filters.dosisId ? Number(filters.dosisId) : undefined,
      desde: filters.desde || undefined,
      hasta: filters.hasta || undefined,
      page,
      pageSize,
    }),
    [filters, page, pageSize],
  )

  const load = useCallback(async () => {
    const id = ++requestId.current
    setLoading(true)
    setError(null)

    try {
      const [registros, detalle] = await Promise.all([
        api.registros.list(queryParams),
        api.conteos.lugarFechaVacunaDosis({
          lugarId: queryParams.lugarId,
          vacunaId: queryParams.vacunaId,
          tiempoId: queryParams.tiempoId,
          dosisId: queryParams.dosisId,
          desde: queryParams.desde,
          hasta: queryParams.hasta,
        }),
      ])
      if (id !== requestId.current) return
      setData(registros)
      setTotalDosis(
        detalle.reduce((sum, item) => sum + item.totalVacunas, 0),
      )
    } catch (caught) {
      if (id !== requestId.current) return
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'No se pudieron cargar los registros.',
      )
    } finally {
      if (id === requestId.current) setLoading(false)
    }
  }, [queryParams])

  useEffect(() => {
    void load()
  }, [load])

  const openCreate = useCallback(() => {
    setEditing(null)
    setForm({ ...emptyForm, fecha: todayISO() })
    setSelectedVacunas([])
    setFormError(null)
    setFormOpen(true)
  }, [])

  useEffect(() => {
    if (searchParams.get('nuevo') !== '1') return
    openCreate()
    const next = new URLSearchParams(searchParams)
    next.delete('nuevo')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams, openCreate])

  function updateFilter(key: keyof FilterState, value: string) {
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

  const activeFilters = Object.values(filters).filter(Boolean).length

  function openEdit(registro: Registro) {
    setEditing(registro)
    setForm({
      fecha: registro.fecha.slice(0, 10),
      lugarId: String(registro.lugarId),
      vacunaId: String(registro.vacunaId),
      tiempoId: String(registro.tiempoId),
      dosisId: String(registro.dosisId),
      cantidad: String(registro.cantidad),
      observacion: registro.observacion ?? '',
    })
    setFormError(null)
    setFormOpen(true)
  }

  function closeForm() {
    if (saving) return
    setFormOpen(false)
    setEditing(null)
    setFormError(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)

    if (!editing) {
      return setFormError('Esta es una vista previa local. El registro de varias vacunas todavía no está habilitado para guardar.')
    }

    if (!form.fecha) return setFormError('Selecciona la fecha de la jornada.')
    if (!form.lugarId) return setFormError('Selecciona el lugar de vacunación.')
    if (!form.vacunaId) return setFormError('Selecciona la vacuna aplicada.')
    if (!form.tiempoId) return setFormError('Selecciona el tiempo del esquema.')
    if (!form.dosisId) return setFormError('Selecciona la dosis aplicada.')

    const cantidad = Number(form.cantidad)
    if (!Number.isInteger(cantidad) || cantidad < 1) {
      return setFormError('La cantidad debe ser un número entero mayor o igual a 1.')
    }

    const payload = {
      fecha: form.fecha,
      lugarId: Number(form.lugarId),
      vacunaId: Number(form.vacunaId),
      tiempoId: Number(form.tiempoId),
      dosisId: Number(form.dosisId),
      cantidad,
      observacion: form.observacion.trim() || null,
    }

    setSaving(true)
    try {
      if (editing) {
        await api.registros.update(editing.id, payload)
        toast.show('Registro actualizado correctamente.')
      } else {
        await api.registros.create(payload)
        toast.show('Registro creado correctamente.')
      }
      setFormOpen(false)
      setEditing(null)
      if (!editing && page !== 1) setPage(1)
      else await load()
    } catch (caught) {
      setFormError(
        caught instanceof ApiError
          ? caught.message
          : 'No se pudo guardar el registro.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.registros.remove(deleteTarget.id)
      toast.show('Registro eliminado.')
      setDeleteTarget(null)
      if (data && data.items.length === 1 && page > 1) setPage(page - 1)
      else await load()
    } catch (caught) {
      toast.show(
        caught instanceof ApiError
          ? caught.message
          : 'No se pudo eliminar el registro.',
        'error',
      )
    } finally {
      setDeleting(false)
    }
  }

  async function handleExport() {
    setExporting(true)
    try {
      const all: Registro[] = []
      let currentPage = 1
      let total = Number.POSITIVE_INFINITY

      while (all.length < total && currentPage <= 50) {
        const result = await api.registros.list({
          ...queryParams,
          page: currentPage,
          pageSize: 200,
        })
        total = result.total
        all.push(...result.items)
        if (result.items.length === 0) break
        currentPage += 1
      }

      if (all.length === 0) {
        toast.show('No hay registros para exportar con estos filtros.', 'info')
        return
      }

      downloadCsv(
        `registros-${todayISO()}.csv`,
        ['Fecha', 'Lugar', 'Vacuna', 'Tiempo', 'Meses', 'Dosis', 'Cantidad', 'Observación'],
        all.map((item) => [
          item.fecha,
          item.lugar,
          item.vacuna,
          item.tiempo,
          item.meses ?? '',
          item.dosis,
          item.cantidad,
          item.observacion ?? '',
        ]),
      )
      toast.show(`Se exportaron ${formatNumber(all.length)} registros.`)
    } catch (caught) {
      toast.show(
        caught instanceof ApiError
          ? caught.message
          : 'No se pudo exportar el archivo.',
        'error',
      )
    } finally {
      setExporting(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize))
  const promedio =
    data && data.total > 0 ? totalDosis / data.total : 0

  return (
    <>
      <PageHeader
        eyebrow="Operación diaria"
        title="Registros de vacunación"
        description="Captura cada lote de dosis aplicadas y mantén trazabilidad por lugar, vacuna, esquema y dosis."
        actions={
          <>
            <button
              type="button"
              className="button button--ghost"
              onClick={() => void handleExport()}
              disabled={exporting || loading}
            >
              <Icon name="download" />
              {exporting ? 'Exportando…' : 'Exportar CSV'}
            </button>
            <button type="button" className="button button--primary" onClick={openCreate}>
              <Icon name="plus" />
              Nuevo registro
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
            <small>Dosis en el filtro</small>
            <strong>{formatNumber(totalDosis)}</strong>
          </div>
        </div>
        <div className="summary-strip__item">
          <span className="summary-strip__icon summary-strip__icon--amber">
            <Icon name="records" />
          </span>
          <div>
            <small>Lotes encontrados</small>
            <strong>{formatNumber(data?.total ?? 0)}</strong>
          </div>
        </div>
        <div className="summary-strip__item">
          <span className="summary-strip__icon summary-strip__icon--blue">
            <Icon name="layers" />
          </span>
          <div>
            <small>Promedio por lote</small>
            <strong>{formatNumber(Math.round(promedio))}</strong>
          </div>
        </div>
        <div className="summary-strip__item summary-strip__item--note">
          <Icon name="spark" />
          <p>
            La cantidad permite registrar lotes completos: los conteos suman
            cada dosis capturada.
          </p>
        </div>
      </section>

      <section className="card filters-card">
        <div className="card__header">
          <div>
            <h2>
              <Icon name="filter" />
              Filtros
              {activeFilters > 0 && (
                <span className="badge badge--count">{activeFilters}</span>
              )}
            </h2>
            <p>Acota la búsqueda por ubicación, biológico o periodo.</p>
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
            <label className="field">
              <span>Lugar</span>
              <select
                value={filters.lugarId}
                onChange={(event) => updateFilter('lugarId', event.target.value)}
              >
                <option value="">Todos los lugares</option>
                {catalogos.lugares
                  .filter((item) => item.activo || editing?.lugarId === item.id)
                  .map((item) => (
                  <option key={item.id} value={item.id}>
                    {catalogLabel(item.nombre, item.activo)}
                  </option>
                  ))}
              </select>
            </label>
            <label className="field">
              <span>Vacuna</span>
              <select
                value={filters.vacunaId}
                onChange={(event) => updateFilter('vacunaId', event.target.value)}
              >
                <option value="">Todas las vacunas</option>
                {catalogos.vacunas
                  .filter((item) => item.activo || editing?.vacunaId === item.id)
                  .map((item) => (
                  <option key={item.id} value={item.id}>
                    {catalogLabel(item.nombre, item.activo)}
                  </option>
                  ))}
              </select>
            </label>
            <label className="field">
              <span>Tiempo del esquema</span>
              <select
                value={filters.tiempoId}
                onChange={(event) => updateFilter('tiempoId', event.target.value)}
              >
                <option value="">Todos los tiempos</option>
                {catalogos.tiempos.map((item) => (
                  <option key={item.id} value={item.id}>
                    {catalogLabel(item.nombre, item.activo)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Dosis</span>
              <select
                value={filters.dosisId}
                onChange={(event) => updateFilter('dosisId', event.target.value)}
              >
                <option value="">Todas las dosis</option>
                {catalogos.dosis.map((item) => (
                  <option key={item.id} value={item.id}>
                    {catalogLabel(item.nombre, item.activo)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Desde</span>
              <input
                type="date"
                value={filters.desde}
                max={filters.hasta || undefined}
                onChange={(event) => updateFilter('desde', event.target.value)}
              />
            </label>
            <label className="field">
              <span>Hasta</span>
              <input
                type="date"
                value={filters.hasta}
                min={filters.desde || undefined}
                onChange={(event) => updateFilter('hasta', event.target.value)}
              />
            </label>
          </div>
          {catalogError && (
            <p className="inline-warning">
              <Icon name="alert" />
              No se pudieron cargar los catálogos. Recarga la página para
              intentarlo de nuevo.
            </p>
          )}
        </div>
      </section>

      <section className="card">
        <div className="card__header">
          <div>
            <h2>Historial de registros</h2>
            <p>
              {data
                ? `${formatNumber(data.total)} lotes · página ${page} de ${totalPages}`
                : 'Consultando registros…'}
            </p>
          </div>
          {loading && data && <span className="badge badge--soft">Actualizando…</span>}
        </div>
        <div className="card__body card__body--flush">
          {error ? (
            <div className="error-inline">
              <Icon name="alert" />
              <div>
                <strong>No se pudieron cargar los registros</strong>
                <p>{error}</p>
              </div>
              <button type="button" className="button button--ghost button--sm" onClick={() => void load()}>
                Reintentar
              </button>
            </div>
          ) : loading && !data ? (
            <PageLoader label="Cargando registros de vacunación…" />
          ) : !data || data.items.length === 0 ? (
            <EmptyState
              icon={activeFilters > 0 ? 'filter' : 'records'}
              title={
                activeFilters > 0
                  ? 'Sin resultados para estos filtros'
                  : 'Aún no hay registros'
              }
              description={
                activeFilters > 0
                  ? 'Prueba con otro periodo o limpia los filtros para ver todo el historial.'
                  : 'Registra la primera jornada de vacunación para comenzar a construir el historial.'
              }
              action={
                activeFilters > 0 ? (
                  <button type="button" className="button button--ghost" onClick={clearFilters}>
                    Limpiar filtros
                  </button>
                ) : (
                  <button type="button" className="button button--primary" onClick={openCreate}>
                    <Icon name="plus" />
                    Nuevo registro
                  </button>
                )
              }
            />
          ) : (
            <>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Lugar</th>
                      <th>Vacuna</th>
                      <th className="hide-md">Esquema</th>
                      <th>Dosis</th>
                      <th className="cell-num">Cantidad</th>
                      <th className="hide-lg">Observación</th>
                      <th className="cell-actions">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((registro) => (
                      <tr key={registro.id}>
                        <td className="cell-nowrap">{formatDate(registro.fecha)}</td>
                        <td className="cell-strong">{registro.lugar}</td>
                        <td>
                          <span className="vaccine-tag">
                            <Icon name="vaccine" />
                            {registro.vacuna}
                          </span>
                        </td>
                        <td className="hide-md">
                          <span className="cell-stack">
                            <strong>{registro.tiempo}</strong>
                            <small>
                              {registro.meses !== null
                                ? `${registro.meses} meses`
                                : 'Sin edad definida'}
                            </small>
                          </span>
                        </td>
                        <td>{registro.dosis}</td>
                        <td className="cell-num">
                          <span className="qty">{formatNumber(registro.cantidad)}</span>
                        </td>
                        <td className="hide-lg">
                          {registro.observacion ? (
                            <span
                              className="cell-truncate"
                              title={registro.observacion}
                            >
                              {registro.observacion}
                            </span>
                          ) : (
                            <span className="cell-muted">—</span>
                          )}
                        </td>
                        <td className="cell-actions">
                          <div className="row-actions">
                            <button
                              type="button"
                              className="icon-button icon-button--sm"
                              onClick={() => openEdit(registro)}
                              aria-label={`Editar registro del ${formatDate(registro.fecha)}`}
                              title="Editar"
                            >
                              <Icon name="edit" />
                            </button>
                            <button
                              type="button"
                              className="icon-button icon-button--sm icon-button--danger"
                              onClick={() => setDeleteTarget(registro)}
                              aria-label={`Eliminar registro del ${formatDate(registro.fecha)}`}
                              title="Eliminar"
                            >
                              <Icon name="trash" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pagination">
                <div className="pagination__info">
                  Mostrando{' '}
                  <strong>
                    {(page - 1) * pageSize + 1}–
                    {Math.min(page * pageSize, data.total)}
                  </strong>{' '}
                  de <strong>{formatNumber(data.total)}</strong>
                </div>
                <div className="pagination__controls">
                  <label className="pagination__size">
                    <span>Filas</span>
                    <select
                      value={pageSize}
                      onChange={(event) => {
                        setPageSize(Number(event.target.value))
                        setPage(1)
                      }}
                    >
                      {[10, 20, 50, 100].map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="icon-button icon-button--sm"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={page <= 1 || loading}
                    aria-label="Página anterior"
                  >
                    <Icon name="chevronLeft" />
                  </button>
                  <span className="pagination__page">
                    {page} / {totalPages}
                  </span>
                  <button
                    type="button"
                    className="icon-button icon-button--sm"
                    onClick={() =>
                      setPage((current) => Math.min(totalPages, current + 1))
                    }
                    disabled={page >= totalPages || loading}
                    aria-label="Página siguiente"
                  >
                    <Icon name="chevronRight" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      <Modal
        open={formOpen}
        title={editing ? 'Editar registro' : 'Nuevo registro de vacunación'}
        description={
          editing
            ? 'Actualiza los datos del lote seleccionado.'
            : 'Captura las dosis aplicadas en esta jornada.'
        }
        onClose={closeForm}
        size="lg"
        footer={
          <>
            <button
              type="button"
              className="button button--ghost"
              onClick={closeForm}
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="registro-form"
              className="button button--primary"
              disabled={saving}
            >
              {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Probar registro'}
            </button>
          </>
        }
      >
        <form id="registro-form" className="form-grid" onSubmit={handleSubmit}>
          <label className="field">
            <span>Fecha de la jornada *</span>
            <input
              type="date"
              required
              value={form.fecha}
              onChange={(event) =>
                setForm((current) => ({ ...current, fecha: event.target.value }))
              }
            />
          </label>
          <label className="field">
            <span>Lugar de vacunación *</span>
            <select
              required
              value={form.lugarId}
              onChange={(event) =>
                setForm((current) => ({ ...current, lugarId: event.target.value }))
              }
            >
              <option value="">Selecciona un lugar…</option>
              {catalogos.lugares.map((item) => (
                <option key={item.id} value={item.id}>
                  {catalogLabel(item.nombre, item.activo)}
                </option>
              ))}
            </select>
          </label>
          {editing ? (
            <label className="field">
              <span>Vacuna *</span>
              <select
                required
                value={form.vacunaId}
                onChange={(event) =>
                  setForm((current) => ({ ...current, vacunaId: event.target.value }))
                }
              >
                <option value="">Selecciona una vacuna…</option>
                {catalogos.vacunas
                  .filter((item) => item.activo || editing.vacunaId === item.id)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {catalogLabel(item.nombre, item.activo)}
                    </option>
                  ))}
              </select>
            </label>
          ) : (
            <fieldset className="field vaccine-picker span-2">
              <legend>Vacunas *</legend>
              <p className="field__hint">Selecciona una o varias vacunas para esta jornada.</p>
              <div className="vaccine-picker__options">
                {catalogos.vacunas.filter((item) => item.activo).map((item) => {
                  const id = String(item.id)
                  return (
                    <label className="vaccine-picker__option" key={item.id}>
                      <input
                        type="checkbox"
                        checked={selectedVacunas.includes(id)}
                        onChange={(event) => setSelectedVacunas((current) =>
                          event.target.checked ? [...current, id] : current.filter((value) => value !== id),
                        )}
                      />
                      <span>{item.nombre}</span>
                    </label>
                  )
                })}
              </div>
              <small className="field__hint">
                {selectedVacunas.length} {selectedVacunas.length === 1 ? 'vacuna seleccionada' : 'vacunas seleccionadas'} · Vista previa local; no se guardarán registros.
              </small>
            </fieldset>
          )}
          <label className="field">
            <span>Tiempo del esquema *</span>
            <select
              required
              value={form.tiempoId}
              onChange={(event) =>
                setForm((current) => ({ ...current, tiempoId: event.target.value }))
              }
            >
              <option value="">Selecciona el tiempo…</option>
                {catalogos.tiempos
                  .filter((item) => item.activo || editing?.tiempoId === item.id)
                  .map((item) => (
                  <option key={item.id} value={item.id}>
                    {catalogLabel(item.nombre, item.activo)}
                    {item.meses !== null ? ` · ${item.meses} meses` : ''}
                  </option>
                  ))}
            </select>
          </label>
          <label className="field">
            <span>Dosis *</span>
            <select
              required
              value={form.dosisId}
              onChange={(event) =>
                setForm((current) => ({ ...current, dosisId: event.target.value }))
              }
            >
              <option value="">Selecciona la dosis…</option>
                {catalogos.dosis
                  .filter((item) => item.activo || editing?.dosisId === item.id)
                  .map((item) => (
                  <option key={item.id} value={item.id}>
                    {catalogLabel(item.nombre, item.activo)}
                  </option>
                  ))}
            </select>
          </label>
          <label className="field">
            <span>Cantidad de dosis *</span>
            <input
              type="number"
              required
              min={1}
              step={1}
              inputMode="numeric"
              value={form.cantidad}
              onChange={(event) =>
                setForm((current) => ({ ...current, cantidad: event.target.value }))
              }
            />
            <small className="field__hint">Puedes registrar un lote completo.</small>
          </label>
          <label className="field span-2">
            <span>Observación</span>
            <textarea
              rows={3}
              maxLength={500}
              placeholder="Jornada, brigada, novedades o cualquier detalle relevante…"
              value={form.observacion}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  observacion: event.target.value,
                }))
              }
            />
            <small className="field__hint">{form.observacion.length}/500</small>
          </label>

          {formError && (
            <p className="form-error span-2" role="alert">
              <Icon name="alert" />
              {formError}
            </p>
          )}
          {catalogError && (
            <p className="inline-warning span-2">
              <Icon name="alert" />
              Faltan catálogos por cargar. Cierra el formulario y recarga la
              página.
            </p>
          )}
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Eliminar registro"
        description={
          deleteTarget
            ? `Se eliminará el registro del ${formatDate(deleteTarget.fecha)} en ${deleteTarget.lugar} (${deleteTarget.cantidad} dosis de ${deleteTarget.vacuna}). Esta acción no se puede deshacer.`
            : ''
        }
        busy={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
      />
    </>
  )
}
