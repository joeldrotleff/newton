import { openUrlInBootedSimulator } from "../ios/open.ts";
import { fail } from "../util/errors.ts";

export async function openCommand(link: string): Promise<void> {
  validateLink(link);
  const simulator = await openUrlInBootedSimulator(link);
  console.log(`Opened link in ${simulator.name}: ${link}`);
}

function validateLink(link: string): void {
  try {
    const url = new URL(link);
    if (url.protocol === "http:" || url.protocol === "https:") return;
    fail("Link must use http:// or https://.");
  } catch {
    fail(`Invalid link: ${link}`);
  }
}
