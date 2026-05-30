import { TextAttributes } from "@opentui/core";

import { usePromptConfig } from "../providers/prompt-config";
import { useTheme } from "../providers/theme";
import { showSentenceCase } from "./messages/bot-message";

export const StatusBar = () => {
  const { colors, getModeColor } = useTheme();
  const { mode, model } = usePromptConfig();

  return (
    <box flexDirection="row" gap={1}>
      <text fg={getModeColor(mode)}>{showSentenceCase(mode)}</text>
      <text attributes={TextAttributes.DIM} fg={colors.dimSeparator}>
        &raquo;
      </text>
      <text>{model}</text>
    </box>
  );
};
