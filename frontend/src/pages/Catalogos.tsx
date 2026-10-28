import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react'
import {
  api,
  ApiError,
  type CatalogKey,
  type Dosis,
  type Lugar,
  type Tiempo,
  type Vacuna,
} from '../api'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { EmptyState } from '../components/EmptyState'
import { Icon, type IconName } from '../components/Icon'
import { PageLoader } from '../components/Loading'
import { Modal } from '../components/Modal'
import { PageHeader } from '../components/PageHeader'
import { useToast } from '../components/Toast'
import { formatDate } from '../lib/format'

type FieldName = 'nombre' | 'direccion' | 'descripcion' | 'meses' | 'orden'

interface FieldDef {
  name: FieldName
  label: string
  type: 'text' | 'textarea' | 'number'
  placeholder?: string
  hint?: string
  required?: boolean
  span?: boolean
}

interface ColumnDef {
  key:
    | 'nombre'
    | 'direccion'
    | 'descripcion'
    | 'meses'
    | 'orden'
    | 'activo'
    | 'actualizadoEn'
  label: string
  hide?: 'sm' | 'md'
  numeric?: boolean
}

interface CatalogConfig {
  key: CatalogKey
  singular: string
  plural: string
  newLabel: string
  article: 'un' | 'una'
  createdLabel: string
  updatedLabel: string
  title: string
  eyebrow: string
  description: string
  icon: IconName
  searchPlaceholder: string
  emptyTitle: string
  emptyDescription: string
  fields: FieldDef[]
  columns: ColumnDef[]
}

interface CatalogItem {
  id: number
  nombre: string
  activo: boolean
  creadoEn: string
  actualizadoEn: string
  direccion?: string | null
  descripcion?: string | null
  meses?: number | null
  orden?: number
}

interface CatalogForm {
  nombre: string
  direccion: string
  descripcion: string
  meses: string
  orden: string
  activo: boolean
}

type CatalogEntity = Lugar | Vacuna | Tiempo | Dosis

const CONFIGS: Record<CatalogKey, CatalogConfig> = {
  lugares: {
    key: 'lugares',
    singular: 'lugar',
    plural: 'lugares',
    newLabel: 'Nuevo lugar',
    article: 'un',
    createdLabel: 'Lugar creado',
    updatedLabel: 'Lugar actualizado',
    title: 'Lugares de vacunación',
    eyebrow: 'Catálogo · Ubicaciones',
    description:
      'Administra los puntos donde se aplican las dosis: centros de salud, brigadas y jornadas.',
    icon: 'place',
    searchPlaceholder: 'Buscar por nombre o dirección…',
    emptyTitle: 'Aún no hay lugares',
    emptyDescription:
      'Crea el primer punto de vacunación para poder registrar jornadas.',
    fields: [
      {
        name: 'nombre',
        label: 'Nombre del lugar *',
        type: 'text',
        placeholder: 'Centro de Salud Central',
        required: true,
      },
      {
        name: 'direccion',
        label: 'Dirección',
        type: 'text',
        placeholder: 'Av. Principal #123, zona centro',
        span: true,
      },
    ],
    columns: [
      { key: 'nombre', label: 'Lugar' },
      { key: 'direccion', label: 'Dirección', hide: 'sm' },
      { key: 'activo', label: 'Estado' },
      { key: 'actualizadoEn', label: 'Actualizado', hide: 'md' },
    ],
  },
  vacunas: {
    key: 'vacunas',
    singular: 'vacuna',
    plural: 'vacunas',
    newLabel: 'Nueva vacuna',
    article: 'una',
    createdLabel: 'Vacuna creada',
    updatedLabel: 'Vacuna actualizada',
    title: 'Catálogo de vacunas',
    eyebrow: 'Catálogo · Biológicos',
    description:
      'Define los biológicos que aplica el equipo. Cada vacuna se combina con tiempos y dosis al registrar.',
    icon: 'vaccine',
    searchPlaceholder: 'Buscar vacuna por nombre o descripción…',
    emptyTitle: 'Aún no hay vacunas',
    emptyDescription:
      'Agrega los biológicos disponibles para comenzar a registrar dosis.',
    fields: [
      {
        name: 'nombre',
        label: 'Nombre de la vacuna *',
        type: 'text',
        placeholder: 'BCG, Hepatitis B, Influenza…',
        required: true,
      },
      {
        name: 'descripcion',
        label: 'Descripción',
        type: 'textarea',
        placeholder: 'Indicaciones, laboratorio o detalles del biológico…',
        span: true,
      },
    ],
    columns: [
      { key: 'nombre', label: 'Vacuna' },
      { key: 'descripcion', label: 'Descripción', hide: 'sm' },
      { key: 'activo', label: 'Estado' },
      { key: 'actualizadoEn', label: 'Actualizado', hide: 'md' },
    ],
  },
  tiempos: {
    key: 'tiempos',
    singular: 'tiempo',
    plural: 'tiempos',
    newLabel: 'Nuevo tiempo',
    article: 'un',
    createdLabel: 'Tiempo creado',
    updatedLabel: 'Tiempo actualizado',
    title: 'Tiempos del esquema',
    eyebrow: 'Catálogo · Esquema',
    description:
      'Organiza los momentos del esquema por edad. El orden define cómo aparecen en los formularios.',
    icon: 'clock',
    searchPlaceholder: 'Buscar tiempo del esquema…',
    emptyTitle: 'Aún no hay tiempos',
    emptyDescription:
      'Crea los momentos del esquema, por ejemplo recién nacido o primer año.',
    fields: [
      {
        name: 'nombre',
        label: 'Nombre del tiempo *',
        type: 'text',
        placeholder: 'Recién nacido, 2 meses, Primer año…',
        required: true,
      },
      {
        name: 'meses',
        label: 'Meses de edad',
        type: 'number',
        placeholder: '0',
        hint: 'Opcional. Ayuda a ordenar el esquema por edad.',
      },
      {
        name: 'orden',
        label: 'Orden *',
        type: 'number',
        placeholder: '1',
        hint: 'Posición dentro del esquema.',
        required: true,
      },
    ],
    columns: [
      { key: 'nombre', label: 'Tiempo' },
      { key: 'meses', label: 'Meses', numeric: true },
      { key: 'orden', label: 'Orden', numeric: true },
      { key: 'activo', label: 'Estado' },
      { key: 'actualizadoEn', label: 'Actualizado', hide: 'md' },
    ],
  },
  dosis: {
    key: 'dosis',
    singular: 'dosis',
    plural: 'dosis',
    newLabel: 'Nueva dosis',
    article: 'una',
    createdLabel: 'Dosis creada',
    updatedLabel: 'Dosis actualizada',
    title: 'Catálogo de dosis',
    eyebrow: 'Catálogo · Dosis',
    description:
      'Define las dosis del esquema (primera, segunda, refuerzo…) y su orden de aplicación.',
    icon: 'dose',
    searchPlaceholder: 'Buscar dosis…',
    emptyTitle: 'Aún no hay dosis',
    emptyDescription:
      'Agrega las dosis del esquema para poder registrar aplicaciones.',
    fields: [
      {
        name: 'nombre',
        label: 'Nombre de la dosis *',
        type: 'text',
        placeholder: 'Primera, Segunda, Refuerzo…',
        required: true,
      },
      {
        name: 'orden',
        label: 'Orden *',
        type: 'number',
        placeholder: '1',
        hint: 'Posición de la dosis dentro del esquema.',
        required: true,
      },
    ],
    columns: [
      { key: 'nombre', label: 'Dosis' },
      { key: 'orden', label: 'Orden', numeric: true },
      { key: 'activo', label: 'Estado' },
      { key: 'actualizadoEn', label: 'Actualizado', hide: 'md' },
    ],
  },
}

function toCatalogItem(item: CatalogEntity): CatalogItem {
  return {
    id: item.id,
    nombre: item.nombre,
    activo: item.activo,
    creadoEn: item.creadoEn,
    actualizadoEn: item.actualizadoEn,
    direccion: 'direccion' in item ? item.direccion : undefined,
    descripcion: 'descripcion' in item ? item.descripcion : undefined,
    meses: 'meses' in item ? item.meses : undefined,
    orden: 'orden' in item ? item.orden : undefined,
  }
}

function saveCatalog(
  resource: CatalogKey,
  id: number | null,
  values: CatalogForm,
): Promise<unknown> {
  const nombre = values.nombre.trim()

  switch (resource) {
    case 'lugares': {
      const payload = {
        nombre,
        direccion: values.direccion.trim() || null,
        activo: values.activo,
      }
      return id ? api.lugares.update(id, payload) : api.lugares.create(payload)
    }
    case 'vacunas': {
      const payload = {
        nombre,
        descripcion: values.descripcion.trim() || null,
        activo: values.activo,
      }
      return id ? api.vacunas.update(id, payload) : api.vacunas.create(payload)
    }
    case 'tiempos': {
      const payload = {
        nombre,
        meses: values.meses === '' ? null : Number(values.meses),
        orden: Number(values.orden),
        activo: values.activo,
      }
      return id ? api.tiempos.update(id, payload) : api.tiempos.create(payload)
    }
    case 'dosis': {
      const payload = {
        nombre,
        orden: Number(values.orden),
        activo: values.activo,
      }
      return id ? api.dosis.update(id, payload) : api.dosis.create(payload)
    }
  }
}

function formFromItem(item: CatalogItem): CatalogForm {
  return {
    nombre: item.nombre,
    direccion: item.direccion ?? '',
    descripcion: item.descripcion ?? '',
    meses: item.meses !== null && item.meses !== undefined ? String(item.meses) : '',
    orden: item.orden !== undefined ? String(item.orden) : '1',
    activo: item.activo,
  }
}

export function Catalogos({ resource }: { resource: CatalogKey }) {
  const config = CONFIGS[resource]
  const toast = useToast()

  const [items, setItems] = useState<CatalogItem[]>([])
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [includeInactive, setIncludeInactive] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const requestId = useRef(0)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<CatalogItem | null>(null)
  const [form, setForm] = useState<CatalogForm>({
    nombre: '',
    direccion: '',
    descripcion: '',
    meses: '',
    orden: '1',
    activo: true,
  })
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<CatalogItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [search])

  const load = useCallback(async () => {
    const id = ++requestId.current
    setLoading(true)
    setError(null)

    try {
      const list = (await api[resource].list({
        incluirInactivos: includeInactive,
        buscar: debouncedSearch || undefined,
      })) as CatalogEntity[]

      if (id !== requestId.current) return
      setItems(list.map(toCatalogItem))
    } catch (caught) {
      if (id !== requestId.current) return
      setError(
        caught instanceof ApiError
          ? caught.message
          : `No se pudieron cargar los ${config.plural}.`,
      )
    } finally {
      if (id === requestId.current) setLoading(false)
    }
  }, [resource, includeInactive, debouncedSearch, config.plural])

  useEffect(() => {
    void load()
  }, [load])

  const activeCount = useMemo(
    () => items.filter((item) => item.activo).length,
    [items],
  )

  function openCreate() {
    const maxOrder = items.reduce(
      (max, item) => Math.max(max, item.orden ?? 0),
      0,
    )
    setEditing(null)
    setForm({
      nombre: '',
      direccion: '',
      descripcion: '',
      meses: '',
      orden: String(maxOrder + 1),
      activo: true,
    })
    setFormError(null)
    setFormOpen(true)
  }

  function openEdit(item: CatalogItem) {
    setEditing(item)
    setForm(formFromItem(item))
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

    if (!form.nombre.trim()) {
      return setFormError(`Escribe el nombre del ${config.singular}.`)
    }

    const hasOrder = config.fields.some((field) => field.name === 'orden')
    if (hasOrder) {
      const order = Number(form.orden)
      if (form.orden === '' || !Number.isInteger(order) || order < 0) {
        return setFormError('El orden debe ser un número entero mayor o igual a 0.')
      }
    }

    if (form.meses !== '') {
      const months = Number(form.meses)
      if (!Number.isInteger(months) || months < 0) {
        return setFormError('Los meses deben ser un número entero mayor o igual a 0.')
      }
    }

    setSaving(true)
    try {
      await saveCatalog(resource, editing?.id ?? null, form)
      toast.show(
        `${editing ? config.updatedLabel : config.createdLabel} correctamente.`,
      )
      setFormOpen(false)
      setEditing(null)
      await load()
    } catch (caught) {
      setFormError(
        caught instanceof ApiError
          ? caught.message
          : `No se pudo guardar el ${config.singular}.`,
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api[resource].remove(deleteTarget.id)
      toast.show(`Se eliminó «${deleteTarget.nombre}».`)
      setDeleteTarget(null)
      await load()
    } catch (caught) {
      toast.show(
        caught instanceof ApiError
          ? caught.message
          : `No se pudo eliminar el ${config.singular}.`,
        'error',
      )
    } finally {
      setDeleting(false)
    }
  }

  function renderCell(column: ColumnDef, item: CatalogItem) {
    switch (column.key) {
      case 'nombre':
        return (
          <span className="name-cell">
            <strong>{item.nombre}</strong>
            <small>ID {item.id}</small>
          </span>
        )
      case 'direccion':
        return item.direccion ? (
          <span className="cell-multiline">{item.direccion}</span>
        ) : (
          <span className="cell-muted">—</span>
        )
      case 'descripcion':
        return item.descripcion ? (
          <span className="cell-truncate" title={item.descripcion}>
            {item.descripcion}
          </span>
        ) : (
          <span className="cell-muted">—</span>
        )
      case 'meses':
        return item.meses !== null && item.meses !== undefined ? (
          <span>{item.meses} meses</span>
        ) : (
          <span className="cell-muted">—</span>
        )
      case 'orden':
        return <span className="order-pill">{item.orden ?? '—'}</span>
      case 'activo':
        return (
          <span className={`badge ${item.activo ? 'badge--active' : 'badge--inactive'}`}>
            <span className="badge__dot" />
            {item.activo ? 'Activo' : 'Inactivo'}
          </span>
        )
      case 'actualizadoEn':
        return <span className="cell-muted">{formatDate(item.actualizadoEn)}</span>
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={config.eyebrow}
        title={config.title}
        description={config.description}
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
            <button type="button" className="button button--primary" onClick={openCreate}>
              <Icon name="plus" />
              {config.newLabel}
            </button>
          </>
        }
      />

      <section className="card">
        <div className="toolbar">
          <label className="search-field">
            <Icon name="search" />
            <input
              type="search"
              value={search}
              placeholder={config.searchPlaceholder}
              onChange={(event) => setSearch(event.target.value)}
              aria-label={config.searchPlaceholder}
            />
            {search && (
              <button
                type="button"
                className="search-field__clear"
                onClick={() => setSearch('')}
                aria-label="Limpiar búsqueda"
              >
                <Icon name="close" />
              </button>
            )}
          </label>

          <div className="toolbar__right">
            <label className="check-field">
              <input
                type="checkbox"
                checked={includeInactive}
                onChange={(event) => setIncludeInactive(event.target.checked)}
              />
              <span>Incluir inactivos</span>
            </label>
            <span className="toolbar__count">
              {loading
                ? 'Cargando…'
                : `${items.length} ${items.length === 1 ? config.singular : config.plural}${
                    includeInactive ? ` · ${activeCount} activos` : ''
                  }`}
            </span>
          </div>
        </div>

        {error ? (
          <div className="error-inline">
            <Icon name="alert" />
            <div>
              <strong>No se pudo cargar el catálogo</strong>
              <p>{error}</p>
            </div>
            <button
              type="button"
              className="button button--ghost button--sm"
              onClick={() => void load()}
            >
              Reintentar
            </button>
          </div>
        ) : loading && items.length === 0 ? (
          <PageLoader label={`Cargando catálogo de ${config.plural}…`} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={search ? 'search' : config.icon}
            title={search ? 'Sin coincidencias' : config.emptyTitle}
            description={
              search
                ? `No encontramos ${config.plural} que coincidan con «${search}». Prueba con otro término.`
                : config.emptyDescription
            }
            action={
              search ? (
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={() => setSearch('')}
                >
                  Limpiar búsqueda
                </button>
              ) : (
                <button type="button" className="button button--primary" onClick={openCreate}>
                  <Icon name="plus" />
                  {config.newLabel}
                </button>
              )
            }
          />
        ) : (
          <div className={`table-wrap${loading ? ' table-wrap--loading' : ''}`}>
            <table className="data-table">
              <thead>
                <tr>
                  {config.columns.map((column) => (
                    <th
                      key={column.key}
                      className={[
                        column.numeric ? 'cell-num' : '',
                        column.hide ? `hide-${column.hide}` : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      {column.label}
                    </th>
                  ))}
                  <th className="cell-actions">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    {config.columns.map((column) => (
                      <td
                        key={column.key}
                        className={[
                          column.numeric ? 'cell-num' : '',
                          column.hide ? `hide-${column.hide}` : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        {renderCell(column, item)}
                      </td>
                    ))}
                    <td className="cell-actions">
                      <div className="row-actions">
                        <button
                          type="button"
                          className="icon-button icon-button--sm"
                          onClick={() => openEdit(item)}
                          aria-label={`Editar ${item.nombre}`}
                          title="Editar"
                        >
                          <Icon name="edit" />
                        </button>
                        <button
                          type="button"
                          className="icon-button icon-button--sm icon-button--danger"
                          onClick={() => setDeleteTarget(item)}
                          aria-label={`Eliminar ${item.nombre}`}
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
        )}

        {!error && !loading && items.length > 0 && (
          <div className="table-note">
            <Icon name="spark" />
            <span>
              {includeInactive
                ? `${activeCount} de ${items.length} ${config.plural} están activos.`
                : `Mostrando ${items.length} ${items.length === 1 ? config.singular : config.plural} disponibles.`}{' '}
              Los catálogos alimentan los registros y los conteos.
            </span>
          </div>
        )}
      </section>

      <Modal
        open={formOpen}
        title={editing ? `Editar ${config.singular}` : config.newLabel}
        description={
          editing
            ? `Actualiza los datos de «${editing.nombre}».`
            : `Completa los datos para agregar ${config.article} ${config.singular} al catálogo.`
        }
        onClose={closeForm}
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
              form="catalogo-form"
              className="button button--primary"
              disabled={saving}
            >
              {saving
                ? 'Guardando…'
                : editing
                  ? 'Guardar cambios'
                  : `Crear ${config.singular}`}
            </button>
          </>
        }
      >
        <form id="catalogo-form" className="form-grid" onSubmit={handleSubmit}>
          {config.fields.map((field) => (
            <label
              key={field.name}
              className={`field${field.span ? ' span-2' : ''}`}
            >
              <span>{field.label}</span>
              {field.type === 'textarea' ? (
                <textarea
                  rows={3}
                  maxLength={500}
                  placeholder={field.placeholder}
                  value={form[field.name]}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      [field.name]: event.target.value,
                    }))
                  }
                />
              ) : (
                <input
                  type={field.type}
                  required={field.required}
                  min={field.type === 'number' ? 0 : undefined}
                  step={field.type === 'number' ? 1 : undefined}
                  inputMode={field.type === 'number' ? 'numeric' : undefined}
                  placeholder={field.placeholder}
                  value={form[field.name]}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      [field.name]: event.target.value,
                    }))
                  }
                />
              )}
              {field.hint && <small className="field__hint">{field.hint}</small>}
            </label>
          ))}

          <label className="switch-field span-2">
            <span className="switch">
              <input
                type="checkbox"
                checked={form.activo}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    activo: event.target.checked,
                  }))
                }
              />
              <span className="switch__track">
                <span className="switch__thumb" />
              </span>
            </span>
            <span className="switch-field__text">
              <strong>Activo</strong>
              <small>
                Disponible para seleccionarse en nuevos registros. Los
                inactivos conservan su historial.
              </small>
            </span>
          </label>

          {formError && (
            <p className="form-error span-2" role="alert">
              <Icon name="alert" />
              {formError}
            </p>
          )}
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Eliminar ${config.singular}`}
        description={
          deleteTarget
            ? `Se eliminará «${deleteTarget.nombre}» del catálogo. Si está referenciado en registros de vacunación, la API impedirá la eliminación. Esta acción no se puede deshacer.`
            : ''
        }
        busy={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
      />
    </>
  )
}
