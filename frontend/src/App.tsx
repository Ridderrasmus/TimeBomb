import { Suspense, lazy } from "react";

import "./App.css";
import { GameScreen } from "./components/GameScreen";
import { LobbySetupForm } from "./components/LobbySetupForm";
import { LobbyScreen } from "./components/LobbyScreen";
import { VictoryScreen } from "./components/VictoryScreen";
import {
  AppSessionProvider,
  useAppDevMode,
  useAppSessionActions,
  useAppSessionState,
} from "./context/AppSessionContext";
import {
  selectActiveGameUiProps,
  selectGameScreenProps,
  selectLobbyScreenProps,
  selectVictoryScreenProps,
} from "./selectors/appSelectors";

const DevTestGallery = lazy(() =>
  import("./TestGallery").then((module) => ({ default: module.TestGallery })),
);

function AppContent() {
  const session = useAppSessionState();
  const actions = useAppSessionActions();
  const isDevMode = useAppDevMode();

  if (session.currentLobby) {
    const activeGameUiProps = selectActiveGameUiProps(session, actions);
    const victoryScreenProps = selectVictoryScreenProps(session, actions);
    const lobbyState = session.activeLobby?.state ?? session.currentLobby.state;

    if (victoryScreenProps) {
      return (
        <div className="app">
          <VictoryScreen {...victoryScreenProps} />
        </div>
      );
    }

    if (lobbyState === "InProgress" && activeGameUiProps) {
      const gameScreenProps = selectGameScreenProps(
        session,
        actions,
        activeGameUiProps,
      );

      return (
        <div className="app">
          <GameScreen {...gameScreenProps} />
        </div>
      );
    }

    const lobbyScreenProps = selectLobbyScreenProps(session, actions, isDevMode);

    return (
      <div className="app">
        <LobbyScreen {...lobbyScreenProps} />
      </div>
    );
  }

  if (isDevMode && session.showGallery) {
    return (
      <Suspense fallback={<div className="app" />}>
        <DevTestGallery />
      </Suspense>
    );
  }

  return (
    <div className="app">
      <LobbySetupForm
        playerName={session.playerName}
        lobbyName={session.lobbyName}
        lobbyCode={session.lobbyCode}
        mode={session.mode}
        busy={session.busy}
        error={session.error}
        onSubmit={(event) => {
          void actions.submit(event);
        }}
        onPlayerNameChange={session.setPlayerName}
        onLobbyNameChange={session.setLobbyName}
        onLobbyCodeChange={session.setLobbyCode}
        onModeChange={session.setMode}
      />
    </div>
  );
}

function App() {
  return (
    <AppSessionProvider>
      <AppContent />
    </AppSessionProvider>
  );
}

export default App;
