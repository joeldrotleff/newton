import { fail } from "../util/errors.ts";
import { dirname, ensureDir, join, resolve, timestamp } from "../util/paths.ts";
import { executableExists, runCapture, runInherit } from "../util/process.ts";
import { bootSimulator, resolveSimulator } from "./simulator.ts";

export type ScreenshotDisplay = "inline" | "open" | "none";

export interface ScreenshotOptions {
  output?: string;
  display?: ScreenshotDisplay;
  sim?: string;
  udid?: string;
}

export async function captureScreenshot(options: ScreenshotOptions = {}): Promise<string> {
  const output = resolve(options.output ?? join(".newton", "screenshots", `${timestamp()}.png`));
  await ensureDir(dirname(output));

  const simulator = await resolveSimulator({ sim: options.sim, udid: options.udid });
  await bootSimulator(simulator.udid);
  await runCapture("xcrun", ["simctl", "io", simulator.udid, "screenshot", output]);

  await displayScreenshot(output, options.display ?? "none");
  return output;
}

export async function displayScreenshot(path: string, display: ScreenshotDisplay): Promise<void> {
  if (display === "none") return;
  if (display === "open") {
    await runCapture("open", [path]);
    return;
  }

  if (await executableExists("viu")) {
    await runInherit("viu", [path]);
    return;
  }
  if (await executableExists("kitten")) {
    await runInherit("kitten", ["icat", path]);
    return;
  }
  if (await executableExists("imgcat")) {
    await runInherit("imgcat", [path]);
    return;
  }
  if (await executableExists("wezterm")) {
    await runInherit("wezterm", ["imgcat", path]);
    return;
  }
  if (Deno.env.get("TERM_PROGRAM") === "iTerm.app") {
    const bytes = await Deno.readFile(path);
    const base64 = bytesToBase64(bytes);
    console.log(`\u001b]1337;File=inline=1:${base64}\u0007`);
    return;
  }

  fail("No inline image renderer found. Install viu, use --display open, or use --display none.");
}

function bytesToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}
