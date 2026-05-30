import "opentui-spinner/react";

import { Mode } from "@nightcode/database/enums";
import { useTheme } from "../providers/theme";

export const Spinner = ({ mode = Mode.BUILD }: { mode?: Mode }) => {
  const { colors, getModeColor } = useTheme();

  return <spinner name="aesthetic" color={getModeColor(mode)} />;
};
