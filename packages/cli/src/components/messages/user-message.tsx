import { useTheme } from "../../providers/theme";
import { SplitBorder } from "../border";

type Props = {
  message: string;
};

export const UserMessage = ({ message }: Props) => {
  const { colors } = useTheme();

  return (
    <box width="100%" alignItems="center">
      <box
        border={["left"]}
        borderColor={colors.primary}
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
