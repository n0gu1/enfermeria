using Enfermeria.Api.Data;
using Enfermeria.Api.Dtos;
using Enfermeria.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Enfermeria.Api.Controllers;

[ApiController]
[Route("api/dosis")]
public class DosisController : ControllerBase
{
    private readonly EnfermeriaDbContext _db;

    public DosisController(EnfermeriaDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<DosisDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<DosisDto>>> GetAll(
        [FromQuery] bool incluirInactivos = false,
        [FromQuery] string? buscar = null,
        CancellationToken ct = default)
    {
        var query = _db.Dosis.AsNoTracking();

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
            .ThenBy(x => x.Nombre)
            .Select(x => new DosisDto(x.Id, x.Nombre, x.Orden, x.Activo, x.CreadoEn, x.ActualizadoEn))
            .ToListAsync(ct);

        return Ok(items);
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(DosisDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<DosisDto>> GetById(int id, CancellationToken ct = default)
    {
        var item = await _db.Dosis
            .AsNoTracking()
            .Where(x => x.Id == id)
            .Select(x => new DosisDto(x.Id, x.Nombre, x.Orden, x.Activo, x.CreadoEn, x.ActualizadoEn))
            .FirstOrDefaultAsync(ct);

        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost]
    [ProducesResponseType(typeof(DosisDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<DosisDto>> Create(DosisCreateDto dto, CancellationToken ct = default)
    {
        var entity = new Dosis
        {
            Nombre = dto.Nombre.Trim(),
            Orden = dto.Orden,
            Activo = dto.Activo
        };

        _db.Dosis.Add(entity);
        await _db.SaveChangesAsync(ct);

        var result = ToDto(entity);
        return CreatedAtAction(nameof(GetById), new { id = entity.Id }, result);
    }

    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(DosisDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<DosisDto>> Update(int id, DosisUpdateDto dto, CancellationToken ct = default)
    {
        var entity = await _db.Dosis.FindAsync(new object[] { id }, ct);
        if (entity is null)
        {
            return NotFound();
        }

        entity.Nombre = dto.Nombre.Trim();
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
        var entity = await _db.Dosis.FindAsync(new object[] { id }, ct);
        if (entity is null)
        {
            return NotFound();
        }

        _db.Dosis.Remove(entity);
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    private static DosisDto ToDto(Dosis x) =>
        new(x.Id, x.Nombre, x.Orden, x.Activo, x.CreadoEn, x.ActualizadoEn);
}
