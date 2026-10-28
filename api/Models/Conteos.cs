namespace Enfermeria.Api.Models;

// Estas clases se mapean a las vistas de conteo de PostgreSQL.
// No tienen clave primaria porque son vistas agregadas.

public class ConteoLugarFecha
{
    public int LugarId { get; set; }
    public string Lugar { get; set; } = string.Empty;
    public DateOnly Fecha { get; set; }
    public long TotalVacunas { get; set; }
    public long TotalRegistros { get; set; }
}

public class ConteoLugarFechaVacuna
{
    public int LugarId { get; set; }
    public string Lugar { get; set; } = string.Empty;
    public DateOnly Fecha { get; set; }
    public int VacunaId { get; set; }
    public string Vacuna { get; set; } = string.Empty;
    public long TotalVacunas { get; set; }
}

public class ConteoLugarFechaVacunaDosis
{
    public int LugarId { get; set; }
    public string Lugar { get; set; } = string.Empty;
    public DateOnly Fecha { get; set; }
    public int VacunaId { get; set; }
    public string Vacuna { get; set; } = string.Empty;
    public int TiempoId { get; set; }
    public string Tiempo { get; set; } = string.Empty;
    public int DosisId { get; set; }
    public string Dosis { get; set; } = string.Empty;
    public long TotalVacunas { get; set; }
}

public class ConteoTotalPorFecha
{
    public DateOnly Fecha { get; set; }
    public long TotalVacunas { get; set; }
}

public class ConteoTotalPorLugar
{
    public int LugarId { get; set; }
    public string Lugar { get; set; } = string.Empty;
    public long TotalVacunas { get; set; }
}

public class ConteoTotalPorVacuna
{
    public int VacunaId { get; set; }
    public string Vacuna { get; set; } = string.Empty;
    public long TotalVacunas { get; set; }
}

public class ConteoTotalPorDosis
{
    public int DosisId { get; set; }
    public string Dosis { get; set; } = string.Empty;
    public long TotalVacunas { get; set; }
}
