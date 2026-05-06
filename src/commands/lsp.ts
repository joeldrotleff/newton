import { discoverProject } from "../ios/project.ts";
import { resolveDerivedData } from "../ios/xcodebuild.ts";
import { fail } from "../util/errors.ts";
import { join } from "../util/paths.ts";
import { executableExists, runCliCommand } from "../util/process.ts";
import { LspCliOptions, resolveRunOptions } from "./options.ts";

// Generates SourceKit-LSP support files via xcode-build-server.
export async function lspCommand(opts: LspCliOptions): Promise<void> {
  const options = await resolveRunOptions(opts);
  if (!options.scheme) fail("Missing required --scheme <name>.");
  if (!await executableExists("xcode-build-server")) {
    fail("Missing xcode-build-server. Install it with:\n  brew install xcode-build-server");
  }

  console.log("Preparing SourceKit-LSP files...");
  const container = await discoverProject(options);
  const derivedData = resolveDerivedData(options.derivedData);

  console.log("Generating xcode-build-server config...");
  await runCliCommand("xcode-build-server", [
    "config", // Generate buildServer.json for SourceKit-LSP.
    container.kind === "workspace" ? "-workspace" : "-project", // Select workspace/project mode.
    container.path,
    "-scheme", // Use the named Xcode scheme.
    options.scheme,
    "--build_root", // Point xcode-build-server at Newton's derived data root.
    derivedData,
  ]);

  if (opts.sourceRoot) {
    await Deno.copyFile("buildServer.json", join(opts.sourceRoot, "buildServer.json"));
  }

  console.log("Generated buildServer.json for SourceKit-LSP.");
}
