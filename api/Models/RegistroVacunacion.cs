namespace Enfermeria.Api.Models;

public class RegistroVacunacion
{
    public long Id { get; set; }
    public int LugarId { get; set; }
    public DateOnly Fecha { get; set; }
    public int VacunaId { get; set; }
    public int TiempoId { get; set; }
    public int DosisId { get; set; }
    public int Cantidad { get; set; } = 1;
    public string? Observacion { get; set; }
    public DateTime CreadoEn { get; set; }
    public DateTime ActualizadoEn { get; set; }

    public Lugar? Lugar { get; set; }
    public Vacuna? Vacuna { get; set; }
    public Tiempo? Tiempo { get; set; }
    public Dosis? Dosis { get; set; }
}
