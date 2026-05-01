import { CliFlags } from "../cli/flags.ts";
import { discoverProject } from "../ios/project.ts";
import { runCapture } from "../util/process.ts";
import { runOptionsFromFlags } from "./options.ts";

export async function openCommand(flags: CliFlags): Promise<void> {
  const options = await runOptionsFromFlags(flags);
  const container = await discoverProject(options);
  await runCapture("open", [container.path]);
}
