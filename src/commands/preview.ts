import { captureScreenshot } from "../ios/screenshot.ts";
import { runApp } from "../ios/run.ts";
import { PreviewCliOptions, resolveRunOptions } from "./options.ts";

// Runs a named app-side preview and captures it as a screenshot.
export async function previewCommand(name: string, opts: PreviewCliOptions): Promise<void> {
  const runOpts = await resolveRunOptions(opts);
  const display = opts.display ?? "inline";
  const delay = opts.delay ?? 2;

  await runApp({
    ...runOpts,
    appArgs: [...(runOpts.appArgs ?? []), "-NewtonPreview", name],
    logs: false,
  });
  await new Promise((resolve) => setTimeout(resolve, delay * 1000));

  const path = await captureScreenshot({
    output: opts.output,
    display,
    sim: runOpts.sim,
  });
  console.log(`Saved preview screenshot: ${path}`);
}
