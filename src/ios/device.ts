import { fail } from "../util/errors.ts";
import { join } from "../util/paths.ts";
import { runCliCommand, runCliCommandInTerminal } from "../util/process.ts";

export interface IOSDevice {
  name: string;
  identifier: string;
  hardwareUdid?: string;
  platform?: string;
  connectionState?: string;
}

export async function listDevices(): Promise<IOSDevice[]> {
  const jsonPath = join(await Deno.makeTempDir(), "devices.json");
  await runCliCommand("xcrun", [
    "devicectl", // Run Xcode's device management tool through xcrun.
    "list", // List connected devices.
    "devices", // Limit the listing to devices rather than other resources.
    "--json-output", // Write machine-readable output to the next path.
    jsonPath,
  ]);
  const json = JSON.parse(await Deno.readTextFile(jsonPath));
  const devices = json.result?.devices ?? json.devices ?? [];

  return devices
    .filter((device: any) => {
      const deviceType = device.hardwareProperties?.deviceType;
      const platform = device.hardwareProperties?.platform ?? device.deviceProperties?.platform ??
        device.platform;
      return platform === "iOS" || deviceType === "iPhone" || deviceType === "iPad";
    })
    .map((device: any) => ({
      name: device.deviceProperties?.name ?? device.name ?? "Unknown Device",
      identifier: device.identifier ?? device.deviceIdentifier ?? device.udid,
      hardwareUdid: device.hardwareProperties?.udid ?? device.hardwareUDID ?? device.udid,
      platform: device.hardwareProperties?.platform ?? device.deviceProperties?.platform ??
        device.platform,
      connectionState: device.connectionProperties?.transportType ?? device.connectionState,
    }))
    .filter((device: IOSDevice) => device.identifier);
}

export async function resolveDevice(nameOrId?: string): Promise<IOSDevice> {
  const devices = await listDevices();
  const candidates = devices.filter((device) =>
    !device.platform || String(device.platform).includes("iOS")
  );
  if (nameOrId) {
    const exact = candidates.find((device) =>
      device.name === nameOrId || device.identifier === nameOrId || device.hardwareUdid === nameOrId
    );
    if (!exact) fail(`No connected iOS device matched '${nameOrId}'.`);
    return exact;
  }
  if (candidates.length === 0) {
    fail("No connected iOS device found. Connect/unlock a device, trust this Mac, then retry.");
  }
  if (candidates.length > 1) {
    return await promptDeviceSelection(candidates);
  }
  return candidates[0];
}

async function promptDeviceSelection(candidates: IOSDevice[]): Promise<IOSDevice> {
  console.log("Multiple iOS devices found:");
  candidates.forEach((device, index) => {
    const transport = device.connectionState ? ` [${device.connectionState}]` : "";
    console.log(`  ${index + 1}) ${device.name}${transport}`);
  });

  while (true) {
    const answer = await readLine(`Select a device [1-${candidates.length}]: `);
    if (answer === null) fail("No device selected.");
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

export async function installDeviceApp(device: IOSDevice, appPath: string): Promise<void> {
  await runCliCommand("xcrun", [
    "devicectl", // Run Xcode's device management tool through xcrun.
    "device", // Use the device subcommands.
    "install", // Install content onto the device.
    "app", // The installed content is an app bundle.
    "--device", // Target the device identified by the next argument.
    device.identifier,
    appPath,
  ]);
}

export async function launchDeviceApp(
  device: IOSDevice,
  bundleId: string,
  appArgs: string[],
  logs: boolean,
): Promise<void> {
  const args = [
    "devicectl", // Run Xcode's device management tool through xcrun.
    "device", // Use the device subcommands.
    "process", // Manage processes on the device.
    "launch", // Start the app process.
    "--device", // Target the device identified by the next argument.
    device.identifier,
    ...(logs ? ["--console"] : []), // Stream process console output through this terminal.
    bundleId,
    ...(appArgs.length > 0 ? ["--", ...appArgs] : []), // Separate devicectl args from app args.
  ];
  if (logs) await runCliCommandInTerminal("xcrun", args);
  else await runCliCommand("xcrun", args);
}
