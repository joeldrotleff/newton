import { fail } from "./util/errors.ts";
import { handleInit, handleIos } from "./ios/commands.ts";

export interface ParsedCli {
  root: string;
  command?: string;
  flags: Record<string, string | boolean | string[]>;
}

export async function runCli(args: string[]): Promise<void> {
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) return printHelp();
  const [root, command, ...rest] = args;
  const { positional, flags } = parseFlags(rest);
  positional.forEach((value, index) => flags[`_arg${index}`] = value);

  if (root === "init") return handleInit(flags);
  if (root === "ios") return handleIos(command, flags);
  fail(`Unknown command '${root}'. Try newton --help.`);
}

export function parseFlags(
  args: string[],
): { positional: string[]; flags: Record<string, string | boolean | string[]> } {
  const positional: string[] = [];
  const flags: Record<string, string | boolean | string[]> = {};

  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (!arg.startsWith("--")) {
      positional.push(arg);
      continue;
    }

    const [rawName, inlineValue] = arg.slice(2).split("=", 2);
    const name = rawName;
    const next = args[index + 1];
    const value = inlineValue ?? (next && !next.startsWith("--") ? args[++index] : true);

    if (flags[name] === undefined) flags[name] = value;
    else if (Array.isArray(flags[name])) (flags[name] as string[]).push(String(value));
    else flags[name] = [String(flags[name]), String(value)];
  }

  return { positional, flags };
}

function printHelp(): void {
  console.log(`Newton iOS CLI

Usage:
  newton init [--force]
  newton ios sims [--idiom iphone|ipad] [--app-store iphone|ipad]
  newton ios devices
  newton ios build --scheme <scheme> [--project path|--workspace path]
  newton ios run --scheme <scheme> [--sim name] [--target sim|device] [--no-logs]
  newton ios screenshot [--output path] [--display inline|open|none]
  newton ios preview <name> --scheme <scheme> [--display inline|open|none]
  newton ios lsp --scheme <scheme> [--source-root path]
`);
}
