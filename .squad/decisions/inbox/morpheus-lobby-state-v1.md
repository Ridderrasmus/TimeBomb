# Decision: Lobby state schema v1 + null serialization

Date: 2026-02-24

## Context
We need a canonical LobbyState DTO with versioning and normalized nullable fields for UI stability.

## Decision
- Add `Version` to `LobbyStateDto` with `SchemaVersion = 1` in the mapper.
- Expose a canonical `/api/lobby/{lobbyCode}/state` endpoint returning `LobbyStateDto`.
- Set JSON options to always serialize nulls for controllers and SignalR.

## Consequences
- Clients can key off the lobby state schema version.
- Nullable fields are consistently present as `null` in serialized payloads.
