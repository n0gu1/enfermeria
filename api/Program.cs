using Enfermeria.Api.Data;
using Enfermeria.Api.Middleware;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi;
using Swashbuckle.AspNetCore.SwaggerGen;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
if (string.IsNullOrWhiteSpace(connectionString))
{
    throw new InvalidOperationException(
        "Falta la cadena de conexión 'ConnectionStrings:DefaultConnection'. " +
        "Configúrala con la variable de entorno ConnectionStrings__DefaultConnection.");
}

builder.Services.AddDbContext<EnfermeriaDbContext>(options =>
    options
        .UseNpgsql(connectionString, npgsql => npgsql.EnableRetryOnFailure(3))
        .UseSnakeCaseNamingConvention());

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Enfermería API",
        Version = "v1",
        Description = "API CRUD para el registro y conteo de vacunas aplicadas."
    });
});

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        var origins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>();

        if (origins is { Length: > 0 })
        {
            policy.WithOrigins(origins).AllowAnyHeader().AllowAnyMethod();
        }
        else
        {
            policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
        }
    });
});

var app = builder.Build();

app.UseMiddleware<ExceptionHandlingMiddleware>();

app.UseSwagger();
app.UseSwaggerUI(options =>
{
    options.SwaggerEndpoint("/swagger/v1/swagger.json", "Enfermería API v1");
    options.RoutePrefix = "swagger";
});

app.UseCors();
app.MapControllers();

app.MapGet("/", () => Results.Ok(new
{
    name = "Enfermería API",
    version = "v1",
    swagger = "/swagger",
    health = "/health"
}));

app.MapGet("/health", async (EnfermeriaDbContext db, CancellationToken ct) =>
{
    var canConnect = await db.Database.CanConnectAsync(ct);

    return canConnect
        ? Results.Ok(new
        {
            status = "ok",
            database = "connected",
            timestamp = DateTimeOffset.UtcNow
        })
        : Results.Json(new
        {
            status = "error",
            database = "disconnected",
            timestamp = DateTimeOffset.UtcNow
        }, statusCode: StatusCodes.Status503ServiceUnavailable);
});

app.Run();
