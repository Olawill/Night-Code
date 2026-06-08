import type { ModeType } from "@nightcode/shared";
import { useTheme } from "../../providers/theme";
import { SplitBorder } from "../border";

type Props = {
  message: string;
  mode: ModeType;
};

export const UserMessage = ({ message, mode }: Props) => {
  const { colors, getModeColor } = useTheme();

  return (
    <box width="100%" alignItems="center">
      <box
        border={["left"]}
        borderColor={getModeColor(mode)}
        width="100%"
        customBorderChars={{ ...SplitBorder.customBorderChars }}
      >
        <box
          justifyContent="center"
          paddingX={2}
          paddingY={1}
          backgroundColor={colors.surface}
          width="100%"
        >
          <text>{message}</text>
        </box>
      </box>
    </box>
  );
};
