import { CliFlags } from "../cli/flags.ts";
import { createProject } from "../ios/create.ts";
import { chooseDevelopmentTeam } from "../ios/signing.ts";
import { fail } from "../util/errors.ts";
import { createOptionsFromFlags } from "./options.ts";

export async function createCommand(flags: CliFlags): Promise<void> {
  const options = createOptionsFromFlags(flags);
  if (!options.name) {
    fail(
      "Usage: newton create <name> [--output path] [--bundle-id id] [--team-id id|--no-team]",
    );
  }

  const teamId = options.noTeam ? undefined : options.teamId ?? await chooseDevelopmentTeam();
  const config = await createProject({
    name: options.name,
    output: options.output,
    bundleId: options.bundleId,
    teamId,
  });

  console.log("Created iOS project");
  console.log(`  scheme: ${config.scheme}`);
  console.log(`  project: ${config.project}`);
  if (teamId) console.log(`  developmentTeam: ${teamId}`);
  console.log("Created newton.json and added .newton/ and newton.json to .gitignore.");
}
