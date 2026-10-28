# Enfermería API

API REST en **.NET 10 / ASP.NET Core** para el CRUD de la base de datos de vacunación `enfermeria_db` (PostgreSQL en Neon), con endpoints de **conteo** de vacunas aplicadas.

## Tecnologías

- .NET 10 (ASP.NET Core Web API con controladores)
- Entity Framework Core 10 + `Npgsql.EntityFrameworkCore.PostgreSQL`
- `EFCore.NamingConventions` (mapeo automático a `snake_case`)
- Swagger / OpenAPI (Swashbuckle)
- Docker (imagen de despliegue para Render)

## Configuración

La API necesita la cadena de conexión de PostgreSQL. Se lee de `ConnectionStrings:DefaultConnection`:

```bash
export ConnectionStrings__DefaultConnection="Host=...;Port=5432;Database=enfermeria_db;Username=...;Password=...;SSL Mode=Require;Channel Binding=Require;Trust Server Certificate=true"
```

En PowerShell:

```powershell
$env:ConnectionStrings__DefaultConnection = "Host=...;Port=5432;Database=enfermeria_db;Username=...;Password=...;SSL Mode=Require;Channel Binding=Require;Trust Server Certificate=true"
```

> No se usa `postgresql://...` directamente: Npgsql requiere el formato clave-valor.
> La contraseña **no** debe guardarse en el repositorio. En Render se configura como variable de entorno.

Opcionalmente, para restringir CORS:

```bash
export Cors__AllowedOrigins__0="https://mi-frontend.com"
```

Si no se configura, se permite cualquier origen.

## Ejecutar en local

```bash
dotnet restore api/Enfermeria.Api.csproj
dotnet run --project api/Enfermeria.Api.csproj
```

La API queda disponible en `http://localhost:5042` (o el puerto que indique la consola):

- Swagger UI: `http://localhost:5042/swagger`
- Health check: `http://localhost:5042/health`

## Endpoints

### Catálogos

Cada catálogo (`lugares`, `vacunas`, `tiempos`, `dosis`) expone el mismo CRUD:

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/{recurso}?incluirInactivos=false&buscar=` | Lista, filtrando activos y por nombre. |
| `GET` | `/api/{recurso}/{id}` | Obtiene uno por id. |
| `POST` | `/api/{recurso}` | Crea. Devuelve `201` con `Location`. |
| `PUT` | `/api/{recurso}/{id}` | Actualiza. |
| `DELETE` | `/api/{recurso}/{id}` | Elimina. Devuelve `204`. |

Recursos: `lugares`, `vacunas`, `tiempos`, `dosis`.

Ejemplo:

```bash
curl -X POST http://localhost:5042/api/lugares \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Centro de Salud Central","direccion":"Av. Principal #123","activo":true}'
```

### Registros de vacunación

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/registros` | Lista paginada con filtros. |
| `GET` | `/api/registros/{id}` | Obtiene un registro. |
| `POST` | `/api/registros` | Crea un registro. |
| `PUT` | `/api/registros/{id}` | Actualiza un registro. |
| `DELETE` | `/api/registros/{id}` | Elimina un registro. |

Filtros de `GET /api/registros`:

- `lugarId`, `vacunaId`, `tiempoId`, `dosisId`
- `fecha`, `desde`, `hasta` (formato `YYYY-MM-DD`)
- `page` (desde 1), `pageSize` (1–200, por defecto 50)

Respuesta paginada:

```json
{
  "page": 1,
  "pageSize": 50,
  "total": 1,
  "items": [
    {
      "id": 1,
      "fecha": "2026-10-28",
      "lugarId": 1,
      "lugar": "Centro de Salud Central",
      "vacunaId": 1,
      "vacuna": "BCG",
      "tiempoId": 1,
      "tiempo": "Recién nacido",
      "meses": 0,
      "dosisId": 1,
      "dosis": "Primera",
      "cantidad": 10,
      "observacion": "Jornada de vacunación"
    }
  ]
}
```

Ejemplo de creación:

```bash
curl -X POST http://localhost:5042/api/registros \
  -H "Content-Type: application/json" \
  -d '{
    "lugarId": 1,
    "fecha": "2026-10-28",
    "vacunaId": 1,
    "tiempoId": 1,
    "dosisId": 1,
    "cantidad": 10,
    "observacion": "Jornada de vacunación"
  }'
```

### Conteos

Los conteos usan las vistas SQL de `db/02_views.sql` y suman `cantidad`, por lo que funcionan tanto con registros individuales como con lotes.

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/conteos/lugar-fecha` | **Conteo principal**: total por lugar y fecha. |
| `GET` | `/api/conteos/lugar-fecha-vacuna` | Total por lugar, fecha y vacuna. |
| `GET` | `/api/conteos/lugar-fecha-vacuna-dosis` | Detalle por lugar, fecha, vacuna, tiempo y dosis. |
| `GET` | `/api/conteos/por-fecha` | Total general por fecha. |
| `GET` | `/api/conteos/por-lugar` | Total general por lugar. |
| `GET` | `/api/conteos/por-vacuna` | Total general por vacuna. |
| `GET` | `/api/conteos/por-dosis` | Total general por dosis. |
| `GET` | `/api/conteos/resumen` | Total + desglose por vacuna y dosis. |

Filtros comunes: `lugarId`, `vacunaId`, `tiempoId`, `dosisId`, `fecha`, `desde`, `hasta` (según el endpoint).

Ejemplos:

```bash
# Total por lugar y fecha
curl "http://localhost:5042/api/conteos/lugar-fecha?desde=2026-10-01&hasta=2026-10-31"

# Total de un lugar en una fecha
curl "http://localhost:5042/api/conteos/lugar-fecha?lugarId=1&fecha=2026-10-28"

# Resumen del día
curl "http://localhost:5042/api/conteos/resumen?fecha=2026-10-28"
```

## Manejo de errores

Los errores se devuelven como `application/problem+json`:

- `400`: validación de datos o referencia inexistente.
- `404`: recurso no encontrado.
- `409`: nombre duplicado o registro referenciado (FK `RESTRICT`).
- `500`: error inesperado.

## Docker

```bash
docker build -t enfermeria-api .
docker run --rm -p 10000:10000 \
  -e ConnectionStrings__DefaultConnection="Host=...;..." \
  enfermeria-api
```

La API escucha en `0.0.0.0:${PORT:-10000}`.

## Despliegue en Render

El servicio se define en `render.yaml` (Docker, plan free, región `ohio`). La variable `ConnectionStrings__DefaultConnection` se configura en el panel de Render y no se versiona.

Health check: `GET /health`.
