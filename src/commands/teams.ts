import { printTable } from "../cli/table.ts";
import { listDevelopmentTeams } from "../ios/signing.ts";

export async function teamsCommand(): Promise<void> {
  const teams = await listDevelopmentTeams();
  if (teams.length === 0) {
    console.log("No Apple Development signing teams found.");
    return;
  }

  printTable(
    ["Team ID", "Organization", "Certificate"],
    teams.map((team) => [team.teamId, team.organization, team.commonName]),
  );
}
