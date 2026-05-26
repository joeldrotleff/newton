import { loadConfig } from "../ios/config.ts";
import { RunOptions } from "../ios/run.ts";
import { ScreenshotDisplay } from "../ios/screenshot.ts";

// Cliffy converts kebab-case flags (e.g. --bundle-id) to camelCase keys (bundleId).
// These option types describe what each subcommand's `.action()` receives.

export interface InitCommandOptions {
  force?: boolean;
}

export interface CreateCommandOptions {
  output?: string;
  bundleId?: string;
  teamId?: string;
  team?: boolean; // false when --no-team is passed; cliffy default true
}

export interface RunCliOptions {
  idiom?: "iphone" | "ipad";
  appStore?: "iphone" | "ipad";
  device?: string | boolean;
  detach?: boolean;
  logLevel?: string;
  logFilter?: string;
  appArg?: string[];
  define?: string[];
  verbose?: boolean;
}

export interface ScreenshotCliOptions {
  output?: string;
  display?: ScreenshotDisplay;
  sim?: string;
  udid?: string;
}

export interface PreviewCliOptions extends RunCliOptions {
  output?: string;
  display?: ScreenshotDisplay;
  delay?: number;
  openSimulator?: boolean;
}

export interface SimsCliOptions {
  idiom?: "iphone" | "ipad";
  appStore?: "iphone" | "ipad";
}

export interface CleanSimsCliOptions {
  runtime?: string;
}

// Resolves run options from newton.json plus CLI-only flags (idiom, device, logging, etc.).
export async function resolveRunOptions(opts: RunCliOptions): Promise<RunOptions> {
  const config = await loadConfig();
  // --device (with or without a value) selects a connected device; otherwise use the simulator.
  const deviceName = typeof opts.device === "string" ? opts.device : undefined;
  const target = opts.device ? "device" : "sim";
  return {
    scheme: config.scheme,
    project: config.project,
    workspace: config.workspace,
    target,
    configuration: config.configuration,
    appName: config.appName,
    sim: config.preferredSimulator,
    idiom: opts.idiom,
    appStore: opts.appStore,
    device: deviceName,
    logs: !opts.detach,
    logLevel: opts.logLevel,
    logFilter: opts.logFilter,
    appArgs: opts.appArg ?? [],
    // Each --define NAME expands to two argv tokens (`-D`, `NAME`) so they survive
    // xcodebuild's OTHER_SWIFT_FLAGS parsing intact for swiftc.
    swiftFlags: (opts.define ?? []).flatMap((name) => ["-D", name]),
    verbose: opts.verbose ?? false,
  };
}

export async function resolveScreenshotOptions(opts: ScreenshotCliOptions) {
  const config = await loadConfig();
  return {
    output: opts.output,
    display: opts.display ?? "none" as const,
    sim: opts.sim ?? config.preferredSimulator,
    udid: opts.udid,
  };
}
