import { bootSimulator, resolveSimulator } from "../ios/simulator.ts";
import { discoverProject } from "../ios/project.ts";
import { resolveDerivedData, runLspBuild } from "../ios/xcodebuild.ts";
import { fail } from "../util/errors.ts";
import { join } from "../util/paths.ts";
import { executableExists, runCapture } from "../util/process.ts";
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
  const simulator = await resolveSimulator({
    sim: options.sim,
    udid: options.udid,
    idiom: options.idiom,
    appStore: options.appStore,
  });
  await bootSimulator(simulator.udid);

  console.log("Generating xcode-build-server config...");
  await runCapture("xcode-build-server", [
    "config", // Generate buildServer.json for SourceKit-LSP.
    container.kind === "workspace" ? "-workspace" : "-project", // Select workspace/project mode.
    container.path,
    "-scheme", // Use the named Xcode scheme.
    options.scheme,
    "--build_root", // Store xcode-build-server artifacts in the next directory.
    derivedData,
  ]);

  console.log("Building once to extract compiler settings; xcodebuild output is hidden...");
  await runLspBuild({
    ...options,
    container,
    scheme: options.scheme,
    destination: simulator,
    target: "sim",
    derivedData,
  });

  if (opts.sourceRoot) {
    await Deno.copyFile("buildServer.json", join(opts.sourceRoot, "buildServer.json"));
    await Deno.copyFile(".compile", join(opts.sourceRoot, ".compile"));
  }

  console.log("Generated buildServer.json and .compile for SourceKit-LSP.");
}
