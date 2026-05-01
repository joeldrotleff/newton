import { CliFlags } from "../cli/flags.ts";
import { resolveDevice } from "../ios/device.ts";
import { discoverProject } from "../ios/project.ts";
import { resolveSimulator } from "../ios/simulator.ts";
import { build, resolveDerivedData } from "../ios/xcodebuild.ts";
import { fail } from "../util/errors.ts";
import { runOptionsFromFlags } from "./options.ts";

export async function buildCommand(flags: CliFlags): Promise<void> {
  const options = await runOptionsFromFlags(flags);
  if (!options.scheme) fail("Missing required --scheme <name>.");

  const target = options.target ?? "sim";
  const container = await discoverProject(options);
  const derivedData = await resolveDerivedData(options.derivedData);
  const destination = target === "device"
    ? await resolveDevice(options.device)
    : await resolveSimulator({
      sim: options.sim,
      udid: options.udid,
      idiom: options.idiom,
      appStore: options.appStore,
    });

  await build({ ...options, container, scheme: options.scheme, destination, target, derivedData });
}
