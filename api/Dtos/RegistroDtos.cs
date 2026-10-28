using System.ComponentModel.DataAnnotations;

namespace Enfermeria.Api.Dtos;

public record RegistroVacunacionDto(
    long Id,
    DateOnly Fecha,
    int LugarId,
    string Lugar,
    int VacunaId,
    string Vacuna,
    int TiempoId,
    string Tiempo,
    int? Meses,
    int DosisId,
    string Dosis,
    int Cantidad,
    string? Observacion,
    DateTime CreadoEn,
    DateTime ActualizadoEn);

public class RegistroCreateDto
{
    [Range(1, int.MaxValue, ErrorMessage = "El lugar es obligatorio.")]
    public int LugarId { get; set; }

    [Required(ErrorMessage = "La fecha es obligatoria.")]
    public DateOnly? Fecha { get; set; }

    [Range(1, int.MaxValue, ErrorMessage = "La vacuna es obligatoria.")]
    public int VacunaId { get; set; }

    [Range(1, int.MaxValue, ErrorMessage = "El tiempo es obligatorio.")]
    public int TiempoId { get; set; }

    [Range(1, int.MaxValue, ErrorMessage = "La dosis es obligatoria.")]
    public int DosisId { get; set; }

    [Range(1, int.MaxValue, ErrorMessage = "La cantidad debe ser mayor que cero.")]
    public int Cantidad { get; set; } = 1;

    [StringLength(1000, ErrorMessage = "La observación no puede superar los 1000 caracteres.")]
    public string? Observacion { get; set; }
}

public class RegistroUpdateDto : RegistroCreateDto;

public record PagedResult<T>(
    int Page,
    int PageSize,
    long Total,
    IReadOnlyList<T> Items);
