import { fail } from "../util/errors.ts";
import { join } from "../util/paths.ts";
import { runCapture, runInherit } from "../util/process.ts";

export interface IOSDevice {
  name: string;
  identifier: string;
  hardwareUdid?: string;
  platform?: string;
  connectionState?: string;
}

export async function listDevices(): Promise<IOSDevice[]> {
  const jsonPath = join(await Deno.makeTempDir(), "devices.json");
  await runCapture("xcrun", ["devicectl", "list", "devices", "--json-output", jsonPath]);
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
    fail(
      `Multiple iOS devices found. Pass --device:\n${
        candidates.map((device) => `  - ${device.name}`).join("\n")
      }`,
    );
  }
  return candidates[0];
}

export async function installDeviceApp(device: IOSDevice, appPath: string): Promise<void> {
  await runCapture("xcrun", [
    "devicectl",
    "device",
    "install",
    "app",
    "--device",
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
    "devicectl",
    "device",
    "process",
    "launch",
    "--device",
    device.identifier,
    ...(logs ? ["--console"] : []),
    bundleId,
    ...(appArgs.length > 0 ? ["--", ...appArgs] : []),
  ];
  if (logs) await runInherit("xcrun", args);
  else await runCapture("xcrun", args);
}
