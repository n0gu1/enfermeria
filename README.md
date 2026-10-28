# Enfermería

Sistema para registrar y **contar vacunas aplicadas** por lugar, fecha, vacuna, tiempo y dosis.

- **Base de datos:** PostgreSQL 18 en Neon (`enfermeria_db`), esquema en Tercera Forma Normal.
- **API:** .NET 10 / ASP.NET Core con EF Core, CRUD completo y endpoints de conteo.
- **Frontend:** React 19 + TypeScript + Vite, interfaz en español para registros, catálogos y reportes.
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
├── frontend/            # Aplicación React para control de vacunación
├── netlify.toml         # Build y rutas SPA de Netlify
├── Dockerfile           # Imagen de la API
├── render.yaml          # Definición del servicio en Render
└── README.md
```

## Documentación

- [`db/README.md`](db/README.md): modelo de datos, 3FN, vistas y función de conteo.
- [`api/README.md`](api/README.md): endpoints, ejemplos y configuración de la API.
- [`frontend/README.md`](frontend/README.md): desarrollo, configuración y despliegue del frontend.

## Inicio rápido

1. Configura la cadena de conexión (formato clave-valor de Npgsql):

   ```powershell
   $env:ConnectionStrings__DefaultConnection = "Host=...;Port=5432;Database=enfermeria_db;Username=...;Password=...;SSL Mode=Require;Channel Binding=Require;Trust Server Certificate=true"
   ```

2. Ejecuta la API:

   ```bash
   dotnet run --project api/Enfermeria.Api.csproj
   ```

3. Abre Swagger en `http://localhost:5042/swagger`.

4. En otra terminal, inicia el frontend:

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

   La aplicación queda en `http://localhost:5173` y usa la API de Render por defecto.

## API desplegada

- Swagger: `https://enfermeria-api-odz8.onrender.com/swagger`
- Health check: `https://enfermeria-api-odz8.onrender.com/health`

## Frontend desplegado

- Aplicación: [https://enfermeria-frontend.netlify.app](https://enfermeria-frontend.netlify.app)
- Proyecto: [Netlify · enfermeria-frontend](https://app.netlify.com/projects/enfermeria-frontend)
- Acceso: protegido por el equipo Netlify; requiere iniciar sesión como miembro autorizado.
- El frontend usa la API desplegada en Render y ofrece exportación CSV de registros y reportes.

> La API no requiere autenticación actualmente. Mientras no se agregue control de acceso en el backend, sus operaciones de escritura están expuestas a quien pueda alcanzar el servicio.

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
