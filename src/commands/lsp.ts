import { loadConfig } from "../ios/config.ts";
import { discoverProject } from "../ios/project.ts";
import { defaultDerivedDataPath } from "../ios/project.ts";
import { fail } from "../util/errors.ts";
import { executableExists, runCliCommand } from "../util/process.ts";

// Generates SourceKit-LSP support files via xcode-build-server using the project's newton.json.
export async function lspCommand(): Promise<void> {
  const config = await loadConfig();
  if (!config.scheme) fail("Missing scheme in newton.json. Run `newton init`.");
  if (!await executableExists("xcode-build-server")) {
    fail("Missing xcode-build-server. Install it with:\n  brew install xcode-build-server");
  }

  console.log("Preparing SourceKit-LSP files...");
  const container = await discoverProject();

  console.log("Generating xcode-build-server config...");
  await runCliCommand("xcode-build-server", [
    "config", // Generate buildServer.json for SourceKit-LSP.
    container.kind === "workspace" ? "-workspace" : "-project", // Select workspace/project mode.
    container.path,
    "-scheme", // Use the named Xcode scheme.
    config.scheme,
    "--build_root", // Point xcode-build-server at Newton's derived data root.
    defaultDerivedDataPath(),
  ]);

  console.log("Generated buildServer.json for SourceKit-LSP.");
}
