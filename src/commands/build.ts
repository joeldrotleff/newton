import { resolveDevice } from "../ios/device.ts";
import { discoverProject } from "../ios/project.ts";
import { resolveSimulator } from "../ios/simulator.ts";
import { build, BuildOptions, macDestination } from "../ios/xcodebuild.ts";
import { missingRequiredConfigFieldMessage } from "../ios/config.ts";
import { fail } from "../util/errors.ts";
import { resolveRunOptions, RunCliOptions } from "./options.ts";

// Builds the configured scheme for a simulator or connected device.
export async function buildCommand(opts: RunCliOptions): Promise<void> {
  const options = await resolveRunOptions(opts);
  if (!options.scheme) fail(await missingRequiredConfigFieldMessage("scheme"));

  const target = options.target ?? "sim";
  const container = await discoverProject();
  const destination = await resolveBuildDestination(options, target);

  await build({
    ...options,
    container,
    scheme: options.scheme,
    destination,
    target,
  });
}

async function resolveBuildDestination(
  options: Awaited<ReturnType<typeof resolveRunOptions>>,
  target: BuildOptions["target"],
): Promise<BuildOptions["destination"]> {
  if (target === "mac") return macDestination;
  const platform = options.platform === "watchos" ? "watchos" : "ios";
  if (target === "device") return await resolveDevice(options.device, platform);
  return await resolveSimulator({
    platform,
    sim: options.sim,
    idiom: options.idiom,
    appStore: options.appStore,
    preferred: options.preferred,
  });
}
