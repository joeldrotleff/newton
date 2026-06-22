import { deleteSimulatorsByRuntime, deleteUnavailableSimulators } from "../ios/simulator.ts";
import { CleanSimsCliOptions } from "./options.ts";

// Deletes iOS simulators: either unavailable (orphaned) or by specific runtime version.
export async function cleanSimsCommand(opts: CleanSimsCliOptions): Promise<void> {
  const runtime = opts.runtime;

  if (runtime) {
    console.log(`Deleting simulators with runtime ${runtime}...`);
    const result = await deleteSimulatorsByRuntime(runtime);

    if (result.deleted === 0 && result.failed.length === 0) {
      console.log(`✓ No simulators found with runtime ${runtime}.`);
    } else {
      console.log(`✓ Deleted ${result.deleted} simulator(s) with runtime ${runtime}.`);
    }

    if (result.failed.length > 0) {
      console.log(`⚠ Failed to delete ${result.failed.length} simulator(s):`);
      for (const failure of result.failed) {
        console.log(`- ${failure.device.name} (${failure.device.udid})`);
        console.log(failure.error.split("\n").map((line) => `  ${line}`).join("\n"));
      }
      console.log("\nIf this is a permission error, try quitting Simulator/Xcode, then run:");
      console.log('  sudo chown -R "$(whoami)":staff ~/Library/Developer/CoreSimulator');
      console.log("Then retry the Newton command without sudo.");
    }
  } else {
    console.log("Deleting unavailable simulators...");
    await deleteUnavailableSimulators();
    console.log("✓ Unavailable simulators deleted.");
  }
}
