import { assertEquals } from "@std/assert";
import { parseCli, parseFlags } from "../src/cli.ts";

Deno.test("parseCli treats iOS commands as top-level commands", () => {
  const parsed = parseCli(["preview", "metricCards", "--scheme", "Axion"]);

  assertEquals(parsed.command, "preview");
  assertEquals(parsed.flags._arg0, "metricCards");
  assertEquals(parsed.flags.scheme, "Axion");
});

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
