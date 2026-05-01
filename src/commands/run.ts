import { CliFlags } from "../cli/flags.ts";
import { runApp } from "../ios/run.ts";
import { runOptionsFromFlags } from "./options.ts";

// Builds, installs, launches, and optionally streams logs for an app.
export async function runCommand(flags: CliFlags): Promise<void> {
  await runApp(await runOptionsFromFlags(flags));
}
