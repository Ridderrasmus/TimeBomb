# syntax=docker/dockerfile:1

FROM node:22-alpine AS frontend-build
WORKDIR /src/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS backend-build
WORKDIR /src

COPY nuget.config ./
COPY TimeBomb.Server/TimeBomb.Server.csproj TimeBomb.Server/
RUN dotnet restore TimeBomb.Server/TimeBomb.Server.csproj

COPY TimeBomb.Server/ TimeBomb.Server/
COPY --from=frontend-build /src/frontend/dist/ TimeBomb.Server/wwwroot/
RUN dotnet publish TimeBomb.Server/TimeBomb.Server.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app

COPY --from=backend-build /app/publish/ ./

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "TimeBomb.Server.dll"]