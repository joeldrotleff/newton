import { resolveDevice } from "../ios/device.ts";
import { missingRequiredConfigFieldMessage } from "../ios/config.ts";
import { discoverProject } from "../ios/project.ts";
import { resolveSimulator } from "../ios/simulator.ts";
import { test } from "../ios/xcodebuild.ts";
import { fail } from "../util/errors.ts";
import { resolveRunOptions, TestCliOptions } from "./options.ts";

// Runs the configured scheme's tests on a simulator or connected device.
export async function testCommand(opts: TestCliOptions): Promise<void> {
  const options = await resolveRunOptions(opts);
  if (!options.scheme) fail(await missingRequiredConfigFieldMessage("scheme"));

  const target = options.target ?? "sim";
  const container = await discoverProject();
  const destination = target === "device"
    ? await resolveDevice(options.device)
    : await resolveSimulator({
      sim: options.sim,
      idiom: options.idiom,
      appStore: options.appStore,
      preferred: options.preferred,
    });

  await test({
    ...options,
    container,
    scheme: options.scheme,
    destination,
    target,
  });
}
