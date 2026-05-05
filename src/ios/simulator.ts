import { fail } from "../util/errors.ts";
import { runCapture, runInherit } from "../util/process.ts";

export type Idiom = "iphone" | "ipad";

export interface SimulatorDevice {
  name: string;
  udid: string;
  state: string;
  runtime: string;
  runtimeVersion: string;
  versionParts: number[];
  isAvailable: boolean;
}

export interface SimulatorSelectionOptions {
  sim?: string;
  udid?: string;
  idiom?: Idiom;
  appStore?: Idiom;
}

const IPHONE_SCREENSHOT_NAMES = [
  "iPhone 17 Pro Max",
  "iPhone 16 Pro Max",
  "iPhone 16 Plus",
  "iPhone 15 Pro Max",
  "iPhone 15 Plus",
  "iPhone 14 Pro Max",
  "iPhone 14 Plus",
];
const IPAD_SCREENSHOT_PATTERNS = [
  /iPad Pro \(13-inch/,
  /iPad Pro \(12\.9-inch/,
  /iPad Pro 13-inch/,
  /iPad Pro 12\.9-inch/,
];

export async function listSimulators(): Promise<SimulatorDevice[]> {
  const { stdout } = await runCapture("xcrun", [
    "simctl", // Run the Simulator control tool through xcrun.
    "list", // List simulator resources.
    "devices", // Limit the listing to simulator devices.
    "available", // Exclude unavailable runtimes/devices.
    "--json", // Emit machine-readable device data.
  ]);
  const json = JSON.parse(stdout);
  const devices: SimulatorDevice[] = [];

  for (
    const [runtimeKey, runtimeDevices] of Object.entries(json.devices ?? {}) as [string, any[]][]
  ) {
    if (!runtimeKey.includes("iOS")) continue;
    const runtimeVersion = runtimeKey.replace(/^.*iOS[- ]/, "").replaceAll("-", ".");
    for (const device of runtimeDevices) {
      if (device.isAvailable === false) continue;
      devices.push({
        name: device.name,
        udid: device.udid,
        state: device.state,
        runtime: runtimeKey,
        runtimeVersion,
        versionParts: parseVersion(runtimeVersion),
        isAvailable: device.isAvailable !== false,
      });
    }
  }

  return devices;
}

export function parseVersion(version: string): number[] {
  const matches = version.match(/\d+/g) ?? [];
  return matches.map(Number);
}

export function isAppStoreCompatible(device: SimulatorDevice, idiom?: Idiom): boolean {
  if (idiom === "iphone" || (!idiom && device.name.startsWith("iPhone"))) {
    return IPHONE_SCREENSHOT_NAMES.some((name) => device.name.includes(name));
  }
  if (idiom === "ipad" || (!idiom && device.name.startsWith("iPad"))) {
    return IPAD_SCREENSHOT_PATTERNS.some((pattern) => pattern.test(device.name));
  }
  return false;
}

export async function resolveSimulator(
  options: SimulatorSelectionOptions = {},
): Promise<SimulatorDevice> {
  const devices = await listSimulators();
  if (options.udid) {
    const exact = devices.find((device) => device.udid === options.udid);
    if (!exact) fail(`No available iOS simulator found with UDID ${options.udid}.`);
    return exact;
  }
  if (options.sim) {
    const exact = devices.find((device) => device.name === options.sim);
    if (!exact) fail(`No available iOS simulator named '${options.sim}'.`);
    return exact;
  }

  const idiom = options.appStore ?? options.idiom ?? "iphone";
  let candidates = devices.filter((device) => matchesIdiom(device, idiom));
  if (options.appStore) {
    candidates = candidates.filter((device) => isAppStoreCompatible(device, options.appStore));
  }
  if (candidates.length === 0) fail(`No available ${idiom} simulator found.`);

  return candidates.toSorted(compareSimulatorPreference(idiom))[0];
}

export function matchesIdiom(device: SimulatorDevice, idiom: Idiom): boolean {
  return idiom === "iphone" ? device.name.startsWith("iPhone") : device.name.startsWith("iPad");
}

export function compareSimulatorPreference(
  idiom: Idiom,
): (a: SimulatorDevice, b: SimulatorDevice) => number {
  return (a, b) => {
    const runtime = compareVersionsDesc(a.versionParts, b.versionParts);
    if (runtime !== 0) return runtime;
    return rankDevice(a.name, idiom) - rankDevice(b.name, idiom);
  };
}

function compareVersionsDesc(a: number[], b: number[]): number {
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index++) {
    const left = a[index] ?? 0;
    const right = b[index] ?? 0;
    if (left !== right) return right - left;
  }
  return 0;
}

function rankDevice(name: string, idiom: Idiom): number {
  if (idiom === "ipad") {
    if (/iPad Pro \(?13-inch/.test(name)) return 0;
    if (/iPad Pro \(?11-inch/.test(name)) return 1;
    if (name.includes("iPad Pro")) return 2;
    return 3;
  }

  const generation = Number(name.match(/iPhone (\d+)/)?.[1] ?? 0);
  const generationRank = generation ? 100 - generation : 100;
  if (/^iPhone \d+$/.test(name)) return generationRank * 10;
  if (/^iPhone \d+ Pro$/.test(name)) return generationRank * 10 + 1;
  if (/^iPhone \d+ Pro Max$/.test(name)) return generationRank * 10 + 2;
  if (/^iPhone \d+ Plus$/.test(name)) return generationRank * 10 + 3;
  return generationRank * 10 + 9;
}

export async function bootSimulator(udid: string): Promise<void> {
  await runCapture("xcrun", [
    "simctl", // Run the Simulator control tool through xcrun.
    "boot", // Start the selected simulator if it is not already booted.
    udid,
  ], { check: false });
  await runCapture("xcrun", [
    "simctl", // Run the Simulator control tool through xcrun.
    "bootstatus", // Wait for the simulator boot process to finish.
    udid,
    "-b", // Block until boot completes.
  ]);
}

export async function openSimulator(udid: string): Promise<void> {
  await runCapture("open", [
    "--background", // Launch or reuse Simulator without bringing it to the foreground.
    "-a", // Open with the application named by the next argument.
    "Simulator", // Application to open.
    "--args", // Pass the remaining arguments to Simulator itself.
    "-CurrentDeviceUDID", // Ask Simulator to show the selected device.
    udid,
  ], {
    check: false,
  });
}

export async function bootedSimulatorUdid(): Promise<string> {
  const { stdout } = await runCapture("xcrun", [
    "simctl", // Run the Simulator control tool through xcrun.
    "list", // List simulator resources.
    "devices", // Limit the listing to simulator devices.
    "booted", // Only include currently booted devices.
    "--json", // Emit machine-readable device data.
  ]);
  const json = JSON.parse(stdout);
  for (const runtimeDevices of Object.values<any[]>(json.devices ?? {})) {
    const device = runtimeDevices.find((candidate) => candidate.state === "Booted");
    if (device) return device.udid;
  }
  fail("No booted simulator found. Pass --sim/--udid or run `newton run` first.");
}

export async function launchSimulatorApp(
  udid: string,
  bundleId: string,
  appArgs: string[],
  logs: boolean,
): Promise<void> {
  if (logs) {
    await runInherit("xcrun", [
      "simctl", // Run the Simulator control tool through xcrun.
      "launch", // Start the app on the selected simulator.
      "--console-pty", // Stream the app's console output through this terminal.
      udid,
      bundleId,
      ...appArgs, // Forward Newton app arguments to the launched app.
    ]);
  } else {
    await runCapture("xcrun", [
      "simctl", // Run the Simulator control tool through xcrun.
      "launch", // Start the app on the selected simulator.
      udid,
      bundleId,
      ...appArgs, // Forward Newton app arguments to the launched app.
    ]);
  }
}

export async function deleteUnavailableSimulators(): Promise<void> {
  await runCapture("xcrun", [
    "simctl", // Run the Simulator control tool through xcrun.
    "delete", // Delete simulator(s).
    "unavailable", // Target only unavailable simulators (orphaned devices).
  ]);
}

export interface SimulatorDeleteFailure {
  device: SimulatorDevice;
  error: string;
}

export interface SimulatorDeleteResult {
  deleted: number;
  failed: SimulatorDeleteFailure[];
}

export async function deleteSimulatorsByRuntime(runtimeVersion: string): Promise<SimulatorDeleteResult> {
  const devices = await listSimulators();
  const toDelete = devices.filter((device) => device.runtimeVersion === runtimeVersion);
  const failed: SimulatorDeleteFailure[] = [];
  let deleted = 0;

  for (const device of toDelete) {
    if (device.state === "Booted") {
      await runCapture("xcrun", [
        "simctl", // Run the Simulator control tool through xcrun.
        "shutdown", // Stop booted simulators before deleting them.
        device.udid,
      ], { check: false });
    }

    const result = await runCapture("xcrun", [
      "simctl", // Run the Simulator control tool through xcrun.
      "delete", // Delete simulator(s).
      device.udid, // Delete by UDID.
    ], { check: false });

    if (result.code === 0) {
      deleted += 1;
    } else {
      failed.push({
        device,
        error: (result.stderr || result.stdout).trim(),
      });
    }
  }

  return { deleted, failed };
}
