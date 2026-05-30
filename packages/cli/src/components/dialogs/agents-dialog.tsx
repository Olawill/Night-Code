import { useCallback } from "react";

import { Mode } from "@nightcode/database/enums";
import { useDialog } from "../../providers/dialog";
import { modes } from "../../providers/prompt-config";
import { DialogSearchList } from "../dialog-search-list";
import { showSentenceCase } from "../messages/bot-message";

type AgentsDialogContentProps = {
  currentMode: Mode;
  onSelectMode: (mode: Mode) => void;
};

export const AgentsDialogContent = ({
  currentMode,
  onSelectMode,
}: AgentsDialogContentProps) => {
  const dialog = useDialog();

  const handleSelect = useCallback(
    (nextMode: Mode) => {
      onSelectMode(nextMode);
      dialog.close();
    },
    [onSelectMode, dialog],
  );

  return (
    <DialogSearchList
      items={modes}
      onSelect={handleSelect}
      filterFn={(item, query) =>
        showSentenceCase(item).toLowerCase().includes(query.toLowerCase())
      }
      renderItem={(item, isSelected) => (
        <text selectable={false} fg={isSelected ? "black" : "white"}>
          {item === currentMode ? "\u0020\u2022\u0020" : "\u0020\u0020\u0020"}
          {showSentenceCase(item)}
        </text>
      )}
      getKey={(item) => showSentenceCase(item)}
      placeholder="Search agents"
      emptyText="No agents found"
    />
  );
};
