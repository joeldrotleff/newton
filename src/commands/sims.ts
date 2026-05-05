import { Table } from "@cliffy/table";
import { isAppStoreCompatible, listSimulators, resolveSimulator } from "../ios/simulator.ts";
import { SimsCliOptions } from "./options.ts";

// Lists installed iOS simulators and marks Newton's default choice.
export async function simsCommand(opts: SimsCliOptions): Promise<void> {
  const idiom = opts.appStore ?? opts.idiom ?? "iphone";
  const devices = await listSimulators();
  const selected = await resolveSimulator({
    idiom,
    appStore: opts.appStore,
  }).catch(() => undefined);

  new Table()
    .header(["Default", "App Store", "Name", "Runtime", "UDID", "State"])
    .body(devices.map((device) => [
      selected?.udid === device.udid ? "*" : "",
      isAppStoreCompatible(device) ? "yes" : "",
      device.name,
      device.runtimeVersion,
      device.udid,
      device.state,
    ]))
    .padding(2)
    .render();
}
