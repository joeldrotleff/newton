import { containerArgs, defaultDerivedDataPath, XcodeContainer } from "./project.ts";
import { IOSDevice } from "./device.ts";
import { SimulatorDevice } from "./simulator.ts";
import { runCapture, runInherit, runPipe } from "../util/process.ts";
import { BuildLogger, getTimestampedLogPath } from "../util/spinner.ts";
import { fail } from "../util/errors.ts";

export interface BuildOptions {
  container: XcodeContainer;
  scheme: string;
  configuration?: string;
  derivedData?: string;
  destination: SimulatorDevice | IOSDevice;
  target: "sim" | "device";
  verbose?: boolean;
  action?: "build" | "clean build";
}

export async function resolveDerivedData(path?: string): Promise<string> {
  return path ?? await defaultDerivedDataPath();
}

export function buildDestination(options: Pick<BuildOptions, "destination" | "target">): string {
  if (options.target === "device") {
    const device = options.destination as IOSDevice;
    return `platform=iOS,id=${device.hardwareUdid ?? device.identifier}`;
  }
  return `platform=iOS Simulator,id=${(options.destination as SimulatorDevice).udid}`;
}

export async function build(options: BuildOptions): Promise<void> {
  const args = buildArgs(options);

  if (options.verbose) {
    // Verbose mode: pipe output directly to console
    await runInherit("xcodebuild", args);
    return;
  }

  // Normal mode: capture to log file + show spinner with phase updates
  const logPath = getTimestampedLogPath();
  const logger = new BuildLogger(logPath);
  await logger.init();
  logger.startSpinner();

  try {
    const result = await runCapture("xcodebuild", args, { check: false });

    // Parse output line-by-line to extract phases and write to log
    const allLines = (result.stdout + (result.stderr ? result.stderr : "")).split("\n");
    for (const line of allLines) {
      await logger.writeLine(line);
    }

    logger.stopSpinner();

    if (result.code !== 0) {
      // Extract last meaningful line as error message
      const lines = allLines.filter((l) => l.trim());
      const errorLine = lines.find((l) => l.includes("error:")) || lines[lines.length - 1] ||
        "Build failed";

      console.error(`\n❌ Build failed\n`);
      console.error(`Error: ${errorLine}`);
      console.error(`\nFull build log: ${logPath}\n`);
      Deno.exit(result.code);
    }

    console.log(`✓ Build succeeded\n`);
  } finally {
    await logger.close();
  }
}

export function buildArgs(options: BuildOptions): string[] {
  const actions = options.action === "clean build" ? ["clean", "build"] : ["build"];
  return [
    ...containerArgs(options.container),
    "-scheme", // Build the named scheme.
    options.scheme,
    "-destination", // Select the simulator or device destination.
    buildDestination(options),
    "-derivedDataPath", // Keep build products in Newton's local derived data folder.
    options.derivedData ?? ".newton/DerivedData",
    "-resolvePackageDependencies", // Resolve SPM package dependencies before building.
    "-parallelizeTargets", // Let xcodebuild build independent targets concurrently.
    ...(options.verbose ? [] : ["-quiet"]), // Hide normal xcodebuild output unless requested.
    ...configurationArgs(options.configuration),
    "ONLY_ACTIVE_ARCH=YES", // Build only the selected destination architecture for faster local runs.
    ...(options.target === "sim" ? ["CODE_SIGN_IDENTITY=-"] : []), // Simulators do not need code signing.
    ...actions,
  ];
}

function configurationArgs(configuration?: string): string[] {
  return configuration ? ["-configuration", configuration] : [];
}

export async function showBuildSettings(options: BuildOptions): Promise<any[]> {
  const { stdout } = await runCapture("xcodebuild", [
    ...containerArgs(options.container),
    "-scheme", // Inspect settings for the named scheme.
    options.scheme,
    "-destination", // Match the same simulator or device used for the build.
    buildDestination(options),
    "-derivedDataPath", // Use Newton's derived data location when resolving build products.
    options.derivedData ?? ".newton/DerivedData",
    ...configurationArgs(options.configuration),
    "-showBuildSettings", // Print target build settings instead of building.
    "-json", // Emit machine-readable settings.
  ]);
  return JSON.parse(stdout);
}

export async function runLspBuild(options: BuildOptions): Promise<void> {
  await runPipe(
    "xcodebuild",
    buildArgs({ ...options, action: "clean build", verbose: true }),
    "xcode-build-server",
    [
      "parse", // Convert xcodebuild output into compile commands.
      "-o", // Write the compile database to the next path.
      ".compile",
      "--skip-validate-bin", // Avoid requiring compiled binaries while generating LSP metadata.
    ],
  );
}
