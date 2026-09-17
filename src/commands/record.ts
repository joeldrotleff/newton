import { loadConfig } from "../ios/config.ts";
import { recordSimulator } from "../ios/record.ts";
import { fail } from "../util/errors.ts";
import { RecordCliOptions } from "./options.ts";

export async function recordCommand(opts: RecordCliOptions): Promise<void> {
  const config = await loadConfig();
  if (config.platform === "macos") fail("Simulator recording supports iOS and watchOS only.");
  const path = await recordSimulator({
    ...opts,
    platform: config.platform ?? "ios",
    preferred: config.preferredSimulator,
  });
  console.log(`Saved recording: ${path}`);
}
