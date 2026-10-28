using System.ComponentModel.DataAnnotations;

namespace Enfermeria.Api.Dtos;

public record LugarDto(
    int Id,
    string Nombre,
    string? Direccion,
    bool Activo,
    DateTime CreadoEn,
    DateTime ActualizadoEn);

public class LugarCreateDto
{
    [Required(ErrorMessage = "El nombre es obligatorio.")]
    [StringLength(200, MinimumLength = 1, ErrorMessage = "El nombre debe tener entre 1 y 200 caracteres.")]
    public string Nombre { get; set; } = string.Empty;

    [StringLength(500, ErrorMessage = "La dirección no puede superar los 500 caracteres.")]
    public string? Direccion { get; set; }

    public bool Activo { get; set; } = true;
}

public class LugarUpdateDto : LugarCreateDto;

public record VacunaDto(
    int Id,
    string Nombre,
    string? Descripcion,
    bool Activo,
    DateTime CreadoEn,
    DateTime ActualizadoEn);

public class VacunaCreateDto
{
    [Required(ErrorMessage = "El nombre es obligatorio.")]
    [StringLength(200, MinimumLength = 1, ErrorMessage = "El nombre debe tener entre 1 y 200 caracteres.")]
    public string Nombre { get; set; } = string.Empty;

    [StringLength(1000, ErrorMessage = "La descripción no puede superar los 1000 caracteres.")]
    public string? Descripcion { get; set; }

    public bool Activo { get; set; } = true;
}

public class VacunaUpdateDto : VacunaCreateDto;

public record TiempoDto(
    int Id,
    string Nombre,
    int? Meses,
    int Orden,
    bool Activo,
    DateTime CreadoEn,
    DateTime ActualizadoEn);

public class TiempoCreateDto
{
    [Required(ErrorMessage = "El nombre es obligatorio.")]
    [StringLength(100, MinimumLength = 1, ErrorMessage = "El nombre debe tener entre 1 y 100 caracteres.")]
    public string Nombre { get; set; } = string.Empty;

    [Range(0, 1200, ErrorMessage = "Los meses deben estar entre 0 y 1200.")]
    public int? Meses { get; set; }

    [Range(0, 10000, ErrorMessage = "El orden debe estar entre 0 y 10000.")]
    public int Orden { get; set; }

    public bool Activo { get; set; } = true;
}

public class TiempoUpdateDto : TiempoCreateDto;

public record DosisDto(
    int Id,
    string Nombre,
    int Orden,
    bool Activo,
    DateTime CreadoEn,
    DateTime ActualizadoEn);

public class DosisCreateDto
{
    [Required(ErrorMessage = "El nombre es obligatorio.")]
    [StringLength(100, MinimumLength = 1, ErrorMessage = "El nombre debe tener entre 1 y 100 caracteres.")]
    public string Nombre { get; set; } = string.Empty;

    [Range(0, 10000, ErrorMessage = "El orden debe estar entre 0 y 10000.")]
    public int Orden { get; set; }

    public bool Activo { get; set; } = true;
}

public class DosisUpdateDto : DosisCreateDto;
