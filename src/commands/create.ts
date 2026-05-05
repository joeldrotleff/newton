import { createProject } from "../ios/create.ts";
import { chooseDevelopmentTeam } from "../ios/signing.ts";
import { CreateCommandOptions } from "./options.ts";

// Creates a starter SwiftUI iOS project and writes its Newton config.
export async function createCommand(name: string, opts: CreateCommandOptions): Promise<void> {
  // cliffy maps `--no-team` to `team: false`; default is undefined/true.
  const noTeam = opts.team === false;
  const teamId = noTeam ? undefined : opts.teamId ?? await chooseDevelopmentTeam();
  const config = await createProject({
    name,
    output: opts.output,
    bundleId: opts.bundleId,
    teamId,
  });

  console.log("Created iOS project");
  console.log(`  scheme: ${config.scheme}`);
  console.log(`  project: ${config.project}`);
  if (teamId) console.log(`  developmentTeam: ${teamId}`);
  console.log("Created newton.json and added .newton/ to .gitignore.");
}
