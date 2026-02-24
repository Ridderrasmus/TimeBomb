import { HubConnectionBuilder, LogLevel } from "@microsoft/signalr";

import type {
  LobbyStateDto,
  PlayerPrivateStateDto,
  WireColor,
} from "../types/game";

interface ConnectOptions {
  onLobbyStateUpdated: (state: LobbyStateDto) => void;
  onConnectError: () => void;
  onReconnectError: () => void;
  onReconnected: () => Promise<void> | void;
}

export class GameHubService {
  private connection: ReturnType<HubConnectionBuilder["build"]> | null = null;
  private lobbyCode: string | null = null;

  async connect(lobbyCode: string, options: ConnectOptions) {
    await this.disconnect();

    this.lobbyCode = lobbyCode;
    const connection = new HubConnectionBuilder()
      .withUrl("/hubs/game")
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    this.connection = connection;

    connection.on("LobbyStateUpdated", (state: LobbyStateDto) => {
      options.onLobbyStateUpdated(state);
    });

    connection.onreconnected(async () => {
      try {
        if (!this.lobbyCode) {
          return;
        }

        await connection.invoke("JoinLobbyChannel", this.lobbyCode);
        await options.onReconnected();
      } catch {
        options.onReconnectError();
      }
    });

    try {
      await connection.start();
      await connection.invoke("JoinLobbyChannel", lobbyCode);
    } catch {
      options.onConnectError();
      throw new Error("Unable to connect to game server.");
    }
  }

  async disconnect() {
    if (!this.connection) {
      this.lobbyCode = null;
      return;
    }

    const connection = this.connection;
    this.connection = null;
    this.lobbyCode = null;

    connection.off("LobbyStateUpdated");
    await connection.stop();
  }

  async leaveLobbyChannel(lobbyCode: string) {
    await this.connection?.invoke("LeaveLobbyChannel", lobbyCode);
  }

  async requestLobbyState(lobbyCode: string) {
    await this.connection?.invoke("RequestLobbyState", lobbyCode);
  }

  async requestPrivateState(lobbyCode: string, playerId: string) {
    return (await this.connection?.invoke(
      "RequestPrivateState",
      lobbyCode,
      playerId,
    )) as PlayerPrivateStateDto;
  }

  async startGame(lobbyCode: string, playerId: string) {
    await this.connection?.invoke("StartGame", lobbyCode, playerId);
  }

  async revealWire(lobbyCode: string, playerId: string, targetPlayerId: string) {
    await this.connection?.invoke(
      "RevealWire",
      lobbyCode,
      playerId,
      targetPlayerId,
    );
  }

  async resolvePendingDecision(lobbyCode: string, playerId: string, selectedColor: WireColor) {
    await this.connection?.invoke(
      "ResolvePendingDecision",
      lobbyCode,
      playerId,
      selectedColor,
    );
  }

  async markRoundReady(lobbyCode: string, playerId: string) {
    await this.connection?.invoke("MarkRoundReady", lobbyCode, playerId);
  }
}