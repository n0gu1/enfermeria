export function PageLoader({ label = 'Cargando información…' }: { label?: string }) {
  return (
    <div className="page-loader" role="status" aria-live="polite">
      <img
        className="page-loader__image"
        src="/perrito-enfermero-cargando.gif"
        alt={label}
      />
    </div>
  )
}

export function TableSkeleton({
  rows = 6,
  columns = 5,
}: {
  rows?: number
  columns?: number
}) {
  return (
    <div className="table-skeleton" aria-hidden="true">
      {Array.from({ length: rows }).map((_, row) => (
        <div
          key={row}
          className="table-skeleton__row"
          style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
        >
          {Array.from({ length: columns }).map((__, column) => (
            <span key={column} className="skeleton table-skeleton__cell" />
          ))}
        </div>
      ))}
    </div>
  )
}

export function CardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="stats-grid" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="stat-card">
          <span className="skeleton" style={{ width: '45%', height: 12 }} />
          <span
            className="skeleton"
            style={{ width: '60%', height: 30, marginTop: 18 }}
          />
        </div>
      ))}
    </div>
  )
}
