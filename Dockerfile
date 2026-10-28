FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ["api/Enfermeria.Api.csproj", "api/"]
RUN dotnet restore "api/Enfermeria.Api.csproj"

COPY api/ api/
RUN dotnet publish "api/Enfermeria.Api.csproj" \
    -c Release \
    -o /app/publish \
    /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app

COPY --from=build /app/publish .

ENV ASPNETCORE_ENVIRONMENT=Production
ENV PORT=10000
EXPOSE 10000

ENTRYPOINT ["sh", "-c", "dotnet Enfermeria.Api.dll --urls http://0.0.0.0:${PORT:-10000}"]
