import { CliFlags } from "../cli/flags.ts";
import { captureScreenshot } from "../ios/screenshot.ts";
import { screenshotOptionsFromFlags } from "./options.ts";

// Captures a screenshot from the selected simulator.
export async function screenshotCommand(flags: CliFlags): Promise<void> {
  const options = await screenshotOptionsFromFlags(flags);
  const path = await captureScreenshot(options);
  console.log(`Saved screenshot: ${path}`);
}
