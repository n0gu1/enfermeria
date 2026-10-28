-- ============================================================
-- enfermeria_db - Esquema de vacunación en Tercera Forma Normal
-- PostgreSQL / Neon
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- Función reutilizable para mantener actualizado_en
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_actualizado_en()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.actualizado_en := now();
    RETURN NEW;
END;
$$;

-- ------------------------------------------------------------
-- 1. Lugares
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lugares (
    id              integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre          text NOT NULL,
    direccion       text,
    activo          boolean NOT NULL DEFAULT true,
    creado_en       timestamptz NOT NULL DEFAULT now(),
    actualizado_en  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT lugares_nombre_no_vacio CHECK (btrim(nombre) <> '')
);

CREATE UNIQUE INDEX IF NOT EXISTS lugares_nombre_uq
    ON lugares (lower(btrim(nombre)));

DROP TRIGGER IF EXISTS trg_lugares_actualizado_en ON lugares;
CREATE TRIGGER trg_lugares_actualizado_en
    BEFORE UPDATE ON lugares
    FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();

-- ------------------------------------------------------------
-- 2. Vacunas
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vacunas (
    id              integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre          text NOT NULL,
    descripcion     text,
    activo          boolean NOT NULL DEFAULT true,
    creado_en       timestamptz NOT NULL DEFAULT now(),
    actualizado_en  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT vacunas_nombre_no_vacio CHECK (btrim(nombre) <> '')
);

CREATE UNIQUE INDEX IF NOT EXISTS vacunas_nombre_uq
    ON vacunas (lower(btrim(nombre)));

DROP TRIGGER IF EXISTS trg_vacunas_actualizado_en ON vacunas;
CREATE TRIGGER trg_vacunas_actualizado_en
    BEFORE UPDATE ON vacunas
    FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();

-- ------------------------------------------------------------
-- 3. Tiempos (edad o intervalo del esquema: "2 meses", "1 año")
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tiempos (
    id              integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre          text NOT NULL,
    meses           integer,
    orden           integer NOT NULL DEFAULT 0,
    activo          boolean NOT NULL DEFAULT true,
    creado_en       timestamptz NOT NULL DEFAULT now(),
    actualizado_en  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT tiempos_nombre_no_vacio CHECK (btrim(nombre) <> ''),
    CONSTRAINT tiempos_meses_no_negativo CHECK (meses IS NULL OR meses >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS tiempos_nombre_uq
    ON tiempos (lower(btrim(nombre)));

CREATE INDEX IF NOT EXISTS tiempos_orden_idx ON tiempos (orden, meses);

DROP TRIGGER IF EXISTS trg_tiempos_actualizado_en ON tiempos;
CREATE TRIGGER trg_tiempos_actualizado_en
    BEFORE UPDATE ON tiempos
    FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();

-- ------------------------------------------------------------
-- 4. Dosis (Primera, Segunda, Tercera, Refuerzo...)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dosis (
    id              integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre          text NOT NULL,
    orden           integer NOT NULL DEFAULT 0,
    activo          boolean NOT NULL DEFAULT true,
    creado_en       timestamptz NOT NULL DEFAULT now(),
    actualizado_en  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT dosis_nombre_no_vacio CHECK (btrim(nombre) <> '')
);

CREATE UNIQUE INDEX IF NOT EXISTS dosis_nombre_uq
    ON dosis (lower(btrim(nombre)));

CREATE INDEX IF NOT EXISTS dosis_orden_idx ON dosis (orden);

DROP TRIGGER IF EXISTS trg_dosis_actualizado_en ON dosis;
CREATE TRIGGER trg_dosis_actualizado_en
    BEFORE UPDATE ON dosis
    FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();

-- ------------------------------------------------------------
-- 5. Registros de vacunación (tabla de hechos)
--    Cada fila representa una aplicación o un lote aplicado
--    de una vacuna, en un lugar y fecha, con su tiempo y dosis.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS registros_vacunacion (
    id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    lugar_id        integer NOT NULL,
    fecha           date NOT NULL,
    vacuna_id       integer NOT NULL,
    tiempo_id       integer NOT NULL,
    dosis_id        integer NOT NULL,
    cantidad        integer NOT NULL DEFAULT 1,
    observacion     text,
    creado_en       timestamptz NOT NULL DEFAULT now(),
    actualizado_en  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT registros_lugar_fk
        FOREIGN KEY (lugar_id) REFERENCES lugares (id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT registros_vacuna_fk
        FOREIGN KEY (vacuna_id) REFERENCES vacunas (id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT registros_tiempo_fk
        FOREIGN KEY (tiempo_id) REFERENCES tiempos (id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT registros_dosis_fk
        FOREIGN KEY (dosis_id) REFERENCES dosis (id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT registros_cantidad_positiva CHECK (cantidad > 0)
);

CREATE INDEX IF NOT EXISTS registros_lugar_fecha_idx
    ON registros_vacunacion (lugar_id, fecha);
CREATE INDEX IF NOT EXISTS registros_fecha_idx
    ON registros_vacunacion (fecha);
CREATE INDEX IF NOT EXISTS registros_vacuna_idx
    ON registros_vacunacion (vacuna_id);
CREATE INDEX IF NOT EXISTS registros_tiempo_idx
    ON registros_vacunacion (tiempo_id);
CREATE INDEX IF NOT EXISTS registros_dosis_idx
    ON registros_vacunacion (dosis_id);

DROP TRIGGER IF EXISTS trg_registros_actualizado_en ON registros_vacunacion;
CREATE TRIGGER trg_registros_actualizado_en
    BEFORE UPDATE ON registros_vacunacion
    FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();

COMMIT;
