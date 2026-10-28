# Enfermería · Frontend

Aplicación web en **React 19 + TypeScript + Vite** para registrar y contar vacunas aplicadas.

## Funcionalidades

- **Panel**: dosis totales, lotes, actividad del día, tendencia de 14 días, distribución por dosis y ranking de vacunas.
- **Registros**: CRUD completo con filtros por lugar, vacuna, tiempo, dosis y rango de fechas; paginación y exportación CSV.
- **Conteos**: siete reportes (lugar/fecha, lugar/fecha/vacuna, detalle, por fecha, lugar, vacuna y dosis), filtros contextuales, rangos rápidos y exportación CSV.
- **Catálogos**: CRUD de lugares, vacunas, tiempos y dosis con búsqueda, inclusión de inactivos y validaciones.
- **UI**: español, responsive, accesible por teclado, con estados de carga, error y vacío.

## Requisitos

- Node.js 20 o superior.
- API de enfermería disponible (Render o local).

## Desarrollo

```bash
cd frontend
npm install
npm run dev
```

La aplicación queda en `http://localhost:5173`.

La URL de la API se toma de `VITE_API_URL`. Si no se define, usa
`https://enfermeria-api-odz8.onrender.com`. Para apuntar a la API local:

```bash
# frontend/.env.local
VITE_API_URL=http://localhost:5042
```

> El plan gratuito de Render puede tardar hasta un minuto en despertar el
> servicio. La interfaz muestra el estado de la API en la barra superior.

## Build

```bash
npm run build
npm run preview
```

El resultado se genera en `frontend/dist`.

## Despliegue en Netlify

El repositorio incluye `netlify.toml` en la raíz con:

- `base = "frontend"`
- `command = "npm run build"`
- `publish = "dist"`
- redirección SPA `/* → /index.html`
- cabeceras de seguridad y caché de assets

El sitio también puede desplegarse manualmente subiendo `frontend/dist` con la
CLI de Netlify o el MCP de Netlify.

## Estructura

```text
frontend/
├── public/              # favicon
├── src/
│   ├── components/      # layout, modales, toasts, iconos, estados
│   ├── lib/             # formato de fechas/números y exportación CSV
│   ├── pages/           # panel, registros, conteos y catálogos
│   ├── api.ts           # cliente HTTP y tipos de la API
│   ├── App.tsx          # rutas
│   ├── main.tsx         # entrada
│   └── styles.css       # sistema visual
├── .env.example
├── index.html
├── package.json
├── tsconfig*.json
└── vite.config.ts
```
