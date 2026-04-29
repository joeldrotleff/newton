import { containerArgs, defaultDerivedDataPath, XcodeContainer } from "./project.ts";
import { IOSDevice } from "./device.ts";
import { SimulatorDevice } from "./simulator.ts";
import { runCapture, runInherit, runPipe } from "../util/process.ts";

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
  if (options.verbose) await runInherit("xcodebuild", args);
  else {
    const result = await runCapture("xcodebuild", args, { check: false });
    if (result.code !== 0) {
      console.error(result.stdout);
      console.error(result.stderr);
      Deno.exit(result.code);
    }
  }
}

export function buildArgs(options: BuildOptions): string[] {
  const actions = options.action === "clean build" ? ["clean", "build"] : ["build"];
  return [
    ...containerArgs(options.container),
    "-scheme",
    options.scheme,
    "-destination",
    buildDestination(options),
    "-derivedDataPath",
    options.derivedData ?? ".newton/DerivedData",
    "-parallelizeTargets",
    ...(options.verbose ? [] : ["-quiet"]),
    "-configuration",
    options.configuration ?? "Debug",
    "ONLY_ACTIVE_ARCH=YES",
    ...(options.target === "sim" ? ["CODE_SIGN_IDENTITY=-"] : []),
    ...actions,
  ];
}

export async function showBuildSettings(options: BuildOptions): Promise<any[]> {
  const { stdout } = await runCapture("xcodebuild", [
    ...containerArgs(options.container),
    "-scheme",
    options.scheme,
    "-destination",
    buildDestination(options),
    "-derivedDataPath",
    options.derivedData ?? ".newton/DerivedData",
    "-configuration",
    options.configuration ?? "Debug",
    "-showBuildSettings",
    "-json",
  ]);
  return JSON.parse(stdout);
}

export async function runLspBuild(options: BuildOptions): Promise<void> {
  await runPipe(
    "xcodebuild",
    buildArgs({ ...options, action: "clean build", verbose: true }),
    "xcode-build-server",
    [
      "parse",
      "-o",
      ".compile",
      "--skip-validate-bin",
    ],
  );
}
