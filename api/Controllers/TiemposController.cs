using Enfermeria.Api.Data;
using Enfermeria.Api.Dtos;
using Enfermeria.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Enfermeria.Api.Controllers;

[ApiController]
[Route("api/tiempos")]
public class TiemposController : ControllerBase
{
    private readonly EnfermeriaDbContext _db;

    public TiemposController(EnfermeriaDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<TiempoDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<TiempoDto>>> GetAll(
        [FromQuery] bool incluirInactivos = false,
        [FromQuery] string? buscar = null,
        CancellationToken ct = default)
    {
        var query = _db.Tiempos.AsNoTracking();

        if (!incluirInactivos)
        {
            query = query.Where(x => x.Activo);
        }

        if (!string.IsNullOrWhiteSpace(buscar))
        {
            var term = $"%{buscar.Trim()}%";
            query = query.Where(x => EF.Functions.ILike(x.Nombre, term));
        }

        var items = await query
            .OrderBy(x => x.Orden)
            .ThenBy(x => x.Meses)
            .ThenBy(x => x.Nombre)
            .Select(x => new TiempoDto(x.Id, x.Nombre, x.Meses, x.Orden, x.Activo, x.CreadoEn, x.ActualizadoEn))
            .ToListAsync(ct);

        return Ok(items);
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(TiempoDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<TiempoDto>> GetById(int id, CancellationToken ct = default)
    {
        var item = await _db.Tiempos
            .AsNoTracking()
            .Where(x => x.Id == id)
            .Select(x => new TiempoDto(x.Id, x.Nombre, x.Meses, x.Orden, x.Activo, x.CreadoEn, x.ActualizadoEn))
            .FirstOrDefaultAsync(ct);

        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost]
    [ProducesResponseType(typeof(TiempoDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<TiempoDto>> Create(TiempoCreateDto dto, CancellationToken ct = default)
    {
        var entity = new Tiempo
        {
            Nombre = dto.Nombre.Trim(),
            Meses = dto.Meses,
            Orden = dto.Orden,
            Activo = dto.Activo
        };

        _db.Tiempos.Add(entity);
        await _db.SaveChangesAsync(ct);

        var result = ToDto(entity);
        return CreatedAtAction(nameof(GetById), new { id = entity.Id }, result);
    }

    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(TiempoDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<TiempoDto>> Update(int id, TiempoUpdateDto dto, CancellationToken ct = default)
    {
        var entity = await _db.Tiempos.FindAsync(new object[] { id }, ct);
        if (entity is null)
        {
            return NotFound();
        }

        entity.Nombre = dto.Nombre.Trim();
        entity.Meses = dto.Meses;
        entity.Orden = dto.Orden;
        entity.Activo = dto.Activo;

        await _db.SaveChangesAsync(ct);
        return Ok(ToDto(entity));
    }

    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Delete(int id, CancellationToken ct = default)
    {
        var entity = await _db.Tiempos.FindAsync(new object[] { id }, ct);
        if (entity is null)
        {
            return NotFound();
        }

        _db.Tiempos.Remove(entity);
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    private static TiempoDto ToDto(Tiempo x) =>
        new(x.Id, x.Nombre, x.Meses, x.Orden, x.Activo, x.CreadoEn, x.ActualizadoEn);
}
