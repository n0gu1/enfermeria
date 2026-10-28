using Enfermeria.Api.Data;
using Enfermeria.Api.Dtos;
using Enfermeria.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Enfermeria.Api.Controllers;

[ApiController]
[Route("api/vacunas")]
public class VacunasController : ControllerBase
{
    private readonly EnfermeriaDbContext _db;

    public VacunasController(EnfermeriaDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<VacunaDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<VacunaDto>>> GetAll(
        [FromQuery] bool incluirInactivos = false,
        [FromQuery] string? buscar = null,
        CancellationToken ct = default)
    {
        var query = _db.Vacunas.AsNoTracking();

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
            .Select(x => new VacunaDto(x.Id, x.Nombre, x.Descripcion, x.Activo, x.CreadoEn, x.ActualizadoEn))
            .ToListAsync(ct);

        return Ok(items);
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(VacunaDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<VacunaDto>> GetById(int id, CancellationToken ct = default)
    {
        var item = await _db.Vacunas
            .AsNoTracking()
            .Where(x => x.Id == id)
            .Select(x => new VacunaDto(x.Id, x.Nombre, x.Descripcion, x.Activo, x.CreadoEn, x.ActualizadoEn))
            .FirstOrDefaultAsync(ct);

        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost]
    [ProducesResponseType(typeof(VacunaDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<VacunaDto>> Create(VacunaCreateDto dto, CancellationToken ct = default)
    {
        var entity = new Vacuna
        {
            Nombre = dto.Nombre.Trim(),
            Descripcion = string.IsNullOrWhiteSpace(dto.Descripcion) ? null : dto.Descripcion.Trim(),
            Activo = dto.Activo
        };

        _db.Vacunas.Add(entity);
        await _db.SaveChangesAsync(ct);

        var result = ToDto(entity);
        return CreatedAtAction(nameof(GetById), new { id = entity.Id }, result);
    }

    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(VacunaDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<VacunaDto>> Update(int id, VacunaUpdateDto dto, CancellationToken ct = default)
    {
        var entity = await _db.Vacunas.FindAsync(new object[] { id }, ct);
        if (entity is null)
        {
            return NotFound();
        }

        entity.Nombre = dto.Nombre.Trim();
        entity.Descripcion = string.IsNullOrWhiteSpace(dto.Descripcion) ? null : dto.Descripcion.Trim();
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
        var entity = await _db.Vacunas.FindAsync(new object[] { id }, ct);
        if (entity is null)
        {
            return NotFound();
        }

        _db.Vacunas.Remove(entity);
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    private static VacunaDto ToDto(Vacuna x) =>
        new(x.Id, x.Nombre, x.Descripcion, x.Activo, x.CreadoEn, x.ActualizadoEn);
}
