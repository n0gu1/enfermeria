export const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '') ||
  'https://enfermeria-api-odz8.onrender.com'

export class ApiError extends Error {
  status: number
  body: unknown

  constructor(message: string, status: number, body?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

function buildQuery(params: object = {}) {
  const search = new URLSearchParams()

  Object.entries(params as Record<string, unknown>).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    search.set(key, String(value))
  })

  const query = search.toString()
  return query ? `?${query}` : ''
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 90_000)

  try {
    const headers = new Headers(init.headers)
    headers.set('Accept', 'application/json')
    if (init.body) headers.set('Content-Type', 'application/json')

    const response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers,
      signal: controller.signal,
    })

    if (!response.ok) {
      let body: unknown = null
      try {
        body = await response.json()
      } catch {
        // La respuesta de error puede no ser JSON.
      }

      const problem = body as
        | { title?: string; detail?: string; errors?: Record<string, string[]> }
        | null
      const validation = problem?.errors
        ? Object.values(problem.errors).flat().join(' ')
        : ''
      const message =
        validation ||
        problem?.detail ||
        problem?.title ||
        `La API respondió con error ${response.status}.`

      throw new ApiError(message, response.status, body)
    }

    if (response.status === 204) return undefined as T
    return (await response.json()) as T
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError(
        'La API tardó demasiado en responder. Si el servicio estaba dormido, intenta de nuevo en unos segundos.',
        0,
      )
    }

    if (error instanceof TypeError) {
      throw new ApiError(
        'No se pudo conectar con la API. Revisa tu conexión e intenta de nuevo.',
        0,
      )
    }

    throw error
  } finally {
    window.clearTimeout(timeout)
  }
}

export type CatalogKey = 'lugares' | 'vacunas' | 'tiempos' | 'dosis'

export interface Lugar {
  id: number
  nombre: string
  direccion: string | null
  activo: boolean
  creadoEn: string
  actualizadoEn: string
}

export interface Vacuna {
  id: number
  nombre: string
  descripcion: string | null
  activo: boolean
  creadoEn: string
  actualizadoEn: string
}

export interface Tiempo {
  id: number
  nombre: string
  meses: number | null
  orden: number
  activo: boolean
  creadoEn: string
  actualizadoEn: string
}

export interface Dosis {
  id: number
  nombre: string
  orden: number
  activo: boolean
  creadoEn: string
  actualizadoEn: string
}

export interface Registro {
  id: number
  fecha: string
  lugarId: number
  lugar: string
  vacunaId: number
  vacuna: string
  tiempoId: number
  tiempo: string
  meses: number | null
  dosisId: number
  dosis: string
  cantidad: number
  observacion: string | null
  creadoEn: string
  actualizadoEn: string
}

export interface PagedResult<T> {
  page: number
  pageSize: number
  total: number
  items: T[]
}

export interface Health {
  status: string
  database: string
  timestamp: string
}

export interface ConteoLugarFecha {
  lugarId: number
  lugar: string
  fecha: string
  totalVacunas: number
  totalRegistros: number
}

export interface ConteoLugarFechaVacuna {
  lugarId: number
  lugar: string
  fecha: string
  vacunaId: number
  vacuna: string
  totalVacunas: number
}

export interface ConteoLugarFechaVacunaDosis {
  lugarId: number
  lugar: string
  fecha: string
  vacunaId: number
  vacuna: string
  tiempoId: number
  tiempo: string
  dosisId: number
  dosis: string
  totalVacunas: number
}

export interface ConteoPorFecha {
  fecha: string
  totalVacunas: number
}

export interface ConteoPorLugar {
  lugarId: number
  lugar: string
  totalVacunas: number
}

export interface ConteoPorVacuna {
  vacunaId: number
  vacuna: string
  totalVacunas: number
}

export interface ConteoPorDosis {
  dosisId: number
  dosis: string
  totalVacunas: number
}

export interface ResumenConteo {
  totalVacunas: number
  totalRegistros: number
  porVacuna: ConteoPorVacuna[]
  porDosis: ConteoPorDosis[]
}

export interface ListParams {
  incluirInactivos?: boolean
  buscar?: string
}

export interface RegistroListParams {
  lugarId?: number
  vacunaId?: number
  tiempoId?: number
  dosisId?: number
  fecha?: string
  desde?: string
  hasta?: string
  page?: number
  pageSize?: number
}

export interface ConteoParams {
  lugarId?: number
  vacunaId?: number
  tiempoId?: number
  dosisId?: number
  fecha?: string
  desde?: string
  hasta?: string
}

export interface LugarPayload {
  nombre: string
  direccion?: string | null
  activo: boolean
}

export interface VacunaPayload {
  nombre: string
  descripcion?: string | null
  activo: boolean
}

export interface TiempoPayload {
  nombre: string
  meses?: number | null
  orden: number
  activo: boolean
}

export interface DosisPayload {
  nombre: string
  orden: number
  activo: boolean
}

export interface RegistroPayload {
  lugarId: number
  fecha: string
  vacunaId: number
  tiempoId: number
  dosisId: number
  cantidad: number
  observacion?: string | null
}

export interface CatalogApi<T, P> {
  list: (params?: ListParams) => Promise<T[]>
  create: (payload: P) => Promise<T>
  update: (id: number, payload: P) => Promise<T>
  remove: (id: number) => Promise<void>
}

export const api = {
  health: () => request<Health>('/health'),

  lugares: {
    list: (params: ListParams = {}) =>
      request<Lugar[]>(`/api/lugares${buildQuery(params)}`),
    create: (payload: LugarPayload) =>
      request<Lugar>('/api/lugares', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    update: (id: number, payload: LugarPayload) =>
      request<Lugar>(`/api/lugares/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    remove: (id: number) =>
      request<void>(`/api/lugares/${id}`, { method: 'DELETE' }),
  } satisfies CatalogApi<Lugar, LugarPayload>,

  vacunas: {
    list: (params: ListParams = {}) =>
      request<Vacuna[]>(`/api/vacunas${buildQuery(params)}`),
    create: (payload: VacunaPayload) =>
      request<Vacuna>('/api/vacunas', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    update: (id: number, payload: VacunaPayload) =>
      request<Vacuna>(`/api/vacunas/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    remove: (id: number) =>
      request<void>(`/api/vacunas/${id}`, { method: 'DELETE' }),
  } satisfies CatalogApi<Vacuna, VacunaPayload>,

  tiempos: {
    list: (params: ListParams = {}) =>
      request<Tiempo[]>(`/api/tiempos${buildQuery(params)}`),
    create: (payload: TiempoPayload) =>
      request<Tiempo>('/api/tiempos', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    update: (id: number, payload: TiempoPayload) =>
      request<Tiempo>(`/api/tiempos/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    remove: (id: number) =>
      request<void>(`/api/tiempos/${id}`, { method: 'DELETE' }),
  } satisfies CatalogApi<Tiempo, TiempoPayload>,

  dosis: {
    list: (params: ListParams = {}) =>
      request<Dosis[]>(`/api/dosis${buildQuery(params)}`),
    create: (payload: DosisPayload) =>
      request<Dosis>('/api/dosis', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    update: (id: number, payload: DosisPayload) =>
      request<Dosis>(`/api/dosis/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    remove: (id: number) =>
      request<void>(`/api/dosis/${id}`, { method: 'DELETE' }),
  } satisfies CatalogApi<Dosis, DosisPayload>,

  registros: {
    list: (params: RegistroListParams = {}) =>
      request<PagedResult<Registro>>(`/api/registros${buildQuery(params)}`),
    create: (payload: RegistroPayload) =>
      request<Registro>('/api/registros', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    createBatch: (payload: RegistroPayload[]) =>
      request<{ cantidad: number }>('/api/registros/lote', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    update: (id: number, payload: RegistroPayload) =>
      request<Registro>(`/api/registros/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    remove: (id: number) =>
      request<void>(`/api/registros/${id}`, { method: 'DELETE' }),
  },

  conteos: {
    lugarFecha: (params: ConteoParams = {}) =>
      request<ConteoLugarFecha[]>(
        `/api/conteos/lugar-fecha${buildQuery(params)}`,
      ),
    lugarFechaVacuna: (params: ConteoParams = {}) =>
      request<ConteoLugarFechaVacuna[]>(
        `/api/conteos/lugar-fecha-vacuna${buildQuery(params)}`,
      ),
    lugarFechaVacunaDosis: (params: ConteoParams = {}) =>
      request<ConteoLugarFechaVacunaDosis[]>(
        `/api/conteos/lugar-fecha-vacuna-dosis${buildQuery(params)}`,
      ),
    porFecha: (params: ConteoParams = {}) =>
      request<ConteoPorFecha[]>(
        `/api/conteos/por-fecha${buildQuery(params)}`,
      ),
    porLugar: (params: ConteoParams = {}) =>
      request<ConteoPorLugar[]>(
        `/api/conteos/por-lugar${buildQuery(params)}`,
      ),
    porVacuna: (params: ConteoParams = {}) =>
      request<ConteoPorVacuna[]>(
        `/api/conteos/por-vacuna${buildQuery(params)}`,
      ),
    porDosis: (params: ConteoParams = {}) =>
      request<ConteoPorDosis[]>(
        `/api/conteos/por-dosis${buildQuery(params)}`,
      ),
    resumen: (params: ConteoParams = {}) =>
      request<ResumenConteo>(`/api/conteos/resumen${buildQuery(params)}`),
  },
}
