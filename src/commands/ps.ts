import { isProcessAlive, readSession, removeSession } from "../ios/session.ts";

// Lists active Newton run sessions in the current project.
export async function psCommand(): Promise<void> {
  const session = await readSession();

  if (!session) {
    console.log("No active Newton run session in this project.");
    return;
  }

  const alive = await isProcessAlive(session.pid);
  if (!alive) {
    console.log(`Stale session found (PID ${session.pid} is no longer running). Cleaning up.`);
    await removeSession();
    return;
  }

  const target = session.simulatorName ?? session.deviceName ?? "unknown";
  const elapsed = timeSince(session.startedAt);
  console.log(`PID ${session.pid}  ${session.scheme}  ${target}  (${elapsed})`);
}

function timeSince(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}
