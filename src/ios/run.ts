import { fail } from "../util/errors.ts";
import { runCliCommand } from "../util/process.ts";
import { locateBuiltApp, readBundleId } from "./appBundle.ts";
import { installDeviceApp, launchDeviceApp, resolveDevice } from "./device.ts";
import { discoverProject } from "./project.ts";
import { bootSimulator, launchSimulatorApp, openSimulator, resolveSimulator } from "./simulator.ts";
import { build, resolveDerivedData } from "./xcodebuild.ts";

export interface RunOptions {
  scheme?: string;
  project?: string;
  workspace?: string;
  target?: "sim" | "device";
  configuration?: string;
  derivedData?: string;
  appName?: string;
  sim?: string;
  udid?: string;
  idiom?: "iphone" | "ipad";
  appStore?: "iphone" | "ipad";
  device?: string;
  logs?: boolean;
  logLevel?: string;
  logFilter?: string;
  appArgs?: string[];
  verbose?: boolean;
}

export async function runApp(options: RunOptions): Promise<void> {
  if (!options.scheme) fail("Missing required --scheme <name>.");
  const target = options.target ?? "sim";
  const container = await discoverProject(options);
  const derivedData = resolveDerivedData(options.derivedData);
  const appArgs = launchArguments(options);

  if (target === "device") {
    const device = await resolveDevice(options.device);
    await build({
      ...options,
      container,
      scheme: options.scheme,
      destination: device,
      target,
      derivedData,
    });
    const appPath = await locateBuiltApp({
      ...options,
      container,
      scheme: options.scheme,
      destination: device,
      target,
      derivedData,
    });
    const bundleId = await readBundleId(appPath);
    await installDeviceApp(device, appPath);
    await launchDeviceApp(device, bundleId, appArgs, options.logs ?? true);
    return;
  }

  const simulator = await resolveSimulator({
    sim: options.sim,
    udid: options.udid,
    idiom: options.idiom,
    appStore: options.appStore,
  });
  await bootSimulator(simulator.udid);
  await openSimulator(simulator.udid);
  await build({
    ...options,
    container,
    scheme: options.scheme,
    destination: simulator,
    target,
    derivedData,
  });
  const appPath = await locateBuiltApp({
    ...options,
    container,
    scheme: options.scheme,
    destination: simulator,
    target,
    derivedData,
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

export function launchArguments(options: RunOptions): string[] {
  const args = [...(options.appArgs ?? [])];
  if (options.logLevel) args.push("-LogLevel", options.logLevel);
  if (options.logFilter) args.push("-LogFilter", options.logFilter);
  return args;
}
