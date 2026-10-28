using Enfermeria.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Enfermeria.Api.Data;

public class EnfermeriaDbContext : DbContext
{
    public EnfermeriaDbContext(DbContextOptions<EnfermeriaDbContext> options)
        : base(options)
    {
    }

    public DbSet<Lugar> Lugares => Set<Lugar>();
    public DbSet<Vacuna> Vacunas => Set<Vacuna>();
    public DbSet<Tiempo> Tiempos => Set<Tiempo>();
    public DbSet<Dosis> Dosis => Set<Dosis>();
    public DbSet<RegistroVacunacion> RegistrosVacunacion => Set<RegistroVacunacion>();

    // Vistas de conteo
    public DbSet<ConteoLugarFecha> ConteosLugarFecha => Set<ConteoLugarFecha>();
    public DbSet<ConteoLugarFechaVacuna> ConteosLugarFechaVacuna => Set<ConteoLugarFechaVacuna>();
    public DbSet<ConteoLugarFechaVacunaDosis> ConteosLugarFechaVacunaDosis => Set<ConteoLugarFechaVacunaDosis>();
    public DbSet<ConteoTotalPorFecha> ConteosTotalPorFecha => Set<ConteoTotalPorFecha>();
    public DbSet<ConteoTotalPorLugar> ConteosTotalPorLugar => Set<ConteoTotalPorLugar>();
    public DbSet<ConteoTotalPorVacuna> ConteosTotalPorVacuna => Set<ConteoTotalPorVacuna>();
    public DbSet<ConteoTotalPorDosis> ConteosTotalPorDosis => Set<ConteoTotalPorDosis>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Lugar>(entity =>
        {
            entity.ToTable("lugares");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Nombre).IsRequired();
            entity.Property(e => e.Activo).HasDefaultValue(true);
            entity.Property(e => e.CreadoEn).HasDefaultValueSql("now()").ValueGeneratedOnAdd();
            entity.Property(e => e.ActualizadoEn).HasDefaultValueSql("now()").ValueGeneratedOnAddOrUpdate();
        });

        modelBuilder.Entity<Vacuna>(entity =>
        {
            entity.ToTable("vacunas");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Nombre).IsRequired();
            entity.Property(e => e.Activo).HasDefaultValue(true);
            entity.Property(e => e.CreadoEn).HasDefaultValueSql("now()").ValueGeneratedOnAdd();
            entity.Property(e => e.ActualizadoEn).HasDefaultValueSql("now()").ValueGeneratedOnAddOrUpdate();
        });

        modelBuilder.Entity<Tiempo>(entity =>
        {
            entity.ToTable("tiempos");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Nombre).IsRequired();
            entity.Property(e => e.Orden).HasDefaultValue(0);
            entity.Property(e => e.Activo).HasDefaultValue(true);
            entity.Property(e => e.CreadoEn).HasDefaultValueSql("now()").ValueGeneratedOnAdd();
            entity.Property(e => e.ActualizadoEn).HasDefaultValueSql("now()").ValueGeneratedOnAddOrUpdate();
        });

        modelBuilder.Entity<Dosis>(entity =>
        {
            entity.ToTable("dosis");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Nombre).IsRequired();
            entity.Property(e => e.Orden).HasDefaultValue(0);
            entity.Property(e => e.Activo).HasDefaultValue(true);
            entity.Property(e => e.CreadoEn).HasDefaultValueSql("now()").ValueGeneratedOnAdd();
            entity.Property(e => e.ActualizadoEn).HasDefaultValueSql("now()").ValueGeneratedOnAddOrUpdate();
        });

        modelBuilder.Entity<RegistroVacunacion>(entity =>
        {
            entity.ToTable("registros_vacunacion");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Fecha).IsRequired();
            entity.Property(e => e.Cantidad).HasDefaultValue(1);
            entity.Property(e => e.CreadoEn).HasDefaultValueSql("now()").ValueGeneratedOnAdd();
            entity.Property(e => e.ActualizadoEn).HasDefaultValueSql("now()").ValueGeneratedOnAddOrUpdate();

            entity.HasOne(e => e.Lugar)
                .WithMany(l => l.Registros)
                .HasForeignKey(e => e.LugarId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Vacuna)
                .WithMany(v => v.Registros)
                .HasForeignKey(e => e.VacunaId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Tiempo)
                .WithMany(t => t.Registros)
                .HasForeignKey(e => e.TiempoId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Dosis)
                .WithMany(d => d.Registros)
                .HasForeignKey(e => e.DosisId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ConteoLugarFecha>(entity =>
        {
            entity.HasNoKey();
            entity.ToView("v_conteo_lugar_fecha");
        });

        modelBuilder.Entity<ConteoLugarFechaVacuna>(entity =>
        {
            entity.HasNoKey();
            entity.ToView("v_conteo_lugar_fecha_vacuna");
        });

        modelBuilder.Entity<ConteoLugarFechaVacunaDosis>(entity =>
        {
            entity.HasNoKey();
            entity.ToView("v_conteo_lugar_fecha_vacuna_dosis");
        });

        modelBuilder.Entity<ConteoTotalPorFecha>(entity =>
        {
            entity.HasNoKey();
            entity.ToView("v_conteo_total_por_fecha");
        });

        modelBuilder.Entity<ConteoTotalPorLugar>(entity =>
        {
            entity.HasNoKey();
            entity.ToView("v_conteo_total_por_lugar");
        });

        modelBuilder.Entity<ConteoTotalPorVacuna>(entity =>
        {
            entity.HasNoKey();
            entity.ToView("v_conteo_total_por_vacuna");
        });

        modelBuilder.Entity<ConteoTotalPorDosis>(entity =>
        {
            entity.HasNoKey();
            entity.ToView("v_conteo_total_por_dosis");
        });
    }
}
