namespace Enfermeria.Api.Models;

public class Dosis
{
    public int Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public int Orden { get; set; }
    public bool Activo { get; set; } = true;
    public DateTime CreadoEn { get; set; }
    public DateTime ActualizadoEn { get; set; }

    public ICollection<RegistroVacunacion> Registros { get; set; } = new List<RegistroVacunacion>();
}
