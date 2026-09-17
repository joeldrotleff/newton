import { fail } from "../util/errors.ts";
import { dirname, ensureDir, join, resolve, timestamp } from "../util/paths.ts";
import { DevicePlatform } from "./platform.ts";
import { bootSimulator, resolveSimulator } from "./simulator.ts";

export interface RecordOptions {
  platform?: DevicePlatform;
  output?: string;
  duration?: number;
  sim?: string;
  udid?: string;
  idiom?: "iphone" | "ipad";
  preferred?: string;
}

export function validateRecordingDuration(duration?: number): void {
  if (
    duration !== undefined &&
    (!Number.isFinite(duration) || duration <= 0 || duration * 1000 > 2_147_483_647)
  ) {
    fail("Recording duration must be a positive number of seconds no greater than 2147483.647.");
  }
}

export async function recordSimulator(options: RecordOptions = {}): Promise<string> {
  validateRecordingDuration(options.duration);
  const output = resolve(options.output ?? join(".newton", "recordings", `${timestamp()}.mov`));
  await ensureDir(dirname(output));
  const simulator = await resolveSimulator(options);
  await bootSimulator(simulator.udid);

  console.log(
    options.duration === undefined
      ? "Recording simulator. Press Ctrl-C to stop."
      : `Recording simulator for ${options.duration} seconds.`,
  );

  let child: Deno.ChildProcess | undefined;
  let stopping = false;
  const stop = () => {
    if (stopping || !child) return;
    stopping = true;
    try {
      // SIGINT lets simctl finish writing the video before it exits.
      child.kill("SIGINT");
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) throw error;
    }
  };
  Deno.addSignalListener("SIGINT", stop);
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    child = new Deno.Command("xcrun", {
      args: ["simctl", "io", simulator.udid, "recordVideo", "--force", output],
      stdout: "inherit",
      stderr: "inherit",
    }).spawn();
    if (options.duration !== undefined) {
      timer = setTimeout(stop, options.duration * 1000);
    }
    const status = await child.status;
    if (!status.success && !(stopping && status.signal === "SIGINT")) {
      fail(`Simulator recording failed (exit code ${status.code}).`);
    }
  } finally {
    clearTimeout(timer);
    Deno.removeSignalListener("SIGINT", stop);
  }
  const file = await Deno.stat(output);
  if (file.size === 0) fail("Simulator recording produced an empty file.");
  return output;
}
