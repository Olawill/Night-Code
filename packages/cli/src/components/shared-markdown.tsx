import { TextAttributes } from "@opentui/core";
import { marked, type Token, type Tokens } from "marked";

import type { ModeType } from "@nightcode/shared";
import { useTheme } from "../providers/theme";
import { SplitBorder } from "./border";

type Props = {
  content: string;
  mode: ModeType;
};

const renderInlineTokens = (tokens: Token[]): React.ReactNode => {
  return tokens
    .map((token, i) => {
      switch (token.type) {
        case "text":
          return <text key={i}>{token.text}</text>;
        case "strong":
          return (
            <text key={i} attributes={TextAttributes.BOLD}>
              {token.text}
            </text>
          );
        case "em":
          return (
            <text key={i} attributes={TextAttributes.ITALIC}>
              {token.text}
            </text>
          );
        case "codespan":
          return (
            <text
              key={i}
              attributes={TextAttributes.BOLD}
            >{`\`${token.text}\``}</text>
          );
        case "link":
          return (
            <text key={i} attributes={TextAttributes.UNDERLINE}>
              {token.text || token.href}
            </text>
          );
        case "image":
          return <text key={i}>{`[image: ${token.text || token.href}]`}</text>;
        case "del":
          return (
            <text key={i} attributes={TextAttributes.DIM}>
              {token.text}
            </text>
          );
        case "br":
          return <text key={i}>{"\n"}</text>;
        case "escape":
          return <text key={i}>{token.text}</text>;
        case "html":
        case "tag":
          return null;
        default:
          return "raw" in token ? <text key={i}>{token.raw}</text> : null;
      }
    })
    .filter(Boolean);
};

const MarkdownToken = ({
  token,
  index,
  mode,
}: {
  token: Token;
  index: number;
  mode: ModeType;
}) => {
  const { getModeColor } = useTheme();

  switch (token.type) {
    case "heading": {
      const t = token as Tokens.Heading;
      return (
        <box key={index} marginTop={index === 0 ? 0 : 1} marginBottom={1}>
          <text
            attributes={
              t.depth === 1 ? TextAttributes.BOLD : TextAttributes.BOLD
            }
          >
            {t.text}
          </text>
        </box>
      );
    }

    case "paragraph": {
      const t = token as Tokens.Paragraph;
      return (
        <box key={index} flexDirection="row" flexWrap="wrap" marginBottom={1}>
          {t.tokens ? renderInlineTokens(t.tokens) : <text>{t.text}</text>}
        </box>
      );
    }

    case "code": {
      const t = token as Tokens.Code;
      return (
        <box
          key={index}
          flexDirection="column"
          marginY={1}
          borderStyle="rounded"
          width="100%"
        >
          {/* Language bar */}
          <box paddingX={1} border={["bottom"]}>
            <text attributes={TextAttributes.DIM}>
              {t.lang ? t.lang : "plaintext"}
            </text>
          </box>
          {/* Code content */}
          <box paddingX={1} paddingY={1}>
            <text>{t.text}</text>
          </box>
        </box>
      );
    }

    case "codespan": {
      const t = token as Tokens.Codespan;
      return (
        <text
          key={index}
          attributes={TextAttributes.BOLD}
        >{`\`${t.text}\``}</text>
      );
    }

    case "blockquote": {
      const t = token as Tokens.Blockquote;
      return (
        <box
          key={index}
          flexDirection="column"
          paddingLeft={2}
          border={["left"]}
          borderColor={getModeColor(mode)}
          customBorderChars={{
            ...SplitBorder.customBorderChars,
          }}
        >
          <text attributes={TextAttributes.DIM}>{"▌ "}</text>
          {t.tokens ? (
            t.tokens.map((child, i) => (
              <MarkdownToken key={i} token={child} index={i} mode={mode} />
            ))
          ) : (
            <text>{t.text}</text>
          )}
        </box>
      );
    }

    case "list": {
      const t = token as Tokens.List;
      return (
        <box key={index} flexDirection="column" marginY={1}>
          {t.items.map((item: Tokens.ListItem, i: number) => (
            <box key={i} flexDirection="row" gap={1}>
              <text attributes={TextAttributes.DIM} flexShrink={0}>
                {t.ordered ? `${(t.start || 1) + i}.` : "•"}
              </text>
              <box flexDirection="column" flexGrow={1}>
                {item.tokens ? (
                  item.tokens.map((child, j) => (
                    <MarkdownToken
                      key={j}
                      token={child}
                      index={j}
                      mode={mode}
                    />
                  ))
                ) : (
                  <text>{item.text}</text>
                )}
                {item.task ? (
                  <text attributes={TextAttributes.DIM}>
                    {item.checked ? "[x] " : "[ ] "}
                  </text>
                ) : null}
              </box>
            </box>
          ))}
        </box>
      );
    }

    case "table": {
      const t = token as Tokens.Table;
      return (
        <box key={index} flexDirection="column" marginY={1}>
          {/* Header */}
          <box flexDirection="row" gap={2}>
            {t.header.map((cell, i) => (
              <text key={i} attributes={TextAttributes.BOLD} flexGrow={1}>
                {cell.text}
              </text>
            ))}
          </box>
          <text attributes={TextAttributes.DIM}>{"─".repeat(40)}</text>
          {/* Rows */}
          {t.rows.map((row, i) => (
            <box key={i} flexDirection="row" gap={2}>
              {row.map((cell, j) => (
                <text key={j} flexGrow={1}>
                  {cell.text}
                </text>
              ))}
            </box>
          ))}
        </box>
      );
    }

    case "strong": {
      const t = token as Tokens.Strong;
      return (
        <text key={index} attributes={TextAttributes.BOLD}>
          {t.tokens
            ? t.tokens
                .map((tok) =>
                  "text" in tok ? tok.text : "raw" in tok ? tok.raw : "",
                )
                .join("")
            : t.text}
        </text>
      );
    }

    case "em": {
      const t = token as Tokens.Em;
      return (
        <text key={index} attributes={TextAttributes.ITALIC}>
          {t.tokens
            ? t.tokens
                .map((tok) =>
                  "text" in tok ? tok.text : "raw" in tok ? tok.raw : "",
                )
                .join("")
            : t.text}
        </text>
      );
    }

    case "del": {
      const t = token as Tokens.Del;
      return (
        <text key={index} attributes={TextAttributes.DIM}>
          {t.tokens
            ? t.tokens
                .map((tok) =>
                  "text" in tok ? tok.text : "raw" in tok ? tok.raw : "",
                )
                .join("")
            : t.text}
        </text>
      );
    }

    case "link": {
      const t = token as Tokens.Link;
      return (
        <text key={index} attributes={TextAttributes.UNDERLINE}>
          {t.text || t.href}
        </text>
      );
    }

    case "image": {
      const t = token as Tokens.Image;
      return (
        <text key={index} attributes={TextAttributes.DIM}>
          {`[image: ${t.text || t.href}]`}
        </text>
      );
    }

    case "hr":
      return (
        <text key={index} attributes={TextAttributes.DIM}>
          {"─".repeat(40) + "\n"}
        </text>
      );

    case "space":
      // return <text key={index}>{"\n"}</text>;
      return null;

    case "br":
      return <text key={index}>{"\n"}</text>;

    case "text": {
      const t = token as Tokens.Text;
      if (t.tokens) {
        return (
          <box key={index} flexDirection="row" flexWrap="wrap">
            {renderInlineTokens(t.tokens)}
          </box>
        );
      }
      return <text key={index}>{t.text}</text>;
    }

    case "escape": {
      const t = token as Tokens.Escape;
      return <text key={index}>{t.text}</text>;
    }

    case "def":
    case "html":
    case "tag":
      // Not renderable in terminal
      return null;

    default:
      return "raw" in token ? <text key={index}>{token.raw}</text> : null;
  }
};

export const MarkdownRenderer = ({ content, mode }: Props) => {
  const tokens = marked.lexer(content);

  return (
    <box flexDirection="column">
      {tokens.map((token, i) => (
        <MarkdownToken key={i} token={token} index={i} mode={mode} />
      ))}
    </box>
  );
};
