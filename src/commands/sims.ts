import { CliFlags, stringFlag } from "../cli/flags.ts";
import { printTable } from "../cli/table.ts";
import { isAppStoreCompatible, listSimulators, resolveSimulator } from "../ios/simulator.ts";

export async function simsCommand(flags: CliFlags): Promise<void> {
  const idiom = stringFlag(flags, "app-store") ?? stringFlag(flags, "idiom") ?? "iphone";
  const devices = await listSimulators();
  const selected = await resolveSimulator({
    idiom: idiom as "iphone" | "ipad",
    appStore: stringFlag(flags, "app-store") as any,
  }).catch(() => undefined);

  printTable(
    ["Default", "App Store", "Name", "Runtime", "UDID", "State"],
    devices.map((device) => [
      selected?.udid === device.udid ? "*" : "",
      isAppStoreCompatible(device) ? "yes" : "",
      device.name,
      device.runtimeVersion,
      device.udid,
      device.state,
    ]),
  );
}
