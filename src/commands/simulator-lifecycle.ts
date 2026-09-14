import { createSimulator, deleteSimulator } from "../ios/simulator.ts";
import { SimulatorCreateCliOptions } from "./options.ts";

export async function simCreateCommand(
  name: string,
  options: SimulatorCreateCliOptions,
): Promise<void> {
  const udid = await createSimulator(name, options);
  console.log(JSON.stringify({ udid }));
}

export async function simDeleteCommand(nameOrUdid: string): Promise<void> {
  const device = await deleteSimulator(nameOrUdid);
  console.log(`Deleted simulator '${device.name}' (${device.udid}).`);
}
