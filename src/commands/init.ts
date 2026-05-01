import { CliFlags } from "../cli/flags.ts";
import { writeInitialConfig } from "../ios/config.ts";
import { initOptionsFromFlags } from "./options.ts";

export async function initCommand(flags: CliFlags): Promise<void> {
  const options = initOptionsFromFlags(flags);
  const config = await writeInitialConfig({ force: options.force });
  console.log("Created newton.json");
  console.log(`  scheme: ${config.scheme}`);
  console.log(
    `  ${config.project ? "project" : "workspace"}: ${config.project ?? config.workspace}`,
  );
  console.log(`  preferredSimulator: ${config.preferredSimulator}`);
  console.log("Added .newton/ and newton.json to .gitignore.");
}
