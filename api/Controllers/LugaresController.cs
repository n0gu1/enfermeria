using Enfermeria.Api.Data;
using Enfermeria.Api.Dtos;
using Enfermeria.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Enfermeria.Api.Controllers;

[ApiController]
[Route("api/lugares")]
public class LugaresController : ControllerBase
{
    private readonly EnfermeriaDbContext _db;

    public LugaresController(EnfermeriaDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<LugarDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<LugarDto>>> GetAll(
        [FromQuery] bool incluirInactivos = false,
        [FromQuery] string? buscar = null,
        CancellationToken ct = default)
    {
        var query = _db.Lugares.AsNoTracking();

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
            .OrderBy(x => x.Nombre)
            .Select(x => new LugarDto(x.Id, x.Nombre, x.Direccion, x.Activo, x.CreadoEn, x.ActualizadoEn))
            .ToListAsync(ct);

        return Ok(items);
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(LugarDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<LugarDto>> GetById(int id, CancellationToken ct = default)
    {
        var item = await _db.Lugares
            .AsNoTracking()
            .Where(x => x.Id == id)
            .Select(x => new LugarDto(x.Id, x.Nombre, x.Direccion, x.Activo, x.CreadoEn, x.ActualizadoEn))
            .FirstOrDefaultAsync(ct);

        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost]
    [ProducesResponseType(typeof(LugarDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<LugarDto>> Create(LugarCreateDto dto, CancellationToken ct = default)
    {
        var entity = new Lugar
        {
            Nombre = dto.Nombre.Trim(),
            Direccion = string.IsNullOrWhiteSpace(dto.Direccion) ? null : dto.Direccion.Trim(),
            Activo = dto.Activo
        };

        _db.Lugares.Add(entity);
        await _db.SaveChangesAsync(ct);

        var result = ToDto(entity);
        return CreatedAtAction(nameof(GetById), new { id = entity.Id }, result);
    }

    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(LugarDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<LugarDto>> Update(int id, LugarUpdateDto dto, CancellationToken ct = default)
    {
        var entity = await _db.Lugares.FindAsync(new object[] { id }, ct);
        if (entity is null)
        {
            return NotFound();
        }

        entity.Nombre = dto.Nombre.Trim();
        entity.Direccion = string.IsNullOrWhiteSpace(dto.Direccion) ? null : dto.Direccion.Trim();
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
        var entity = await _db.Lugares.FindAsync(new object[] { id }, ct);
        if (entity is null)
        {
            return NotFound();
        }

        _db.Lugares.Remove(entity);
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    private static LugarDto ToDto(Lugar x) =>
        new(x.Id, x.Nombre, x.Direccion, x.Activo, x.CreadoEn, x.ActualizadoEn);
}
