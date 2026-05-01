import { CliFlags } from "../cli/flags.ts";
import { captureScreenshot } from "../ios/screenshot.ts";
import { runApp } from "../ios/run.ts";
import { fail } from "../util/errors.ts";
import { previewOptionsFromFlags, runOptionsFromFlags } from "./options.ts";

export async function previewCommand(flags: CliFlags): Promise<void> {
  const options = await previewOptionsFromFlags(flags);
  if (!options.name) fail("Usage: newton preview <name> --scheme <scheme>");

  await runApp({
    ...await runOptionsFromFlags(flags),
    appArgs: [...options.appArgs, "-NewtonPreview", options.name],
    logs: options.logs,
  });
  await new Promise((resolve) => setTimeout(resolve, options.delaySeconds * 1000));

  const path = await captureScreenshot({
    output: options.output,
    display: options.display,
    sim: options.sim,
    udid: options.udid,
  });
  console.log(`Saved preview screenshot: ${path}`);
}
