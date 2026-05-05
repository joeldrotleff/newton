import { Table } from "@cliffy/table";
import { listDevelopmentTeams } from "../ios/signing.ts";

// Lists local Apple Development signing teams discovered from certificates.
export async function teamsCommand(): Promise<void> {
  const teams = await listDevelopmentTeams();
  if (teams.length === 0) {
    console.log("No Apple Development signing teams found.");
    return;
  }

  new Table()
    .header(["Team ID", "Organization", "Certificate"])
    .body(teams.map((team) => [team.teamId, team.organization, team.commonName]))
    .padding(2)
    .render();
}
