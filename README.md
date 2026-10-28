# Enfermería

Sistema para registrar y **contar vacunas aplicadas** por lugar, fecha, vacuna, tiempo y dosis.

- **Base de datos:** PostgreSQL 18 en Neon (`enfermeria_db`), esquema en Tercera Forma Normal.
- **API:** .NET 10 / ASP.NET Core con EF Core, CRUD completo y endpoints de conteo.
- **Despliegue:** Docker en Render.

## Estructura

```text
.
├── api/                 # API .NET 10
│   ├── Controllers/     # CRUD de catálogos, registros y conteos
│   ├── Data/            # DbContext y mapeos EF Core
│   ├── Dtos/            # Contratos de entrada/salida
│   ├── Middleware/      # Manejo de errores de PostgreSQL
│   ├── Models/          # Entidades y vistas de conteo
│   └── Program.cs       # Configuración, Swagger, CORS y health check
├── db/                  # Esquema, vistas, datos iniciales y ejemplos SQL
├── Dockerfile           # Imagen de la API
├── render.yaml          # Definición del servicio en Render
└── README.md
```

## Documentación

- [`db/README.md`](db/README.md): modelo de datos, 3FN, vistas y función de conteo.
- [`api/README.md`](api/README.md): endpoints, ejemplos y configuración de la API.

## Inicio rápido

1. Configura la cadena de conexión (formato clave-valor de Npgsql):

   ```powershell
   $env:ConnectionStrings__DefaultConnection = "Host=...;Port=5432;Database=enfermeria_db;Username=...;Password=...;SSL Mode=Require;Channel Binding=Require;Trust Server Certificate=true"
   ```

2. Ejecuta la API:

   ```bash
   dotnet run --project api/Enfermeria.Api.csproj
   ```

3. Abre Swagger en `http://localhost:5000/swagger`.

## API desplegada

- Swagger: `https://enfermeria-api.onrender.com/swagger`
- Health check: `https://enfermeria-api.onrender.com/health`

## Conteo principal

`GET /api/conteos/lugar-fecha` devuelve el total de vacunas y de registros por lugar y fecha. Acepta filtros `lugarId`, `fecha`, `desde` y `hasta`.

```json
[
  {
    "lugarId": 1,
    "lugar": "Centro de Salud Central",
    "fecha": "2026-10-28",
    "totalVacunas": 10,
    "totalRegistros": 1
  }
]
```

## Base de datos

Los scripts de `db/` se ejecutan en este orden:

1. `01_schema.sql`
2. `02_views.sql`
3. `03_seed.sql`
4. `04_crud_examples.sql` (opcional, ejemplos)

La contraseña de la base de datos no se guarda en el repositorio: se configura como variable de entorno en Render.
