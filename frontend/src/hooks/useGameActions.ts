import { useCallback } from "react";
import type { FormEvent } from "react";

import { lobbyApi } from "../services/lobbyApi";
import type { RulesDraft, WireColor } from "../types/game";
import type { LobbySession } from "./useLobbySession";

export interface GameActions {
  submit: (event: FormEvent) => Promise<void>;
  saveRules: (draftToSave: RulesDraft, silentIncompleteSelection?: boolean) => Promise<void>;
  toggleSelectedBombColor: (color: WireColor) => void;
  startGame: () => Promise<void>;
  spawnDebugPlayers: () => Promise<void>;
  revealWire: (targetPlayerId: string) => Promise<void>;
  submitPendingDecision: () => Promise<void>;
  markRoundReady: () => Promise<void>;
  leaveLobby: () => Promise<void>;
}

export function useGameActions(session: LobbySession, isDevMode: boolean): GameActions {
  const submit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();

      if (!session.playerName.trim()) {
        session.setError("Player name is required.");
        return;
      }

      if (session.mode === "join" && !session.lobbyCode.trim()) {
        session.setError("Lobby code is required when joining.");
        return;
      }

      session.setBusy(true);
      session.setError(null);

      try {
        const normalizedPlayerName = session.playerName.trim();
        const data =
          session.mode === "create"
            ? await lobbyApi.createLobby({
                lobbyName: session.lobbyName.trim() || "New Lobby",
                playerName: normalizedPlayerName,
                playerId: session.playerId,
              })
            : await lobbyApi.joinLobby(session.lobbyCode.trim(), {
                playerName: normalizedPlayerName,
                playerId: session.playerId,
              });

        session.setCurrentLobby(data);
      } catch (err) {
        session.setCurrentLobby(null);
        session.setError(
          err instanceof Error ? err.message : "Unable to complete request.",
        );
      } finally {
        session.setBusy(false);
      }
    },
    [session],
  );

  const saveRules = useCallback(
    async (draftToSave: RulesDraft, silentIncompleteSelection = false) => {
      if (!session.currentLobby || !session.isCreator) {
        return;
      }

      const draftSelectedCount = draftToSave.selectedBombColors?.length ?? 0;

      if (
        !draftToSave.randomizeCardColors &&
        draftSelectedCount !== session.requiredColorCount
      ) {
        if (!silentIncompleteSelection) {
          session.setError(
            `Select exactly ${session.requiredColorCount} colors when randomization is disabled.`,
          );
        }
        return;
      }

      session.setBusy(true);
      session.setError(null);
      try {
        await lobbyApi.saveRules(session.currentLobby.lobbyCode, session.playerId, draftToSave);
        await session.hubServiceRef.current?.requestLobbyState(session.currentLobby.lobbyCode);
      } catch (err) {
        session.setError(err instanceof Error ? err.message : "Unable to save rules.");
      } finally {
        session.setBusy(false);
      }
    },
    [session],
  );

  const toggleSelectedBombColor = useCallback(
    (color: WireColor) => {
      if (!session.rulesDraft) {
        return;
      }

      const current = new Set(session.rulesDraft.selectedBombColors ?? []);
      if (current.has(color)) {
        current.delete(color);
      } else {
        if (current.size >= session.requiredColorCount) {
          return;
        }

        current.add(color);
      }

      const nextDraft = {
        ...session.rulesDraft,
        selectedBombColors: Array.from(current),
      };

      session.setRulesDraft(nextDraft);
      void saveRules(nextDraft, true);
    },
    [saveRules, session],
  );

  const startGame = useCallback(async () => {
    if (!session.currentLobby || !session.isCreator) {
      return;
    }

    session.setBusy(true);
    session.setError(null);
    try {
      await session.hubServiceRef.current?.startGame(
        session.currentLobby.lobbyCode,
        session.playerId,
      );
      await session.refreshPrivateState(session.currentLobby.lobbyCode);
    } catch (err) {
      session.setError(err instanceof Error ? err.message : "Unable to start game.");
    } finally {
      session.setBusy(false);
    }
  }, [session]);

  const spawnDebugPlayers = useCallback(async () => {
    if (!session.currentLobby || !session.isCreator || !isDevMode) {
      return;
    }

    session.setBusy(true);
    session.setError(null);
    try {
      await lobbyApi.spawnDebugPlayers(session.currentLobby.lobbyCode);
      await session.hubServiceRef.current?.requestLobbyState(session.currentLobby.lobbyCode);
      await session.refreshPrivateState(session.currentLobby.lobbyCode);
    } catch (err) {
      session.setError(err instanceof Error ? err.message : "Unable to add debug users.");
    } finally {
      session.setBusy(false);
    }
  }, [isDevMode, session]);

  const revealWire = useCallback(
    async (targetPlayerId: string) => {
      if (!session.currentLobby) {
        return;
      }

      session.setBusy(true);
      session.setError(null);
      try {
        await session.hubServiceRef.current?.revealWire(
          session.currentLobby.lobbyCode,
          session.playerId,
          targetPlayerId,
        );
        await session.refreshPrivateState(session.currentLobby.lobbyCode);
      } catch (err) {
        session.setError(err instanceof Error ? err.message : "Unable to reveal wire.");
      } finally {
        session.setBusy(false);
      }
    },
    [session],
  );

  const resolvePendingDecision = useCallback(
    async (selectedColor: WireColor) => {
      if (!session.currentLobby) {
        return;
      }

      session.setBusy(true);
      session.setError(null);
      try {
        await session.hubServiceRef.current?.resolvePendingDecision(
          session.currentLobby.lobbyCode,
          session.playerId,
          selectedColor,
        );
        await session.refreshPrivateState(session.currentLobby.lobbyCode);
      } catch (err) {
        session.setError(
          err instanceof Error
            ? err.message
            : "Unable to resolve pending decision.",
        );
      } finally {
        session.setBusy(false);
      }
    },
    [session],
  );

  const submitPendingDecision = useCallback(async () => {
    if (!session.selectedPendingDecisionColor) {
      return;
    }

    await resolvePendingDecision(session.selectedPendingDecisionColor);
  }, [resolvePendingDecision, session.selectedPendingDecisionColor]);

  const markRoundReady = useCallback(async () => {
    if (!session.currentLobby) {
      return;
    }

    session.setBusy(true);
    session.setError(null);
    try {
      await session.hubServiceRef.current?.markRoundReady(
        session.currentLobby.lobbyCode,
        session.playerId,
      );
      await session.refreshPrivateState(session.currentLobby.lobbyCode);
    } catch (err) {
      session.setError(
        err instanceof Error ? err.message : "Unable to mark ready for round.",
      );
    } finally {
      session.setBusy(false);
    }
  }, [session]);

  const leaveLobby = useCallback(async () => {
    if (!session.currentLobby) {
      return;
    }

    session.setBusy(true);
    session.setError(null);
    try {
      await lobbyApi.leaveLobby(session.currentLobby.lobbyCode, session.playerId);

      try {
        await session.hubServiceRef.current?.leaveLobbyChannel(session.currentLobby.lobbyCode);
      } catch {
        // Channel leave is best effort because HTTP leave already completed.
      }

      session.setCurrentLobby(null);
      session.setLiveLobby(null);
      session.setPrivateState(null);
      session.setRulesDraft(null);
    } catch (err) {
      session.setError(err instanceof Error ? err.message : "Unable to leave lobby.");
    } finally {
      session.setBusy(false);
    }
  }, [session]);

  return {
    submit,
    saveRules,
    toggleSelectedBombColor,
    startGame,
    spawnDebugPlayers,
    revealWire,
    submitPendingDecision,
    markRoundReady,
    leaveLobby,
  };
}
