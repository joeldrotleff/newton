import { Table } from "@cliffy/table";
import { isAppStoreCompatible, listSimulators, resolveSimulator } from "../ios/simulator.ts";
import { loadConfig } from "../ios/config.ts";
import { SimsCliOptions } from "./options.ts";

// Lists installed iOS simulators and marks Newton's default choice.
export async function simsCommand(opts: SimsCliOptions): Promise<void> {
  const config = await loadConfig();
  const devices = await listSimulators();
  // Mirror resolveSimulator's selection so the '*' marker matches what `run` would launch.
  const selected = await resolveSimulator({
    idiom: opts.idiom,
    appStore: opts.appStore,
    preferred: config.preferredSimulator,
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
