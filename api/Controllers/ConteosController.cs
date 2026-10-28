using Enfermeria.Api.Data;
using Enfermeria.Api.Dtos;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Enfermeria.Api.Controllers;

[ApiController]
[Route("api/conteos")]
public class ConteosController : ControllerBase
{
    private readonly EnfermeriaDbContext _db;

    public ConteosController(EnfermeriaDbContext db)
    {
        _db = db;
    }

    /// <summary>
    /// Conteo principal: total de vacunas por lugar y fecha.
    /// </summary>
    [HttpGet("lugar-fecha")]
    [ProducesResponseType(typeof(IEnumerable<ConteoLugarFechaDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<ConteoLugarFechaDto>>> GetLugarFecha(
        [FromQuery] int? lugarId = null,
        [FromQuery] DateOnly? fecha = null,
        [FromQuery] DateOnly? desde = null,
        [FromQuery] DateOnly? hasta = null,
        CancellationToken ct = default)
    {
        var query = _db.ConteosLugarFecha.AsNoTracking();

        if (lugarId.HasValue) query = query.Where(x => x.LugarId == lugarId.Value);
        if (fecha.HasValue) query = query.Where(x => x.Fecha == fecha.Value);
        if (desde.HasValue) query = query.Where(x => x.Fecha >= desde.Value);
        if (hasta.HasValue) query = query.Where(x => x.Fecha <= hasta.Value);

        var items = await query
            .OrderByDescending(x => x.Fecha)
            .ThenBy(x => x.Lugar)
            .Select(x => new ConteoLugarFechaDto(
                x.LugarId, x.Lugar, x.Fecha, x.TotalVacunas, x.TotalRegistros))
            .ToListAsync(ct);

        return Ok(items);
    }

    /// <summary>
    /// Conteo por lugar, fecha y vacuna.
    /// </summary>
    [HttpGet("lugar-fecha-vacuna")]
    [ProducesResponseType(typeof(IEnumerable<ConteoLugarFechaVacunaDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<ConteoLugarFechaVacunaDto>>> GetLugarFechaVacuna(
        [FromQuery] int? lugarId = null,
        [FromQuery] int? vacunaId = null,
        [FromQuery] DateOnly? fecha = null,
        [FromQuery] DateOnly? desde = null,
        [FromQuery] DateOnly? hasta = null,
        CancellationToken ct = default)
    {
        var query = _db.ConteosLugarFechaVacuna.AsNoTracking();

        if (lugarId.HasValue) query = query.Where(x => x.LugarId == lugarId.Value);
        if (vacunaId.HasValue) query = query.Where(x => x.VacunaId == vacunaId.Value);
        if (fecha.HasValue) query = query.Where(x => x.Fecha == fecha.Value);
        if (desde.HasValue) query = query.Where(x => x.Fecha >= desde.Value);
        if (hasta.HasValue) query = query.Where(x => x.Fecha <= hasta.Value);

        var items = await query
            .OrderByDescending(x => x.Fecha)
            .ThenBy(x => x.Lugar)
            .ThenBy(x => x.Vacuna)
            .Select(x => new ConteoLugarFechaVacunaDto(
                x.LugarId, x.Lugar, x.Fecha, x.VacunaId, x.Vacuna, x.TotalVacunas))
            .ToListAsync(ct);

        return Ok(items);
    }

    /// <summary>
    /// Conteo detallado por lugar, fecha, vacuna, tiempo y dosis.
    /// </summary>
    [HttpGet("lugar-fecha-vacuna-dosis")]
    [ProducesResponseType(typeof(IEnumerable<ConteoLugarFechaVacunaDosisDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<ConteoLugarFechaVacunaDosisDto>>> GetLugarFechaVacunaDosis(
        [FromQuery] int? lugarId = null,
        [FromQuery] int? vacunaId = null,
        [FromQuery] int? tiempoId = null,
        [FromQuery] int? dosisId = null,
        [FromQuery] DateOnly? fecha = null,
        [FromQuery] DateOnly? desde = null,
        [FromQuery] DateOnly? hasta = null,
        CancellationToken ct = default)
    {
        var query = _db.ConteosLugarFechaVacunaDosis.AsNoTracking();

        if (lugarId.HasValue) query = query.Where(x => x.LugarId == lugarId.Value);
        if (vacunaId.HasValue) query = query.Where(x => x.VacunaId == vacunaId.Value);
        if (tiempoId.HasValue) query = query.Where(x => x.TiempoId == tiempoId.Value);
        if (dosisId.HasValue) query = query.Where(x => x.DosisId == dosisId.Value);
        if (fecha.HasValue) query = query.Where(x => x.Fecha == fecha.Value);
        if (desde.HasValue) query = query.Where(x => x.Fecha >= desde.Value);
        if (hasta.HasValue) query = query.Where(x => x.Fecha <= hasta.Value);

        var items = await query
            .OrderByDescending(x => x.Fecha)
            .ThenBy(x => x.Lugar)
            .ThenBy(x => x.Vacuna)
            .ThenBy(x => x.Tiempo)
            .ThenBy(x => x.Dosis)
            .Select(x => new ConteoLugarFechaVacunaDosisDto(
                x.LugarId, x.Lugar, x.Fecha,
                x.VacunaId, x.Vacuna,
                x.TiempoId, x.Tiempo,
                x.DosisId, x.Dosis,
                x.TotalVacunas))
            .ToListAsync(ct);

        return Ok(items);
    }

    [HttpGet("por-fecha")]
    [ProducesResponseType(typeof(IEnumerable<ConteoPorFechaDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<ConteoPorFechaDto>>> GetPorFecha(
        [FromQuery] DateOnly? desde = null,
        [FromQuery] DateOnly? hasta = null,
        CancellationToken ct = default)
    {
        var query = _db.ConteosTotalPorFecha.AsNoTracking();

        if (desde.HasValue) query = query.Where(x => x.Fecha >= desde.Value);
        if (hasta.HasValue) query = query.Where(x => x.Fecha <= hasta.Value);

        var items = await query
            .OrderByDescending(x => x.Fecha)
            .Select(x => new ConteoPorFechaDto(x.Fecha, x.TotalVacunas))
            .ToListAsync(ct);

        return Ok(items);
    }

    [HttpGet("por-lugar")]
    [ProducesResponseType(typeof(IEnumerable<ConteoPorLugarDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<ConteoPorLugarDto>>> GetPorLugar(
        [FromQuery] int? lugarId = null,
        CancellationToken ct = default)
    {
        var query = _db.ConteosTotalPorLugar.AsNoTracking();

        if (lugarId.HasValue) query = query.Where(x => x.LugarId == lugarId.Value);

        var items = await query
            .OrderByDescending(x => x.TotalVacunas)
            .ThenBy(x => x.Lugar)
            .Select(x => new ConteoPorLugarDto(x.LugarId, x.Lugar, x.TotalVacunas))
            .ToListAsync(ct);

        return Ok(items);
    }

    [HttpGet("por-vacuna")]
    [ProducesResponseType(typeof(IEnumerable<ConteoPorVacunaDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<ConteoPorVacunaDto>>> GetPorVacuna(
        [FromQuery] int? vacunaId = null,
        CancellationToken ct = default)
    {
        var query = _db.ConteosTotalPorVacuna.AsNoTracking();

        if (vacunaId.HasValue) query = query.Where(x => x.VacunaId == vacunaId.Value);

        var items = await query
            .OrderByDescending(x => x.TotalVacunas)
            .ThenBy(x => x.Vacuna)
            .Select(x => new ConteoPorVacunaDto(x.VacunaId, x.Vacuna, x.TotalVacunas))
            .ToListAsync(ct);

        return Ok(items);
    }

    [HttpGet("por-dosis")]
    [ProducesResponseType(typeof(IEnumerable<ConteoPorDosisDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<ConteoPorDosisDto>>> GetPorDosis(
        [FromQuery] int? dosisId = null,
        CancellationToken ct = default)
    {
        var query = _db.ConteosTotalPorDosis.AsNoTracking();

        if (dosisId.HasValue) query = query.Where(x => x.DosisId == dosisId.Value);

        var items = await query
            .OrderByDescending(x => x.TotalVacunas)
            .ThenBy(x => x.Dosis)
            .Select(x => new ConteoPorDosisDto(x.DosisId, x.Dosis, x.TotalVacunas))
            .ToListAsync(ct);

        return Ok(items);
    }

    /// <summary>
    /// Resumen para un lugar y/o fecha: total y desglose por vacuna y dosis.
    /// </summary>
    [HttpGet("resumen")]
    [ProducesResponseType(typeof(ResumenConteoDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<ResumenConteoDto>> GetResumen(
        [FromQuery] int? lugarId = null,
        [FromQuery] DateOnly? fecha = null,
        [FromQuery] DateOnly? desde = null,
        [FromQuery] DateOnly? hasta = null,
        CancellationToken ct = default)
    {
        var detalle = _db.ConteosLugarFechaVacunaDosis.AsNoTracking();

        if (lugarId.HasValue) detalle = detalle.Where(x => x.LugarId == lugarId.Value);
        if (fecha.HasValue) detalle = detalle.Where(x => x.Fecha == fecha.Value);
        if (desde.HasValue) detalle = detalle.Where(x => x.Fecha >= desde.Value);
        if (hasta.HasValue) detalle = detalle.Where(x => x.Fecha <= hasta.Value);

        var totalVacunas = await detalle.SumAsync(x => x.TotalVacunas, ct);

        // EF Core no traduce GroupBy + Sum dentro del constructor del DTO.
        // Se proyecta a un tipo anónimo y se mapea a DTO en memoria.
        var porVacunaRaw = await detalle
            .GroupBy(x => new { x.VacunaId, x.Vacuna })
            .Select(g => new
            {
                g.Key.VacunaId,
                g.Key.Vacuna,
                TotalVacunas = g.Sum(x => x.TotalVacunas)
            })
            .OrderByDescending(x => x.TotalVacunas)
            .ThenBy(x => x.Vacuna)
            .ToListAsync(ct);

        var porVacuna = porVacunaRaw
            .Select(x => new ConteoPorVacunaDto(x.VacunaId, x.Vacuna, x.TotalVacunas))
            .ToList();

        var porDosisRaw = await detalle
            .GroupBy(x => new { x.DosisId, x.Dosis })
            .Select(g => new
            {
                g.Key.DosisId,
                g.Key.Dosis,
                TotalVacunas = g.Sum(x => x.TotalVacunas)
            })
            .OrderByDescending(x => x.TotalVacunas)
            .ThenBy(x => x.Dosis)
            .ToListAsync(ct);

        var porDosis = porDosisRaw
            .Select(x => new ConteoPorDosisDto(x.DosisId, x.Dosis, x.TotalVacunas))
            .ToList();

        var resumenRegistros = _db.ConteosLugarFecha.AsNoTracking();

        if (lugarId.HasValue) resumenRegistros = resumenRegistros.Where(x => x.LugarId == lugarId.Value);
        if (fecha.HasValue) resumenRegistros = resumenRegistros.Where(x => x.Fecha == fecha.Value);
        if (desde.HasValue) resumenRegistros = resumenRegistros.Where(x => x.Fecha >= desde.Value);
        if (hasta.HasValue) resumenRegistros = resumenRegistros.Where(x => x.Fecha <= hasta.Value);

        var totalRegistros = await resumenRegistros.SumAsync(x => x.TotalRegistros, ct);

        return Ok(new ResumenConteoDto(totalVacunas, totalRegistros, porVacuna, porDosis));
    }
}
