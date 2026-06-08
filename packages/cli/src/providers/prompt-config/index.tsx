import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useState } from "react";

import {
  DEFAULT_CHAT_MODEL_ID,
  Mode,
  type ModeType,
  type SupportedChatModelId,
} from "@nightcode/shared";

export type PromptConfigContextValue = {
  mode: ModeType;
  toggleMode: () => void;
  setMode: (mode: ModeType) => void;
  model: SupportedChatModelId;
  setModel: (model: SupportedChatModelId) => void;
};

export const modes: ModeType[] = [
  Mode.BUILD,
  Mode.PLAN,
  Mode.REVIEW,
  Mode.TEST,
  Mode.DOC,
];

const PromptConfigContext = createContext<PromptConfigContextValue | null>(
  null,
);

export const usePromptConfig = (): PromptConfigContextValue => {
  const context = useContext(PromptConfigContext);
  if (!context) {
    throw new Error(
      "usePromptConfig must be used within a PromptConfigProvider",
    );
  }
  return context;
};

export const PromptConfigProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setMode] = useState<ModeType>(Mode.BUILD);
  const [model, setModel] = useState<SupportedChatModelId>(
    DEFAULT_CHAT_MODEL_ID,
  );

  const toggleMode = useCallback(() => {
    setMode((current) => {
      const index = modes.indexOf(current);
      return modes[(index + 1) % modes.length] ?? Mode.BUILD;
    });
  }, []);

  return (
    <PromptConfigContext.Provider
      value={{ mode, toggleMode, setMode, model, setModel }}
    >
      {children}
    </PromptConfigContext.Provider>
  );
};
