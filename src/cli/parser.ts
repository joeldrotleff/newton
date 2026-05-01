import { fail } from "../util/errors.ts";
import { CliFlags } from "./flags.ts";

export interface ParsedCli {
  command: string;
  flags: CliFlags;
}

export function parseCli(args: string[]): ParsedCli {
  const [command, ...tail] = args;
  if (!command) fail("Missing command. Try newton --help.");

  const { positional, flags } = parseFlags(tail);
  positional.forEach((value, index) => flags[`_arg${index}`] = value);
  return { command, flags };
}

export function parseFlags(args: string[]): { positional: string[]; flags: CliFlags } {
  const positional: string[] = [];
  const flags: CliFlags = {};

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
