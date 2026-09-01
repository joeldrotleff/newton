import { runApp } from "../ios/run.ts";
import { resolveRunOptions, RunCliOptions } from "./options.ts";

// Builds, installs, launches, and optionally streams logs for an app.
export async function runCommand(opts: RunCliOptions, appArgs: string[] = []): Promise<void> {
  await runApp(await resolveRunOptions(opts, appArgs));
}
