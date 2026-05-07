import { loadConfig } from "../ios/config.ts";
import { containerArgs, defaultDerivedDataPath, discoverProject } from "../ios/project.ts";
import { fail } from "../util/errors.ts";
import { join } from "../util/paths.ts";
import { executableExists, runCliCommand, runCliCommandInTerminal } from "../util/process.ts";

// Generates SourceKit-LSP support files via xcode-build-server using the project's newton.json.
export async function lspCommand(): Promise<void> {
  const config = await loadConfig();
  if (!config.scheme) fail("Missing scheme in newton.json. Run `newton init`.");
  if (!await executableExists("xcode-build-server")) {
    fail("Missing xcode-build-server. Install it with:\n  brew install xcode-build-server");
  }

  console.log("Preparing SourceKit-LSP files...");
  const container = await discoverProject();
  const derivedData = defaultDerivedDataPath();

  console.log("Generating xcode-build-server config...");
  await runCliCommand("xcode-build-server", [
    "config",
    container.kind === "workspace" ? "-workspace" : "-project",
    container.path,
    "-scheme",
    config.scheme,
    "--build_root",
    derivedData,
  ]);

  // xcode-build-server (kind: xcode) reads compile flags from xcactivitylog files
  // under <build_root>/Logs/Build. xcodebuild only emits those when -resultBundlePath
  // is set, so a regular `newton build` doesn't populate them.
  const resultBundlePath = join(derivedData, "lsp.xcresult");
  await Deno.remove(resultBundlePath, { recursive: true }).catch(() => {});

  console.log("Building once to emit compile-flags log for SourceKit-LSP...");
  await runCliCommandInTerminal("xcodebuild", [
    "-quiet",
    ...containerArgs(container),
    "-scheme",
    config.scheme,
    "-destination",
    "generic/platform=iOS Simulator",
    "-derivedDataPath",
    derivedData,
    "-resultBundlePath",
    resultBundlePath,
    ...(config.configuration ? ["-configuration", config.configuration] : []),
    "ONLY_ACTIVE_ARCH=YES",
    "CODE_SIGN_IDENTITY=-",
    "build",
  ]);

  console.log("Generated buildServer.json for SourceKit-LSP.");
}
