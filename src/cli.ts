import { printHelp } from "./cli/help.ts";
import { parseCli, parseFlags } from "./cli/parser.ts";
import { handleCommand } from "./commands/index.ts";

export { parseCli, parseFlags };
export type { ParsedCli } from "./cli/parser.ts";

export async function runCli(args: string[]): Promise<void> {
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) return printHelp();

  const parsed = parseCli(args);
  return handleCommand(parsed.command, parsed.flags);
}
