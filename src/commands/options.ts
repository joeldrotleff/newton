import { ApplePlatform, loadConfig } from "../ios/config.ts";
import { RunOptions } from "../ios/run.ts";
import { ScreenshotDisplay } from "../ios/screenshot.ts";
import { fail } from "../util/errors.ts";

// Cliffy converts kebab-case flags (e.g. --bundle-id) to camelCase keys (bundleId).
// These option types describe what each subcommand's `.action()` receives.

export interface InitCommandOptions {
  force?: boolean;
  platform?: ApplePlatform;
}

export interface CreateCommandOptions {
  platform?: ApplePlatform;
  output?: string;
  bundleId?: string;
  teamId?: string;
  team?: boolean; // false when --no-team is passed; cliffy default true
}

export interface RunCliOptions {
  scheme?: string;
  configuration?: string; // Removed flag, kept hidden so we can explain its removal.
  sim?: string;
  udid?: string;
  idiom?: "iphone" | "ipad";
  appStore?: "iphone" | "ipad";
  device?: string | boolean;
  detach?: boolean;
  logLevel?: string;
  logFilter?: string;
  define?: string[];
  verbose?: boolean;
}

export interface TestCliOptions {
  sim?: string;
  udid?: string;
  idiom?: "iphone" | "ipad";
  appStore?: "iphone" | "ipad";
  device?: string | boolean;
  define?: string[];
  verbose?: boolean;
}

export interface RecordCliOptions {
  output?: string;
  duration?: number;
  sim?: string;
  udid?: string;
  idiom?: "iphone" | "ipad";
}

export interface ScreenshotCliOptions {
  output?: string;
  display?: ScreenshotDisplay;
  inlineWidth?: number;
  sim?: string;
  udid?: string;
  idiom?: "iphone" | "ipad";
  appStore?: "iphone" | "ipad";
}

export interface PreviewCliOptions extends RunCliOptions {
  output?: string;
  display?: ScreenshotDisplay;
  delay?: number;
  inlineWidth?: number;
  openSimulator?: boolean;
}

export interface SimsCliOptions {
  idiom?: "iphone" | "ipad";
  appStore?: "iphone" | "ipad";
}

export interface CleanSimsCliOptions {
  runtime?: string;
}

export interface SimulatorCreateCliOptions {
  deviceType?: string;
  runtime?: string;
}

// Resolves run options from newton.json plus CLI-only flags (idiom, device, logging, etc.).
export async function resolveRunOptions(
  opts: RunCliOptions,
  appArgs: string[] = [],
): Promise<RunOptions> {
  const config = await loadConfig();
  // --device (with or without a value) selects a connected device; otherwise use the simulator.
  const deviceName = typeof opts.device === "string" ? opts.device : undefined;
  const target = opts.device ? "device" : "sim";
  if (opts.device && (opts.sim || opts.udid)) {
    fail("--device can't be combined with --sim or --udid.");
  }

  if (opts.configuration) {
    fail(
      "--configuration was removed. The scheme decides its build configuration; " +
        "pick a different scheme with --scheme instead.",
    );
  }

  // --scheme overrides newton.json so a single project can run multiple schemes
  // (e.g. a QuestDev build) without editing the file.
  const scheme = opts.scheme ?? config.scheme;
  const platform = config.platform ?? "ios";

  return {
    platform,
    scheme,
    project: config.project,
    workspace: config.workspace,
    target: platform === "macos" ? "mac" : target,
    // Soft default; resolveSimulator ignores it when an idiom/app-store flag is present.
    preferred: config.preferredSimulator,
    sim: opts.sim,
    udid: opts.udid,
    idiom: opts.idiom,
    appStore: opts.appStore,
    device: deviceName,
    logs: !opts.detach,
    logLevel: opts.logLevel,
    logFilter: opts.logFilter,
    appArgs,
    // Each --define NAME expands to two argv tokens (`-D`, `NAME`) so they survive
    // xcodebuild's OTHER_SWIFT_FLAGS parsing intact for swiftc.
    swiftFlags: (opts.define ?? []).flatMap((name) => ["-D", name]),
    verbose: opts.verbose ?? false,
  };
}

export async function resolveScreenshotOptions(opts: ScreenshotCliOptions) {
  const config = await loadConfig();
  return {
    platform: config.platform === "watchos" ? "watchos" as const : "ios" as const,
    output: opts.output,
    display: opts.display ?? "none" as const,
    inlineWidth: opts.inlineWidth,
    sim: opts.sim,
    udid: opts.udid,
    idiom: opts.idiom,
    appStore: opts.appStore,
    preferred: config.preferredSimulator,
  };
}
