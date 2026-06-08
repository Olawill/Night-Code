import "opentui-spinner/react";

import { Mode, type ModeType } from "@nightcode/shared";
import { useTheme } from "../providers/theme";

export const Spinner = ({ mode = Mode.BUILD }: { mode?: ModeType }) => {
  const { getModeColor } = useTheme();

  return <spinner name="aesthetic" color={getModeColor(mode)} />;
};
