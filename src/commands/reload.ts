import { fail } from "../util/errors.ts";
import { isProcessAlive, readSession } from "../ios/session.ts";

// Sends SIGUSR1 to a running `newton run` process, triggering a rebuild and relaunch.
export async function reloadCommand(): Promise<void> {
  const session = await readSession();
  if (!session) {
    fail("No active Newton run session found. Is `newton run` running in this project?");
  }

  if (!isProcessAlive(session!.pid)) {
    fail(
      `Session file exists but process ${session!.pid} is not running. ` +
        "It may have exited without cleanup. Delete .newton/run.json and re-run.",
    );
  }

  try {
    Deno.kill(session!.pid, "SIGUSR1");
  } catch (err) {
    fail(`Failed to signal process ${session!.pid}: ${err}`);
  }

  const target = session!.simulatorName ?? session!.deviceName ?? "unknown";
  console.log(`⟳ Reload signal sent to newton run (PID ${session!.pid}, ${target})`);
}
