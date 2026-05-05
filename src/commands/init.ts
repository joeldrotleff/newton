import { writeInitialConfig } from "../ios/config.ts";
import { InitCommandOptions } from "./options.ts";

// Creates newton.json from the current Xcode project/workspace and simulator defaults.
export async function initCommand(opts: InitCommandOptions): Promise<void> {
  const config = await writeInitialConfig({ force: opts.force ?? false });
  console.log("Created newton.json");
  console.log(`  scheme: ${config.scheme}`);
  console.log(
    `  ${config.project ? "project" : "workspace"}: ${config.project ?? config.workspace}`,
  );
  console.log(`  preferredSimulator: ${config.preferredSimulator}`);
  console.log("Added .newton/ to .gitignore.");
}
