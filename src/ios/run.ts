import { fail } from "../util/errors.ts";
import { missingRequiredConfigFieldMessage } from "./config.ts";
import { join } from "../util/paths.ts";
import { runCliCommand, runCliCommandInTerminal } from "../util/process.ts";
import { locateBuiltApp, readBundleId } from "./appBundle.ts";
import { installDeviceApp, launchDeviceApp, resolveDevice } from "./device.ts";
import { discoverProject } from "./project.ts";
import { bootSimulator, launchSimulatorApp, openSimulator, resolveSimulator } from "./simulator.ts";
import { ApplePlatform, platformDisplayName } from "./platform.ts";
import { build, macDestination } from "./xcodebuild.ts";

export interface RunOptions {
  platform?: ApplePlatform;
  scheme?: string;
  project?: string;
  workspace?: string;
  target?: "sim" | "device" | "mac";
  configuration?: string;
  appName?: string;
  sim?: string;
  udid?: string;
  idiom?: "iphone" | "ipad";
  appStore?: "iphone" | "ipad";
  preferred?: string;
  device?: string;
  logs?: boolean;
  revealSimulator?: boolean;
  logLevel?: string;
  logFilter?: string;
  appArgs?: string[];
  swiftFlags?: string[];
  verbose?: boolean;
}

export async function runApp(options: RunOptions): Promise<void> {
  if (!options.scheme) fail(await missingRequiredConfigFieldMessage("scheme"));
  const target = options.target ?? "sim";
  const container = await discoverProject();
  const appArgs = launchArguments(options);

  if (target === "mac") {
    await runMacApp(options, container, appArgs);
    return;
  }

  const platform = options.platform === "watchos" ? "watchos" : "ios";

  if (target === "device") {
    const device = await resolveDevice(options.device, platform);
    // Announce the target before the (slow) build so the user can confirm it's the right device.
    console.log(`▸ Device: ${device.name}`);
    await build({
      ...options,
      container,
      scheme: options.scheme,
      destination: device,
      target,
    });
    const appPath = await locateBuiltApp({
      ...options,
      container,
      scheme: options.scheme,
      destination: device,
      target,
    });
    const bundleId = await readBundleId(appPath);
    await installDeviceApp(device, appPath);
    await launchDeviceApp(device, bundleId, appArgs, options.logs ?? true);
    return;
  }

  const simulator = await resolveSimulator({
    platform,
    sim: options.sim,
    udid: options.udid,
    idiom: options.idiom,
    appStore: options.appStore,
    preferred: options.preferred,
  });
  // Announce the target before the (slow) build so the user can confirm it's the right device.
  console.log(
    `▸ Simulator: ${simulator.name} (${platformDisplayName(platform)} ${simulator.runtimeVersion})`,
  );
  await bootSimulator(simulator.udid);
  if (options.revealSimulator ?? true) {
    await openSimulator(simulator.udid);
  }

  await buildInstallLaunch(options, container, simulator, appArgs);
}

// Build, install, terminate old instance, and launch the app.
async function buildInstallLaunch(
  options: RunOptions,
  container: Awaited<ReturnType<typeof discoverProject>>,
  simulator: Awaited<ReturnType<typeof resolveSimulator>>,
  appArgs: string[],
): Promise<void> {
  await build({
    ...options,
    container,
    scheme: options.scheme!,
    destination: simulator,
    target: "sim",
  });
  const appPath = await locateBuiltApp({
    ...options,
    container,
    scheme: options.scheme!,
    destination: simulator,
    target: "sim",
  });
  const bundleId = await readBundleId(appPath);
  await runCliCommand("xcrun", [
    "simctl", // Run the Simulator control tool through xcrun.
    "terminate", // Stop any currently running copy before installing the new build.
    simulator.udid,
    bundleId,
  ], { check: false });
  await runCliCommand("xcrun", [
    "simctl", // Run the Simulator control tool through xcrun.
    "install", // Install the built .app onto the selected simulator.
    simulator.udid,
    appPath,
  ]);

  await launchSimulatorApp(simulator.udid, bundleId, appArgs, options.logs ?? true);
}

async function runMacApp(
  options: RunOptions,
  container: Awaited<ReturnType<typeof discoverProject>>,
  appArgs: string[],
): Promise<void> {
  console.log("▸ Destination: My Mac");
  await build({
    ...options,
    container,
    scheme: options.scheme!,
    destination: macDestination,
    target: "mac",
  });
  const appPath = await locateBuiltApp({
    ...options,
    container,
    scheme: options.scheme!,
    destination: macDestination,
    target: "mac",
  });

  if (!(options.logs ?? true)) {
    await runCliCommand("open", ["-n", appPath, "--args", ...appArgs]);
    return;
  }

  if (!options.appName) fail(await missingRequiredConfigFieldMessage("appName"));
  await runCliCommandInTerminal(join(appPath, "Contents", "MacOS", options.appName), appArgs, {
    timestamps: true,
  });
}

export function launchArguments(options: RunOptions): string[] {
  const args = [...(options.appArgs ?? [])];
  if (options.logLevel) args.push("-LogLevel", options.logLevel);
  if (options.logFilter) args.push("-LogFilter", options.logFilter);
  return args;
}
