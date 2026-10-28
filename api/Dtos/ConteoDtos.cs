namespace Enfermeria.Api.Dtos;

public record ConteoLugarFechaDto(
    int LugarId,
    string Lugar,
    DateOnly Fecha,
    long TotalVacunas,
    long TotalRegistros);

public record ConteoLugarFechaVacunaDto(
    int LugarId,
    string Lugar,
    DateOnly Fecha,
    int VacunaId,
    string Vacuna,
    long TotalVacunas);

public record ConteoLugarFechaVacunaDosisDto(
    int LugarId,
    string Lugar,
    DateOnly Fecha,
    int VacunaId,
    string Vacuna,
    int TiempoId,
    string Tiempo,
    int DosisId,
    string Dosis,
    long TotalVacunas);

public record ConteoPorFechaDto(
    DateOnly Fecha,
    long TotalVacunas);

public record ConteoPorLugarDto(
    int LugarId,
    string Lugar,
    long TotalVacunas);

public record ConteoPorVacunaDto(
    int VacunaId,
    string Vacuna,
    long TotalVacunas);

public record ConteoPorDosisDto(
    int DosisId,
    string Dosis,
    long TotalVacunas);

public record ResumenConteoDto(
    long TotalVacunas,
    long TotalRegistros,
    IReadOnlyList<ConteoPorVacunaDto> PorVacuna,
    IReadOnlyList<ConteoPorDosisDto> PorDosis);
