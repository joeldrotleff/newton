import { discoverProject } from "../ios/project.ts";
import { runCliCommand } from "../util/process.ts";

// Opens the discovered Xcode project/workspace in Xcode.
export async function xcodeCommand(): Promise<void> {
  const container = await discoverProject();
  await runCliCommand("open", [container.path]);
}
