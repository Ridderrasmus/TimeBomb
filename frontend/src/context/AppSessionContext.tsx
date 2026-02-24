import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";

import { useGameActions } from "../hooks/useGameActions";
import { useLobbySession } from "../hooks/useLobbySession";

const isDevMode = import.meta.env.DEV;

interface AppSessionContextValue {
  session: ReturnType<typeof useLobbySession>;
  actions: ReturnType<typeof useGameActions>;
  isDevMode: boolean;
}

const AppSessionContext = createContext<AppSessionContextValue | null>(null);

export function AppSessionProvider({ children }: { children: ReactNode }) {
  const session = useLobbySession();
  const actions = useGameActions(session, isDevMode);

  const value = useMemo<AppSessionContextValue>(
    () => ({
      session,
      actions,
      isDevMode,
    }),
    [actions, session],
  );

  return <AppSessionContext.Provider value={value}>{children}</AppSessionContext.Provider>;
}

const useAppSessionContext = () => {
  const value = useContext(AppSessionContext);
  if (!value) {
    throw new Error("useAppSessionContext must be used inside AppSessionProvider.");
  }

  return value;
};

export const useAppSessionState = () => useAppSessionContext().session;
export const useAppSessionActions = () => useAppSessionContext().actions;
export const useAppDevMode = () => useAppSessionContext().isDevMode;
