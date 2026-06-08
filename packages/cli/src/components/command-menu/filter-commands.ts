import { COMMANDS } from "./commands";
import type { Command, CommandContext } from "./types";

export const getFilterCommands = (
  query: string,
  ctx: Pick<CommandContext, "sessionId"> = { sessionId: undefined },
): Command[] => {
  // if (query.length === 0) return COMMANDS;

  // return COMMANDS.filter((cmd) =>
  //   cmd.name.toLowerCase().startsWith(query.toLowerCase()),
  // );

  return COMMANDS.filter((cmd) => {
    // Apply condition if present
    if (cmd.condition && !cmd.condition(ctx)) return false;
    // Apply text filter
    if (!query) return true;
    return (
      cmd.name.toLowerCase().includes(query.toLowerCase()) ||
      cmd.description.toLowerCase().includes(query.toLowerCase())
    );
  });
};
