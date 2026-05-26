import "opentui-spinner/react";
import { useTheme } from "../providers/theme";

export const Spinner = () => {
  const { colors } = useTheme();

  return <spinner name="aesthetic" color={colors.primary} />;
};
