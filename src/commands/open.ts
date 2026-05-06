import { discoverProject } from "../ios/project.ts";
import { runCliCommand } from "../util/process.ts";
import { resolveRunOptions, RunCliOptions } from "./options.ts";

// Opens the discovered or configured Xcode project/workspace.
export async function openCommand(opts: RunCliOptions): Promise<void> {
  const options = await resolveRunOptions(opts);
  const container = await discoverProject(options);
  await runCliCommand("open", [
    container.path, // Ask macOS to open the selected Xcode project/workspace.
  ]);
}
