import type { LobbyResponse, RulesDraft } from "../types/game";

interface ProblemDetails {
  detail?: unknown;
}

const parseErrorMessage = async (response: Response) => {
  const problem = (await response.json().catch(() => null)) as ProblemDetails | null;
  return typeof problem?.detail === "string"
    ? problem.detail
    : `Request failed with status ${response.status}`;
};

const ensureSuccess = async (response: Response) => {
  if (response.ok) {
    return;
  }

  throw new Error(await parseErrorMessage(response));
};

export interface UpsertLobbyRequest {
  playerName: string;
  playerId: string;
}

export const lobbyApi = {
  async createLobby(request: UpsertLobbyRequest & { lobbyName: string }) {
    const response = await fetch("/api/lobby", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    await ensureSuccess(response);
    return (await response.json()) as LobbyResponse;
  },

  async joinLobby(lobbyCode: string, request: UpsertLobbyRequest) {
    const response = await fetch(`/api/lobby/${lobbyCode}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    await ensureSuccess(response);
    return (await response.json()) as LobbyResponse;
  },

  async saveRules(lobbyCode: string, playerId: string, draft: RulesDraft) {
    const response = await fetch(`/api/lobby/${lobbyCode}/rules`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerId,
        variant: draft.variant,
        randomizeCardColors: draft.randomizeCardColors,
        selectedBombColors: draft.selectedBombColors,
      }),
    });

    await ensureSuccess(response);
  },

  async spawnDebugPlayers(lobbyCode: string) {
    const response = await fetch(`/api/lobby/${lobbyCode}/debug/spawn-players`, {
      method: "POST",
    });

    await ensureSuccess(response);
  },

  async leaveLobby(lobbyCode: string, playerId: string) {
    const response = await fetch(`/api/lobby/${lobbyCode}/leave`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId }),
    });

    if (!response.ok && response.status !== 204) {
      throw new Error(await parseErrorMessage(response));
    }
  },

  async kickPlayer(lobbyCode: string, requesterPlayerId: string, targetPlayerId: string) {
    const response = await fetch(`/api/lobby/${lobbyCode}/kick`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requesterPlayerId, targetPlayerId }),
    });

    await ensureSuccess(response);
  },
};