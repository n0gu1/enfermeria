-- ============================================================
-- Ejemplos de CRUD
-- Estos son ejemplos: ajusta los valores antes de ejecutarlos.
-- ============================================================

-- ------------------------------------------------------------
-- LUGARES
-- ------------------------------------------------------------
INSERT INTO lugares (nombre, direccion)
VALUES ('Centro de Salud Central', 'Av. Principal #123')
RETURNING *;

UPDATE lugares
SET nombre = 'Centro de Salud Central (actualizado)',
    direccion = 'Av. Principal #123, Zona 1'
WHERE id = 1
RETURNING *;

-- Falla si el lugar tiene registros de vacunación (ON DELETE RESTRICT).
DELETE FROM lugares
WHERE id = 1;

-- ------------------------------------------------------------
-- VACUNAS
-- ------------------------------------------------------------
INSERT INTO vacunas (nombre, descripcion)
VALUES ('BCG', 'Vacuna contra la tuberculosis')
RETURNING *;

UPDATE vacunas
SET descripcion = 'Vacuna BCG contra la tuberculosis'
WHERE id = 1
RETURNING *;

DELETE FROM vacunas
WHERE id = 1;

-- ------------------------------------------------------------
-- TIEMPOS
-- ------------------------------------------------------------
INSERT INTO tiempos (nombre, meses, orden)
VALUES ('5 meses', 5, 5)
RETURNING *;

UPDATE tiempos
SET nombre = '5 meses (esquema ampliado)'
WHERE id = 1
RETURNING *;

DELETE FROM tiempos
WHERE id = 1;

-- ------------------------------------------------------------
-- DOSIS
-- ------------------------------------------------------------
INSERT INTO dosis (nombre, orden)
VALUES ('Sexta', 6)
RETURNING *;

UPDATE dosis
SET orden = 7
WHERE id = 1
RETURNING *;

DELETE FROM dosis
WHERE id = 1;

-- ------------------------------------------------------------
-- REGISTROS DE VACUNACIÓN
-- ------------------------------------------------------------
-- cantidad = número de vacunas aplicadas en ese lugar/fecha
-- con esa vacuna, tiempo y dosis.
INSERT INTO registros_vacunacion
    (lugar_id, fecha, vacuna_id, tiempo_id, dosis_id, cantidad, observacion)
VALUES
    (1, DATE '2026-10-28', 1, 1, 1, 10, 'Jornada de vacunación')
RETURNING *;

UPDATE registros_vacunacion
SET cantidad = 12,
    observacion = 'Jornada de vacunación (conteo corregido)'
WHERE id = 1
RETURNING *;

DELETE FROM registros_vacunacion
WHERE id = 1;

-- ------------------------------------------------------------
-- CONSULTAS DE CONTEO
-- ------------------------------------------------------------
-- Conteo principal: total por lugar y fecha
SELECT *
FROM v_conteo_lugar_fecha
ORDER BY fecha DESC, lugar;

-- Conteo por lugar y fecha usando la función
SELECT *
FROM contar_vacunas(1, DATE '2026-10-28');

-- Conteo por lugar, fecha y vacuna
SELECT *
FROM v_conteo_lugar_fecha_vacuna
ORDER BY fecha DESC, lugar, vacuna;

-- Conteo por lugar, fecha, vacuna, tiempo y dosis
SELECT *
FROM v_conteo_lugar_fecha_vacuna_dosis
ORDER BY fecha DESC, lugar, vacuna, tiempo, dosis;

-- Totales generales
SELECT * FROM v_conteo_total_por_fecha  ORDER BY fecha DESC;
SELECT * FROM v_conteo_total_por_lugar  ORDER BY total_vacunas DESC;
SELECT * FROM v_conteo_total_por_vacuna ORDER BY total_vacunas DESC;
SELECT * FROM v_conteo_total_por_dosis  ORDER BY total_vacunas DESC;

-- Detalle de registros
SELECT *
FROM v_registros_detalle
ORDER BY fecha DESC, lugar, vacuna;
