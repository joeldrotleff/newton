import { printTable } from "../cli/table.ts";
import { listDevices } from "../ios/device.ts";

// Lists connected physical iPhone and iPad devices visible to Xcode.
export async function devicesCommand(): Promise<void> {
  const devices = await listDevices();
  printTable(
    ["Name", "Identifier", "Hardware UDID", "Platform", "Connection"],
    devices.map((device) => [
      device.name,
      device.identifier,
      device.hardwareUdid ?? "",
      device.platform ?? "",
      device.connectionState ?? "",
    ]),
  );
}
