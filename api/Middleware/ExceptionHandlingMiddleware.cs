using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Enfermeria.Api.Middleware;

public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException pg)
        {
            _logger.LogWarning(ex, "Error de PostgreSQL. SqlState={SqlState}, Constraint={Constraint}", pg.SqlState, pg.ConstraintName);

            var (status, title, detail) = pg.SqlState switch
            {
                "23503" => (
                    StatusCodes.Status409Conflict,
                    "Conflicto de referencia",
                    "No se puede completar la operación porque el registro está referenciado por otros datos o la referencia no existe."),
                "23505" => (
                    StatusCodes.Status409Conflict,
                    "Valor duplicado",
                    "Ya existe un registro con ese nombre."),
                "23514" => (
                    StatusCodes.Status400BadRequest,
                    "Valor inválido",
                    "Los datos no cumplen una restricción de la base de datos."),
                _ => (
                    StatusCodes.Status500InternalServerError,
                    "Error de base de datos",
                    "Ocurrió un error al guardar los datos.")
            };

            await WriteProblemAsync(context, status, title, detail);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Excepción no controlada");
            await WriteProblemAsync(
                context,
                StatusCodes.Status500InternalServerError,
                "Error interno",
                "Ocurrió un error inesperado al procesar la solicitud.");
        }
    }

    private static async Task WriteProblemAsync(HttpContext context, int status, string title, string detail)
    {
        if (context.Response.HasStarted)
        {
            return;
        }

        context.Response.Clear();
        context.Response.StatusCode = status;
        context.Response.ContentType = "application/problem+json";

        await context.Response.WriteAsJsonAsync(new ProblemDetails
        {
            Status = status,
            Title = title,
            Detail = detail,
            Instance = context.Request.Path
        });
    }
}
