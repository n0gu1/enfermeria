-- ============================================================
-- Vistas y funciones de conteo
-- Ejecutar después de 01_schema.sql
-- ============================================================

BEGIN;

-- Detalle completo de cada registro con los nombres de los catálogos
CREATE OR REPLACE VIEW v_registros_detalle AS
SELECT
    r.id,
    r.fecha,
    r.lugar_id,
    l.nombre AS lugar,
    r.vacuna_id,
    v.nombre AS vacuna,
    r.tiempo_id,
    t.nombre AS tiempo,
    t.meses,
    r.dosis_id,
    d.nombre AS dosis,
    r.cantidad,
    r.observacion,
    r.creado_en,
    r.actualizado_en
FROM registros_vacunacion r
JOIN lugares l ON l.id = r.lugar_id
JOIN vacunas v ON v.id = r.vacuna_id
JOIN tiempos t ON t.id = r.tiempo_id
JOIN dosis d ON d.id = r.dosis_id;

-- Conteo principal: total de vacunas por lugar y fecha
CREATE OR REPLACE VIEW v_conteo_lugar_fecha AS
SELECT
    r.lugar_id,
    l.nombre AS lugar,
    r.fecha,
    SUM(r.cantidad)::bigint AS total_vacunas,
    COUNT(*)::bigint AS total_registros
FROM registros_vacunacion r
JOIN lugares l ON l.id = r.lugar_id
GROUP BY r.lugar_id, l.nombre, r.fecha;

-- Conteo por lugar, fecha y vacuna
CREATE OR REPLACE VIEW v_conteo_lugar_fecha_vacuna AS
SELECT
    r.lugar_id,
    l.nombre AS lugar,
    r.fecha,
    r.vacuna_id,
    v.nombre AS vacuna,
    SUM(r.cantidad)::bigint AS total_vacunas
FROM registros_vacunacion r
JOIN lugares l ON l.id = r.lugar_id
JOIN vacunas v ON v.id = r.vacuna_id
GROUP BY r.lugar_id, l.nombre, r.fecha, r.vacuna_id, v.nombre;

-- Conteo por lugar, fecha, vacuna, tiempo y dosis
CREATE OR REPLACE VIEW v_conteo_lugar_fecha_vacuna_dosis AS
SELECT
    r.lugar_id,
    l.nombre AS lugar,
    r.fecha,
    r.vacuna_id,
    v.nombre AS vacuna,
    r.tiempo_id,
    t.nombre AS tiempo,
    r.dosis_id,
    d.nombre AS dosis,
    SUM(r.cantidad)::bigint AS total_vacunas
FROM registros_vacunacion r
JOIN lugares l ON l.id = r.lugar_id
JOIN vacunas v ON v.id = r.vacuna_id
JOIN tiempos t ON t.id = r.tiempo_id
JOIN dosis d ON d.id = r.dosis_id
GROUP BY
    r.lugar_id, l.nombre, r.fecha,
    r.vacuna_id, v.nombre,
    r.tiempo_id, t.nombre,
    r.dosis_id, d.nombre;

-- Totales generales
CREATE OR REPLACE VIEW v_conteo_total_por_fecha AS
SELECT
    fecha,
    SUM(cantidad)::bigint AS total_vacunas
FROM registros_vacunacion
GROUP BY fecha;

CREATE OR REPLACE VIEW v_conteo_total_por_lugar AS
SELECT
    r.lugar_id,
    l.nombre AS lugar,
    SUM(r.cantidad)::bigint AS total_vacunas
FROM registros_vacunacion r
JOIN lugares l ON l.id = r.lugar_id
GROUP BY r.lugar_id, l.nombre;

CREATE OR REPLACE VIEW v_conteo_total_por_vacuna AS
SELECT
    r.vacuna_id,
    v.nombre AS vacuna,
    SUM(r.cantidad)::bigint AS total_vacunas
FROM registros_vacunacion r
JOIN vacunas v ON v.id = r.vacuna_id
GROUP BY r.vacuna_id, v.nombre;

CREATE OR REPLACE VIEW v_conteo_total_por_dosis AS
SELECT
    r.dosis_id,
    d.nombre AS dosis,
    SUM(r.cantidad)::bigint AS total_vacunas
FROM registros_vacunacion r
JOIN dosis d ON d.id = r.dosis_id
GROUP BY r.dosis_id, d.nombre;

-- Función para el conteo principal, con filtros opcionales.
-- Ejemplos:
--   SELECT * FROM contar_vacunas(1, DATE '2026-10-28');
--   SELECT * FROM contar_vacunas(NULL, DATE '2026-10-28');
--   SELECT * FROM contar_vacunas(1, NULL);
CREATE OR REPLACE FUNCTION contar_vacunas(
    p_lugar_id integer DEFAULT NULL,
    p_fecha    date DEFAULT NULL
)
RETURNS TABLE (
    lugar_id      integer,
    lugar         text,
    fecha         date,
    total_vacunas bigint
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        r.lugar_id,
        l.nombre,
        r.fecha,
        SUM(r.cantidad)::bigint
    FROM registros_vacunacion r
    JOIN lugares l ON l.id = r.lugar_id
    WHERE (p_lugar_id IS NULL OR r.lugar_id = p_lugar_id)
      AND (p_fecha IS NULL OR r.fecha = p_fecha)
    GROUP BY r.lugar_id, l.nombre, r.fecha
    ORDER BY r.fecha DESC, l.nombre;
$$;

COMMIT;
