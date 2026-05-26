import { join } from "../util/paths.ts";

// Tracks a running `newton run` session so other newton commands can discover and signal it.

export interface RunSession {
  pid: number;
  scheme: string;
  simulatorUdid?: string;
  simulatorName?: string;
  deviceName?: string;
  cwd: string;
  startedAt: string;
}

function sessionDir(cwd = Deno.cwd()): string {
  return join(cwd, ".newton");
}

function sessionPath(cwd = Deno.cwd()): string {
  return join(sessionDir(cwd), "run.json");
}

export async function writeSession(session: RunSession): Promise<void> {
  const dir = sessionDir(session.cwd);
  await Deno.mkdir(dir, { recursive: true });
  await Deno.writeTextFile(sessionPath(session.cwd), JSON.stringify(session, null, 2) + "\n");
}

export async function readSession(cwd = Deno.cwd()): Promise<RunSession | null> {
  try {
    const text = await Deno.readTextFile(sessionPath(cwd));
    return JSON.parse(text) as RunSession;
  } catch {
    return null;
  }
}

export async function removeSession(cwd = Deno.cwd()): Promise<void> {
  try {
    await Deno.remove(sessionPath(cwd));
  } catch {
    // Already gone.
  }
}

// Check if a PID is still alive using kill -0 (signal 0 = existence check, no actual signal sent).
export async function isProcessAlive(pid: number): Promise<boolean> {
  const result = await new Deno.Command("kill", {
    args: ["-0", String(pid)],
    stdout: "null",
    stderr: "null",
  }).output();
  return result.code === 0;
}
