import { Link } from 'react-router-dom'
import { Icon } from '../components/Icon'

export function NotFound() {
  return (
    <div className="not-found">
      <div className="not-found__art" aria-hidden="true">
        <span className="not-found__code">404</span>
        <span className="not-found__icon">
          <Icon name="syringe" />
        </span>
      </div>
      <span className="eyebrow">Página no encontrada</span>
      <h1>Esta ruta no está en el esquema</h1>
      <p>
        La dirección que buscas no existe o fue movida. Vuelve al panel para
        continuar con el control de vacunación.
      </p>
      <div className="not-found__actions">
        <Link className="button button--primary" to="/">
          <Icon name="dashboard" />
          Ir al panel
        </Link>
        <Link className="button button--ghost" to="/registros">
          <Icon name="records" />
          Ver registros
        </Link>
      </div>
    </div>
  )
}
