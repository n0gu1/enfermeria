-- ============================================================
-- Datos iniciales de catálogos genéricos
-- Ejecutar después de 01_schema.sql
-- ============================================================

BEGIN;

-- Dosis habituales. El orden sirve para mostrarlas ordenadas.
INSERT INTO dosis (nombre, orden) VALUES
    ('Dosis única', 0),
    ('Primera',     1),
    ('Segunda',     2),
    ('Tercera',     3),
    ('Cuarta',      4),
    ('Quinta',      5),
    ('Refuerzo',    6)
ON CONFLICT DO NOTHING;

-- Tiempos habituales del esquema de vacunación.
-- "meses" normaliza el valor para poder ordenar y filtrar.
INSERT INTO tiempos (nombre, meses, orden) VALUES
    ('Al nacer', 0,   0),
    ('1 mes',    1,   1),
    ('2 meses',  2,   2),
    ('3 meses',  3,   3),
    ('4 meses',  4,   4),
    ('6 meses',  6,   6),
    ('1 año',    12,  12),
    ('18 meses', 18,  18),
    ('2 años',   24,  24),
    ('4 años',   48,  48),
    ('6 años',   72,  72),
    ('11 años',  132, 132),
    ('15 años',  180, 180)
ON CONFLICT DO NOTHING;

COMMIT;
