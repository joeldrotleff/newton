import { Table } from "@cliffy/table";
import { listDevices } from "../ios/device.ts";

// Lists connected physical iPhone and iPad devices visible to Xcode.
export async function devicesCommand(): Promise<void> {
  const devices = await listDevices();
  new Table()
    .header(["Name", "Identifier", "Hardware UDID", "Platform", "Connection"])
    .body(devices.map((device) => [
      device.name,
      device.identifier,
      device.hardwareUdid ?? "",
      device.platform ?? "",
      device.connectionState ?? "",
    ]))
    .padding(2)
    .render();
}
