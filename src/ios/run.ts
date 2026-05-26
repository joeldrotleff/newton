import { fail } from "../util/errors.ts";
import { missingRequiredConfigFieldMessage } from "./config.ts";
import { runCliCommand } from "../util/process.ts";
import { locateBuiltApp, readBundleId } from "./appBundle.ts";
import { installDeviceApp, launchDeviceApp, resolveDevice } from "./device.ts";
import { discoverProject } from "./project.ts";
import { bootSimulator, launchSimulatorApp, openSimulator, resolveSimulator } from "./simulator.ts";
import { removeSession, writeSession } from "./session.ts";
import { build } from "./xcodebuild.ts";

export interface RunOptions {
  scheme?: string;
  project?: string;
  workspace?: string;
  target?: "sim" | "device";
  configuration?: string;
  appName?: string;
  sim?: string;
  idiom?: "iphone" | "ipad";
  appStore?: "iphone" | "ipad";
  device?: string;
  logs?: boolean;
  logLevel?: string;
  logFilter?: string;
  appArgs?: string[];
  verbose?: boolean;
}

export async function runApp(options: RunOptions): Promise<void> {
  if (!options.scheme) fail(await missingRequiredConfigFieldMessage("scheme"));
  const target = options.target ?? "sim";
  const container = await discoverProject();
  const appArgs = launchArguments(options);

  if (target === "device") {
    const device = await resolveDevice(options.device);
    await build({
      ...options,
      container,
      scheme: options.scheme,
      destination: device,
      target,
    });
    const appPath = await locateBuiltApp({
      ...options,
      container,
      scheme: options.scheme,
      destination: device,
      target,
    });
    const bundleId = await readBundleId(appPath);
    await installDeviceApp(device, appPath);
    await launchDeviceApp(device, bundleId, appArgs, options.logs ?? true);
    return;
  }

  const simulator = await resolveSimulator({
    sim: options.sim,
    idiom: options.idiom,
    appStore: options.appStore,
  });
  await bootSimulator(simulator.udid);
  await openSimulator(simulator.udid);

  // Write session file so `newton reload` can find this process.
  const cwd = Deno.cwd();
  await writeSession({
    pid: Deno.pid,
    scheme: options.scheme!,
    simulatorUdid: simulator.udid,
    simulatorName: simulator.name,
    cwd,
    startedAt: new Date().toISOString(),
  });

  try {
    await buildInstallLaunch(options, container, simulator, appArgs);

    // If logs are enabled, enter a reload loop that listens for SIGUSR1.
    if (options.logs ?? true) {
      await reloadLoop(options, container, simulator, appArgs, cwd);
    }
  } finally {
    await removeSession(cwd);
  }
}

// Build, install, terminate old instance, and launch the app.
async function buildInstallLaunch(
  options: RunOptions,
  container: Awaited<ReturnType<typeof discoverProject>>,
  simulator: Awaited<ReturnType<typeof resolveSimulator>>,
  appArgs: string[],
): Promise<void> {
  await build({
    ...options,
    container,
    scheme: options.scheme!,
    destination: simulator,
    target: "sim",
  });
  const appPath = await locateBuiltApp({
    ...options,
    container,
    scheme: options.scheme!,
    destination: simulator,
    target: "sim",
  });
  const bundleId = await readBundleId(appPath);
  await runCliCommand("xcrun", [
    "simctl", // Run the Simulator control tool through xcrun.
    "terminate", // Stop any currently running copy before installing the new build.
    simulator.udid,
    bundleId,
  ], { check: false });
  await runCliCommand("xcrun", [
    "simctl", // Run the Simulator control tool through xcrun.
    "install", // Install the built .app onto the selected simulator.
    simulator.udid,
    appPath,
  ]);

  if (!(options.logs ?? true)) {
    // Detached mode — just launch without streaming.
    await launchSimulatorApp(simulator.udid, bundleId, appArgs, false);
  }
}

// Spawn the app with --console-pty for log streaming, but in a way we can kill and restart.
// Waits for SIGUSR1 to trigger a reload cycle. Exits when the app process exits normally
// (i.e., not killed by a reload).
async function reloadLoop(
  options: RunOptions,
  container: Awaited<ReturnType<typeof discoverProject>>,
  simulator: Awaited<ReturnType<typeof resolveSimulator>>,
  appArgs: string[],
  cwd: string,
): Promise<void> {
  const appPath = await locateBuiltApp({
    ...options,
    container,
    scheme: options.scheme!,
    destination: simulator,
    target: "sim",
  });
  const bundleId = await readBundleId(appPath);

  while (true) {
    // Spawn log-streaming process.
    const logProcess = new Deno.Command("xcrun", {
      args: [
        "simctl",
        "launch",
        "--console-pty", // Stream app console output through this terminal.
        simulator.udid,
        bundleId,
        ...appArgs,
      ],
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    }).spawn();

    // Wait for either the process to exit, a SIGUSR1 reload, or SIGINT quit.
    const signal = await raceProcessAndSignal(logProcess);

    if (signal === "exited") {
      // App exited on its own (crash, user quit, etc.) — we're done.
      break;
    }

    if (signal === "interrupted") {
      // Ctrl-C — kill the child, clean up, and re-raise SIGINT for the shell.
      try {
        logProcess.kill("SIGTERM");
      } catch { /* already exited */ }
      try {
        await logProcess.status;
      } catch { /* ignore */ }
      await removeSession(cwd);
      // Re-raise SIGINT so the shell sees a proper signal exit and redraws the prompt.
      Deno.kill(Deno.pid, "SIGINT");
      return;
    }

    // Reload requested — kill the log stream, rebuild, and restart.
    console.log("\n⟳ Reload signal received — rebuilding…");
    try {
      logProcess.kill("SIGTERM");
    } catch {
      // Already exited.
    }
    try {
      await logProcess.status;
    } catch {
      // Ignore.
    }

    try {
      await buildInstallLaunch(options, container, simulator, appArgs);
    } catch (err) {
      console.error(`\n✗ Reload build failed: ${err}`);
      console.log("Waiting for next reload signal…");
      // Wait for another SIGUSR1 before retrying.
      await waitForSignal();
    }
  }
}

type LoopSignal = "reload" | "exited" | "interrupted";

// Race between process exit, SIGUSR1 (reload), and SIGINT (quit).
function raceProcessAndSignal(process: Deno.ChildProcess): Promise<LoopSignal> {
  return new Promise<LoopSignal>((resolve) => {
    let settled = false;

    const reloadHandler = () => {
      if (settled) return;
      settled = true;
      Deno.removeSignalListener("SIGUSR1", reloadHandler);
      Deno.removeSignalListener("SIGINT", interruptHandler);
      resolve("reload");
    };

    const interruptHandler = () => {
      if (settled) return;
      settled = true;
      Deno.removeSignalListener("SIGUSR1", reloadHandler);
      Deno.removeSignalListener("SIGINT", interruptHandler);
      resolve("interrupted");
    };

    Deno.addSignalListener("SIGUSR1", reloadHandler);
    Deno.addSignalListener("SIGINT", interruptHandler);

    process.status.then(() => {
      if (settled) return;
      settled = true;
      Deno.removeSignalListener("SIGUSR1", reloadHandler);
      Deno.removeSignalListener("SIGINT", interruptHandler);
      resolve("exited");
    });
  });
}

// Block until SIGUSR1 is received.
function waitForSignal(): Promise<void> {
  return new Promise<void>((resolve) => {
    const handler = () => {
      Deno.removeSignalListener("SIGUSR1", handler);
      resolve();
    };
    Deno.addSignalListener("SIGUSR1", handler);
  });
}

export function launchArguments(options: RunOptions): string[] {
  const args = [...(options.appArgs ?? [])];
  if (options.logLevel) args.push("-LogLevel", options.logLevel);
  if (options.logFilter) args.push("-LogFilter", options.logFilter);
  return args;
}
