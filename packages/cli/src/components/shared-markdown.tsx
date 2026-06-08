import { RGBA, SyntaxStyle } from "@opentui/core";

import { useTheme } from "../providers/theme";

type Props = {
  content: string;
  streaming?: boolean;
};

// Build a syntax style from your existing theme colors
const buildSyntaxStyle = (colors: ReturnType<typeof useTheme>["colors"]) =>
  SyntaxStyle.fromStyles({
    "markup.heading.1": { fg: RGBA.fromHex(colors.primary), bold: true },
    "markup.heading.2": { fg: RGBA.fromHex(colors.primary), bold: true },
    "markup.heading.3": { fg: RGBA.fromHex(colors.primary), bold: true },
    "markup.list": { fg: RGBA.fromHex(colors.info ?? "#E6EDF3") },
    "markup.raw": { fg: RGBA.fromHex(colors.info) },
    "markup.bold": { bold: true },
    "markup.italic": { italic: true },
    "markup.strikethrough": { fg: RGBA.fromHex(colors.dimSeparator) },
    keyword: { fg: RGBA.fromHex(colors.planMode), bold: true },
    string: { fg: RGBA.fromHex(colors.success) },
    comment: { fg: RGBA.fromHex(colors.dimSeparator), italic: true },
    number: { fg: RGBA.fromHex(colors.info) },
    function: { fg: RGBA.fromHex(colors.primary) },
    type: { fg: RGBA.fromHex(colors.thinking) },
    operator: { fg: RGBA.fromHex(colors.error) },
    default: { fg: RGBA.fromHex(colors.info ?? "#E6EDF3") },
  });

export const MarkdownRenderer = ({ content, streaming }: Props) => {
  const { colors } = useTheme();
  const syntaxStyle = buildSyntaxStyle(colors);

  return (
    <markdown
      content={content}
      syntaxStyle={syntaxStyle}
      streaming={streaming}
      conceal={true}
      width="100%"
    />
  );
};
