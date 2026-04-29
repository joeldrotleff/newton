import { assertEquals } from "@std/assert";
import { parseFlags } from "../src/cli.ts";

Deno.test("parseFlags handles repeated app args and booleans", () => {
  const parsed = parseFlags([
    "metricCards",
    "--scheme",
    "Axion",
    "--no-logs",
    "--app-arg",
    "-SomeFlag",
    "--app-arg=value",
  ]);

  assertEquals(parsed.positional, ["metricCards"]);
  assertEquals(parsed.flags.scheme, "Axion");
  assertEquals(parsed.flags["no-logs"], true);
  assertEquals(parsed.flags["app-arg"], ["-SomeFlag", "value"]);
});
