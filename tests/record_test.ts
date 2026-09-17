import { assertRejects } from "@std/assert";
import { recordSimulator, validateRecordingDuration } from "../src/ios/record.ts";
import { NewtonError } from "../src/util/errors.ts";

Deno.test("record accepts indefinite and positive finite durations", () => {
  for (const duration of [undefined, 0.1, 10, 2147483.647]) {
    validateRecordingDuration(duration);
  }
});

Deno.test("record rejects invalid durations before accessing the simulator or filesystem", async () => {
  for (const duration of [0, -1, NaN, Infinity, -Infinity, 2147484]) {
    await assertRejects(
      () => recordSimulator({ duration }),
      NewtonError,
      "Recording duration must be a positive number",
    );
  }
});
