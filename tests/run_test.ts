import { assertEquals } from "@std/assert";
import { launchArguments } from "../src/ios/run.ts";

Deno.test("launchArguments returns app args verbatim when no log filters set", () => {
  assertEquals(launchArguments({ appArgs: ["--foo", "bar"] }), ["--foo", "bar"]);
});

Deno.test("launchArguments appends -LogLevel and -LogFilter after app args", () => {
  const args = launchArguments({
    appArgs: ["--seed", "42"],
    logLevel: "debug",
    logFilter: "subsystem == 'com.acme'",
  });
  assertEquals(args, [
    "--seed",
    "42",
    "-LogLevel",
    "debug",
    "-LogFilter",
    "subsystem == 'com.acme'",
  ]);
});

Deno.test("launchArguments returns empty array when nothing supplied", () => {
  assertEquals(launchArguments({}), []);
});
