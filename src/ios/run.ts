import { fail } from "../util/errors.ts";
import { runCapture } from "../util/process.ts";
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
  const derivedData = await resolveDerivedData(options.derivedData);
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
  await runCapture("xcrun", ["simctl", "terminate", simulator.udid, bundleId], { check: false });
  await runCapture("xcrun", ["simctl", "install", simulator.udid, appPath]);
  await launchSimulatorApp(simulator.udid, bundleId, appArgs, options.logs ?? true);
}

export function launchArguments(options: RunOptions): string[] {
  const args = [...(options.appArgs ?? [])];
  if (options.logLevel) args.push("-LogLevel", options.logLevel);
  if (options.logFilter) args.push("-LogFilter", options.logFilter);
  return args;
}
