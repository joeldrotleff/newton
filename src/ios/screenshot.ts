import { fail } from "../util/errors.ts";
import { dirname, ensureDir, join, resolve, timestamp } from "../util/paths.ts";
import { executableExists, runCliCommand, runCliCommandInTerminal } from "../util/process.ts";
import { bootSimulator, resolveSimulator } from "./simulator.ts";

export type ScreenshotDisplay = "inline" | "open" | "none";

const DEFAULT_INLINE_WIDTH = 18;

export interface ScreenshotOptions {
  output?: string;
  display?: ScreenshotDisplay;
  inlineWidth?: number;
  sim?: string;
  udid?: string;
  idiom?: "iphone" | "ipad";
  appStore?: "iphone" | "ipad";
  preferred?: string;
}

export async function captureScreenshot(options: ScreenshotOptions = {}): Promise<string> {
  const output = resolve(options.output ?? join(".newton", "screenshots", `${timestamp()}.png`));
  await ensureDir(dirname(output));

  const simulator = await resolveSimulator({
    sim: options.sim,
    udid: options.udid,
    idiom: options.idiom,
    appStore: options.appStore,
    preferred: options.preferred,
  });
  await bootSimulator(simulator.udid);
  await runCliCommand("xcrun", [
    "simctl", // Run the Simulator control tool through xcrun.
    "io", // Use simulator input/output commands.
    simulator.udid,
    "screenshot", // Capture the simulator screen.
    output,
  ]);

  await displayScreenshot(output, options.display ?? "none", { width: options.inlineWidth });
  return output;
}

export interface InlineDisplayOptions {
  width?: number;
}

export async function displayScreenshot(
  path: string,
  display: ScreenshotDisplay,
  options: InlineDisplayOptions = {},
): Promise<void> {
  if (display === "none") return;
  if (display === "open") {
    await runCliCommand("open", [
      path, // Ask macOS to open the screenshot with the default image viewer.
    ]);
    return;
  }

  if (supportsKittyGraphics()) {
    await displayKittyImage(path, options);
    return;
  }
  if (Deno.stdout.isTerminal() && Deno.env.get("TERM_PROGRAM") === "iTerm.app") {
    const bytes = await Deno.readFile(path);
    const base64 = bytesToBase64(bytes);
    console.log(`\u001b]1337;File=inline=1:${base64}\u0007`);
    return;
  }
  if (await executableExists("viu")) {
    await runCliCommandInTerminal("viu", [
      "--blocks", // Avoid terminal capability probes that can leak escape responses.
      ...viuSizeArgs(options),
      path, // Render the screenshot inline with viu.
    ]);
    return;
  }
  if (await executableExists("kitten")) {
    await runCliCommandInTerminal("kitten", [
      "icat", // Render an inline image using Kitty's image protocol.
      path,
    ]);
    return;
  }
  if (await executableExists("imgcat")) {
    await runCliCommandInTerminal("imgcat", [
      path, // Render the screenshot inline with iTerm's imgcat helper.
    ]);
    return;
  }
  if (await executableExists("wezterm")) {
    await runCliCommandInTerminal("wezterm", [
      "imgcat", // Render an inline image using WezTerm's imgcat command.
      path,
    ]);
    return;
  }

  fail("No inline image renderer found. Install viu, use --display open, or use --display none.");
}

function supportsKittyGraphics(): boolean {
  if (!Deno.stdout.isTerminal()) return false;

  const term = Deno.env.get("TERM") ?? "";
  const termProgram = Deno.env.get("TERM_PROGRAM") ?? "";
  return termProgram === "ghostty" || term.includes("kitty") || Deno.env.has("KITTY_WINDOW_ID");
}

async function displayKittyImage(path: string, options: InlineDisplayOptions): Promise<void> {
  const columns = inlineColumns(options);
  const placement = columns ? `,c=${columns}` : "";
  const payload = btoa(path);
  console.log(`\u001b_Ga=T,t=f,f=100${placement};${payload}\u001b\\`);
}

function viuSizeArgs(options: InlineDisplayOptions): string[] {
  const columns = inlineColumns(options);
  return columns ? ["--width", String(columns)] : [];
}

function inlineColumns(options: InlineDisplayOptions): number | undefined {
  const width = options.width ?? DEFAULT_INLINE_WIDTH;
  try {
    return Math.min(width, Deno.consoleSize().columns);
  } catch {
    return width;
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}
