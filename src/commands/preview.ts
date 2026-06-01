import { runApp } from "../ios/run.ts";
import { captureScreenshot } from "../ios/screenshot.ts";
import { resolveSimulator } from "../ios/simulator.ts";
import { fail } from "../util/errors.ts";
import { PreviewCliOptions, resolveRunOptions } from "./options.ts";

// Runs a named app-side preview and captures it as a screenshot.
export async function previewCommand(name: string, opts: PreviewCliOptions): Promise<void> {
  if (opts.device) {
    fail("`newton preview` captures simulator screenshots; omit --device.");
  }

  const runOpts = await resolveRunOptions(opts);
  const display = opts.display ?? "inline";
  const delay = opts.delay ?? 2;
  const simulator = await resolveSimulator({
    sim: runOpts.sim,
    idiom: runOpts.idiom,
    appStore: runOpts.appStore,
    preferred: runOpts.preferred,
  });

  await runApp({
    ...runOpts,
    // We already resolved the simulator above; pin runApp to it by udid and drop the
    // idiom/app-store filters so they don't re-trigger (or conflict with) selection.
    idiom: undefined,
    appStore: undefined,
    sim: undefined,
    udid: simulator.udid,
    appArgs: [...(runOpts.appArgs ?? []), "-NewtonPreview", name],
    logs: false,
    revealSimulator: opts.openSimulator ?? false,
  });
  await new Promise((resolve) => setTimeout(resolve, delay * 1000));

  console.log(`Taking screenshot '${name}'…`);
  const path = await captureScreenshot({
    output: opts.output,
    display,
    inlineWidth: opts.inlineWidth,
    udid: simulator.udid,
  });
  console.log(`Saved preview screenshot: ${path}`);
}
