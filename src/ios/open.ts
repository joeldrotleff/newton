import { runCliCommand } from "../util/process.ts";
import { resolveBootedSimulator, SimulatorDevice } from "./simulator.ts";

export async function openUrlInBootedSimulator(url: string): Promise<SimulatorDevice> {
  const simulator = await resolveBootedSimulator();
  await runCliCommand("xcrun", [
    "simctl", // Run the Simulator control tool through xcrun.
    "openurl", // Ask the selected simulator to open a URL.
    simulator.udid,
    url,
  ]);
  return simulator;
}
