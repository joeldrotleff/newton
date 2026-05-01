import { CliFlags } from "../cli/flags.ts";
import { discoverProject } from "../ios/project.ts";
import { runCapture } from "../util/process.ts";
import { runOptionsFromFlags } from "./options.ts";

// Opens the discovered or configured Xcode project/workspace.
export async function openCommand(flags: CliFlags): Promise<void> {
  const options = await runOptionsFromFlags(flags);
  const container = await discoverProject(options);
  await runCapture("open", [
    container.path, // Ask macOS to open the selected Xcode project/workspace.
  ]);
}
