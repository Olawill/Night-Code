import type { ModeType, SupportedChatModelId } from "@nightcode/shared";
import type { Message } from "../../hooks/use-chat";
import type { DialogContextValue } from "../../providers/dialog";
import type { ToastContextValue } from "../../providers/toast";

export type CommandContext = {
  exit: () => void;
  toast: ToastContextValue;
  dialog: DialogContextValue;
  navigate: (path: string) => void;
  mode: ModeType;
  setMode: (mode: ModeType) => void;
  setModel: (model: SupportedChatModelId) => void;
  // Session-specific — only available on /sessions/:id
  sessionId?: string;
  getMessages?: () => Message[];
};

export type Command = {
  name: string;
  description: string;
  value: string;
  condition?: (ctx: Pick<CommandContext, "sessionId">) => boolean;
  action?: (ctx: CommandContext) => void | Promise<void>;
};
