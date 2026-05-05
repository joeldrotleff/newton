import { captureScreenshot } from "../ios/screenshot.ts";
import { resolveScreenshotOptions, ScreenshotCliOptions } from "./options.ts";

// Captures a screenshot from the selected simulator.
export async function screenshotCommand(opts: ScreenshotCliOptions): Promise<void> {
  const options = await resolveScreenshotOptions(opts);
  const path = await captureScreenshot(options);
  console.log(`Saved screenshot: ${path}`);
}
