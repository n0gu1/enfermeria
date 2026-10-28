using Enfermeria.Api.Data;
using Enfermeria.Api.Dtos;
using Enfermeria.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Enfermeria.Api.Controllers;

[ApiController]
[Route("api/registros")]
public class RegistrosController : ControllerBase
{
    private readonly EnfermeriaDbContext _db;

    public RegistrosController(EnfermeriaDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<RegistroVacunacionDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<RegistroVacunacionDto>>> GetAll(
        [FromQuery] int? lugarId = null,
        [FromQuery] int? vacunaId = null,
        [FromQuery] int? tiempoId = null,
        [FromQuery] int? dosisId = null,
        [FromQuery] DateOnly? fecha = null,
        [FromQuery] DateOnly? desde = null,
        [FromQuery] DateOnly? hasta = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken ct = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 200);

        var query = _db.RegistrosVacunacion.AsNoTracking();

        if (lugarId.HasValue) query = query.Where(x => x.LugarId == lugarId.Value);
        if (vacunaId.HasValue) query = query.Where(x => x.VacunaId == vacunaId.Value);
        if (tiempoId.HasValue) query = query.Where(x => x.TiempoId == tiempoId.Value);
        if (dosisId.HasValue) query = query.Where(x => x.DosisId == dosisId.Value);
        if (fecha.HasValue) query = query.Where(x => x.Fecha == fecha.Value);
        if (desde.HasValue) query = query.Where(x => x.Fecha >= desde.Value);
        if (hasta.HasValue) query = query.Where(x => x.Fecha <= hasta.Value);

        var total = await query.LongCountAsync(ct);

        var items = await query
            .OrderByDescending(x => x.Fecha)
            .ThenByDescending(x => x.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new RegistroVacunacionDto(
                x.Id,
                x.Fecha,
                x.LugarId,
                x.Lugar!.Nombre,
                x.VacunaId,
                x.Vacuna!.Nombre,
                x.TiempoId,
                x.Tiempo!.Nombre,
                x.Tiempo.Meses,
                x.DosisId,
                x.Dosis!.Nombre,
                x.Cantidad,
                x.Observacion,
                x.CreadoEn,
                x.ActualizadoEn))
            .ToListAsync(ct);

        return Ok(new PagedResult<RegistroVacunacionDto>(page, pageSize, total, items));
    }

    [HttpGet("{id:long}")]
    [ProducesResponseType(typeof(RegistroVacunacionDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<RegistroVacunacionDto>> GetById(long id, CancellationToken ct = default)
    {
        var item = await GetDtoByIdAsync(id, ct);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost]
    [ProducesResponseType(typeof(RegistroVacunacionDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<RegistroVacunacionDto>> Create(RegistroCreateDto dto, CancellationToken ct = default)
    {
        var error = await ValidateReferencesAsync(dto.LugarId, dto.VacunaId, dto.TiempoId, dto.DosisId, ct);
        if (error is not null)
        {
            return BadRequest(new ProblemDetails
            {
                Status = StatusCodes.Status400BadRequest,
                Title = "Referencia inválida",
                Detail = error
            });
        }

        var entity = new RegistroVacunacion
        {
            LugarId = dto.LugarId,
            Fecha = dto.Fecha!.Value,
            VacunaId = dto.VacunaId,
            TiempoId = dto.TiempoId,
            DosisId = dto.DosisId,
            Cantidad = dto.Cantidad,
            Observacion = string.IsNullOrWhiteSpace(dto.Observacion) ? null : dto.Observacion.Trim()
        };

        _db.RegistrosVacunacion.Add(entity);
        await _db.SaveChangesAsync(ct);

        var result = await GetDtoByIdAsync(entity.Id, ct);
        return CreatedAtAction(nameof(GetById), new { id = entity.Id }, result);
    }

    [HttpPut("{id:long}")]
    [ProducesResponseType(typeof(RegistroVacunacionDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<RegistroVacunacionDto>> Update(long id, RegistroUpdateDto dto, CancellationToken ct = default)
    {
        var entity = await _db.RegistrosVacunacion.FindAsync(new object[] { id }, ct);
        if (entity is null)
        {
            return NotFound();
        }

        var error = await ValidateReferencesAsync(dto.LugarId, dto.VacunaId, dto.TiempoId, dto.DosisId, ct);
        if (error is not null)
        {
            return BadRequest(new ProblemDetails
            {
                Status = StatusCodes.Status400BadRequest,
                Title = "Referencia inválida",
                Detail = error
            });
        }

        entity.LugarId = dto.LugarId;
        entity.Fecha = dto.Fecha!.Value;
        entity.VacunaId = dto.VacunaId;
        entity.TiempoId = dto.TiempoId;
        entity.DosisId = dto.DosisId;
        entity.Cantidad = dto.Cantidad;
        entity.Observacion = string.IsNullOrWhiteSpace(dto.Observacion) ? null : dto.Observacion.Trim();

        await _db.SaveChangesAsync(ct);

        var result = await GetDtoByIdAsync(entity.Id, ct);
        return Ok(result);
    }

    [HttpDelete("{id:long}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(long id, CancellationToken ct = default)
    {
        var entity = await _db.RegistrosVacunacion.FindAsync(new object[] { id }, ct);
        if (entity is null)
        {
            return NotFound();
        }

        _db.RegistrosVacunacion.Remove(entity);
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    private async Task<RegistroVacunacionDto?> GetDtoByIdAsync(long id, CancellationToken ct)
    {
        return await _db.RegistrosVacunacion
            .AsNoTracking()
            .Where(x => x.Id == id)
            .Select(x => new RegistroVacunacionDto(
                x.Id,
                x.Fecha,
                x.LugarId,
                x.Lugar!.Nombre,
                x.VacunaId,
                x.Vacuna!.Nombre,
                x.TiempoId,
                x.Tiempo!.Nombre,
                x.Tiempo.Meses,
                x.DosisId,
                x.Dosis!.Nombre,
                x.Cantidad,
                x.Observacion,
                x.CreadoEn,
                x.ActualizadoEn))
            .FirstOrDefaultAsync(ct);
    }

    private async Task<string?> ValidateReferencesAsync(
        int lugarId,
        int vacunaId,
        int tiempoId,
        int dosisId,
        CancellationToken ct)
    {
        if (!await _db.Lugares.AnyAsync(x => x.Id == lugarId, ct))
        {
            return $"El lugar con id {lugarId} no existe.";
        }

        if (!await _db.Vacunas.AnyAsync(x => x.Id == vacunaId, ct))
        {
            return $"La vacuna con id {vacunaId} no existe.";
        }

        if (!await _db.Tiempos.AnyAsync(x => x.Id == tiempoId, ct))
        {
            return $"El tiempo con id {tiempoId} no existe.";
        }

        if (!await _db.Dosis.AnyAsync(x => x.Id == dosisId, ct))
        {
            return $"La dosis con id {dosisId} no existe.";
        }

        return null;
    }
}
