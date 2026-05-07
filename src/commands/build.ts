import { resolveDevice } from "../ios/device.ts";
import { discoverProject } from "../ios/project.ts";
import { resolveSimulator } from "../ios/simulator.ts";
import { build } from "../ios/xcodebuild.ts";
import { fail } from "../util/errors.ts";
import { resolveRunOptions, RunCliOptions } from "./options.ts";

// Builds the configured scheme for a simulator or connected device.
export async function buildCommand(opts: RunCliOptions): Promise<void> {
  const options = await resolveRunOptions(opts);
  if (!options.scheme) fail("Missing scheme in newton.json. Run `newton init`.");

  const target = options.target ?? "sim";
  const container = await discoverProject();
  const destination = target === "device"
    ? await resolveDevice(options.device)
    : await resolveSimulator({
      sim: options.sim,
      idiom: options.idiom,
      appStore: options.appStore,
    });

  await build({
    ...options,
    container,
    scheme: options.scheme,
    destination,
    target,
  });
}
