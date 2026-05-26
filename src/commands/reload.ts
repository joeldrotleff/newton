import { fail } from "../util/errors.ts";
import { isProcessAlive, readSession, removeSession } from "../ios/session.ts";

// Sends SIGUSR1 to a running `newton run` process, triggering a rebuild and relaunch.
export async function reloadCommand(): Promise<void> {
  const session = await readSession();
  if (!session) {
    return fail("No active Newton run session found. Is `newton run` running in this project?");
  }

  if (!await isProcessAlive(session.pid)) {
    await removeSession();
    return fail(
      `Session file exists but process ${session.pid} is not running (cleaned up stale session).`,
    );
  }

  try {
    Deno.kill(session.pid, "SIGUSR1");
  } catch (err) {
    return fail(`Failed to signal process ${session.pid}: ${err}`);
  }

  const target = session.simulatorName ?? session.deviceName ?? "unknown";
  console.log(`⟳ Reload signal sent to newton run (PID ${session.pid}, ${target})`);
}
