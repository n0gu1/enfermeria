import { Icon, type IconName } from './Icon'

interface StatCardProps {
  label: string
  value: string
  hint?: string
  icon: IconName
  tone?: 'teal' | 'amber' | 'blue' | 'coral'
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'teal',
}: StatCardProps) {
  return (
    <article className={`stat-card stat-card--${tone}`}>
      <div className="stat-card__top">
        <span className="stat-card__icon">
          <Icon name={icon} />
        </span>
        <span className="stat-card__label">{label}</span>
      </div>
      <strong className="stat-card__value">{value}</strong>
      {hint && <span className="stat-card__hint">{hint}</span>}
    </article>
  )
}
