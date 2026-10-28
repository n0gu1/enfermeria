namespace Enfermeria.Api.Models;

public class Lugar
{
    public int Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string? Direccion { get; set; }
    public bool Activo { get; set; } = true;
    public DateTime CreadoEn { get; set; }
    public DateTime ActualizadoEn { get; set; }

    public ICollection<RegistroVacunacion> Registros { get; set; } = new List<RegistroVacunacion>();
}
