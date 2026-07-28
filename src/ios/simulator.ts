import { fail } from "../util/errors.ts";
import { runCliCommand, runCliCommandInTerminal } from "../util/process.ts";
import { DevicePlatform, platformDisplayName } from "./platform.ts";

export type Idiom = "iphone" | "ipad";
export type SimulatorProfile = Idiom | "watch";

export interface SimulatorDevice {
  platform: DevicePlatform;
  name: string;
  udid: string;
  state: string;
  runtime: string;
  runtimeVersion: string;
  versionParts: number[];
  isAvailable: boolean;
}

export interface SimulatorSelectionOptions {
  platform?: DevicePlatform;
  sim?: string;
  udid?: string;
  idiom?: Idiom;
  appStore?: Idiom;
  // Soft default from newton.json. Applied only when the user passes no selection flags.
  preferred?: string;
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

export async function listSimulators(
  platform: DevicePlatform = "ios",
): Promise<SimulatorDevice[]> {
  const { stdout } = await runCliCommand("xcrun", [
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
    const runtimePlatform = platformForRuntime(runtimeKey);
    if (runtimePlatform !== platform) continue;
    const runtimeVersion = versionForRuntime(runtimeKey);
    for (const device of runtimeDevices) {
      if (device.isAvailable === false) continue;
      devices.push({
        platform: runtimePlatform,
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

export function platformForRuntime(runtime: string): DevicePlatform | undefined {
  if (runtime.includes("watchOS")) return "watchos";
  if (runtime.includes("iOS")) return "ios";
  return undefined;
}

export function versionForRuntime(runtime: string): string {
  return runtime.replace(/^.*(?:watchOS|iOS)[- ]/, "").replaceAll("-", ".");
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
  const platform = options.platform ?? "ios";
  return selectSimulator(await listSimulators(platform), options);
}

// Pure selection logic: given the available devices and a selection request, pick one device.
// Kept separate from listSimulators so it can be unit-tested without shelling out to xcrun.
export function selectSimulator(
  devices: SimulatorDevice[],
  options: SimulatorSelectionOptions = {},
): SimulatorDevice {
  assertCompatibleSelection(options);
  const platform = options.platform ?? "ios";
  const platformName = platformDisplayName(platform);
  devices = devices.filter((device) => device.platform === platform);

  if (options.udid) {
    const exact = devices.find((device) => device.udid === options.udid);
    if (!exact) fail(`No available ${platformName} simulator found with UDID ${options.udid}.`);
    return exact;
  }
  if (options.sim) {
    const exact = devices.find((device) => device.name === options.sim);
    if (!exact) fail(`No available ${platformName} simulator named '${options.sim}'.`);
    return exact;
  }

  // The preferred simulator (newton.json) is a default, not a pin: it applies only when the
  // user gives no selection flags. Any explicit --idiom/--app-store signals intent to choose,
  // so we ignore the saved preference and fall through to the ranking algorithm.
  const userSelecting = options.idiom !== undefined || options.appStore !== undefined;
  if (!userSelecting && options.preferred) {
    const exact = devices.find((device) => device.name === options.preferred);
    if (exact) return exact;
    // Preferred simulator no longer exists (e.g. deleted) — fall through to ranking.
  }

  const profile: SimulatorProfile = platform === "watchos"
    ? "watch"
    : options.appStore ?? options.idiom ?? "iphone";
  let candidates = devices.filter((device) => matchesProfile(device, profile));
  if (options.appStore) {
    candidates = candidates.filter((device) => isAppStoreCompatible(device, options.appStore));
  }
  if (candidates.length === 0) {
    fail(`No available ${profile === "watch" ? "Apple Watch" : profile} simulator found.`);
  }

  return candidates.toSorted(compareSimulatorPreference(profile))[0];
}

// Rejects contradictory selection flags before we bother touching the device list.
// --sim/--udid pin an exact device; --idiom/--app-store are filters — mixing the two,
// or passing two pins / two conflicting idioms, is ambiguous and should fail loudly.
export function assertCompatibleSelection(options: SimulatorSelectionOptions): void {
  if (options.platform === "watchos" && (options.idiom || options.appStore)) {
    fail("--idiom and --app-store only apply to iOS simulators.");
  }
  if (options.udid && options.sim) {
    fail("Pass only one of --sim or --udid, not both.");
  }
  const pin = options.udid ? "--udid" : options.sim ? "--sim" : undefined;
  const filter = options.idiom ? "--idiom" : options.appStore ? "--app-store" : undefined;
  if (pin && filter) {
    fail(`${pin} selects an exact simulator and can't be combined with ${filter}.`);
  }
  if (options.idiom && options.appStore && options.idiom !== options.appStore) {
    fail(`--idiom ${options.idiom} conflicts with --app-store ${options.appStore}.`);
  }
}

export function matchesIdiom(device: SimulatorDevice, idiom: Idiom): boolean {
  return device.platform === "ios" &&
    (idiom === "iphone" ? device.name.startsWith("iPhone") : device.name.startsWith("iPad"));
}

export function matchesProfile(device: SimulatorDevice, profile: SimulatorProfile): boolean {
  return profile === "watch" ? device.platform === "watchos" : matchesIdiom(device, profile);
}

export function compareSimulatorPreference(
  profile: SimulatorProfile,
): (a: SimulatorDevice, b: SimulatorDevice) => number {
  return (a, b) => {
    const runtime = compareVersionsDesc(a.versionParts, b.versionParts);
    if (runtime !== 0) return runtime;
    return rankDevice(a.name, profile) - rankDevice(b.name, profile);
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

function rankDevice(name: string, profile: SimulatorProfile): number {
  if (profile === "watch") {
    const series = Number(name.match(/Series (\d+)/)?.[1] ?? 0);
    const size = Number(name.match(/\((\d+)mm\)/)?.[1] ?? 0);
    if (series) return (100 - series) * 100 + (size ? 100 - size : 99);
    if (name.includes("Ultra")) return 10_000;
    if (name.includes("SE")) return 20_000;
    return 30_000;
  }

  if (profile === "ipad") {
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
  await runCliCommand("xcrun", [
    "simctl", // Run the Simulator control tool through xcrun.
    "boot", // Start the selected simulator if it is not already booted.
    udid,
  ], { check: false });
  await runCliCommand("xcrun", [
    "simctl", // Run the Simulator control tool through xcrun.
    "bootstatus", // Wait for the simulator boot process to finish.
    udid,
    "-b", // Block until boot completes.
  ]);
}

export async function openSimulator(udid: string): Promise<void> {
  await runCliCommand("open", [
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

export async function listBootedSimulators(
  platform?: DevicePlatform,
): Promise<SimulatorDevice[]> {
  const { stdout } = await runCliCommand("xcrun", [
    "simctl", // Run the Simulator control tool through xcrun.
    "list", // List simulator resources.
    "devices", // Limit the listing to simulator devices.
    "booted", // Only include currently booted devices.
    "--json", // Emit machine-readable device data.
  ]);
  const json = JSON.parse(stdout);
  const devices: SimulatorDevice[] = [];

  for (
    const [runtimeKey, runtimeDevices] of Object.entries(json.devices ?? {}) as [string, any[]][]
  ) {
    const runtimePlatform = platformForRuntime(runtimeKey);
    if (!runtimePlatform || (platform && runtimePlatform !== platform)) continue;
    const runtimeVersion = versionForRuntime(runtimeKey);
    for (const device of runtimeDevices) {
      if (device.state !== "Booted") continue;
      devices.push({
        platform: runtimePlatform,
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

export async function bootedSimulatorUdid(): Promise<string> {
  const device = await resolveBootedSimulator();
  return device.udid;
}

export async function resolveBootedSimulator(
  platform?: DevicePlatform,
): Promise<SimulatorDevice> {
  const devices = await listBootedSimulators(platform);
  if (devices.length === 0) {
    fail("No booted simulator found. Run `newton run` or boot a simulator first.");
  }
  if (devices.length === 1) return devices[0];
  return await promptBootedSimulatorSelection(devices);
}

async function promptBootedSimulatorSelection(
  candidates: SimulatorDevice[],
): Promise<SimulatorDevice> {
  console.log("Multiple booted simulators found:");
  candidates.forEach((device, index) => {
    console.log(`  ${index + 1}) ${device.name} (${device.runtimeVersion})`);
  });

  while (true) {
    const answer = await readLine(`Select a simulator [1-${candidates.length}]: `);
    if (answer === null) fail("No simulator selected.");
    const choice = Number(answer.trim());
    if (Number.isInteger(choice) && choice >= 1 && choice <= candidates.length) {
      return candidates[choice - 1];
    }
    console.log(`Enter a number from 1 to ${candidates.length}.`);
  }
}

async function readLine(message: string): Promise<string | null> {
  await Deno.stdout.write(new TextEncoder().encode(message));
  const buffer = new Uint8Array(1024);
  const bytesRead = await Deno.stdin.read(buffer);
  if (bytesRead === null) return null;
  return new TextDecoder().decode(buffer.subarray(0, bytesRead)).split(/\r?\n/, 1)[0];
}

export async function launchSimulatorApp(
  udid: string,
  bundleId: string,
  appArgs: string[],
  logs: boolean,
): Promise<void> {
  if (logs) {
    await runCliCommandInTerminal("xcrun", [
      "simctl", // Run the Simulator control tool through xcrun.
      "launch", // Start the app on the selected simulator.
      "--console-pty", // Stream the app's console output through this terminal.
      udid,
      bundleId,
      ...appArgs, // Forward Newton app arguments to the launched app.
    ]);
  } else {
    await runCliCommand("xcrun", [
      "simctl", // Run the Simulator control tool through xcrun.
      "launch", // Start the app on the selected simulator.
      udid,
      bundleId,
      ...appArgs, // Forward Newton app arguments to the launched app.
    ]);
  }
}

export async function deleteUnavailableSimulators(): Promise<void> {
  await runCliCommand("xcrun", [
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

export async function deleteSimulatorsByRuntime(
  runtimeVersion: string,
  platform: DevicePlatform = "ios",
): Promise<SimulatorDeleteResult> {
  const devices = await listSimulators(platform);
  const toDelete = devices.filter((device) => device.runtimeVersion === runtimeVersion);
  const failed: SimulatorDeleteFailure[] = [];
  let deleted = 0;

  for (const device of toDelete) {
    if (device.state === "Booted") {
      await runCliCommand("xcrun", [
        "simctl", // Run the Simulator control tool through xcrun.
        "shutdown", // Stop booted simulators before deleting them.
        device.udid,
      ], { check: false });
    }

    const result = await runCliCommand("xcrun", [
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
