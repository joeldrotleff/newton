import { assertEquals, assertStringIncludes } from "@std/assert";
import { buildCli } from "../src/cli.ts";

Deno.test("buildCli registers all top-level subcommands", () => {
  const cli = buildCli();
  const names = cli.getCommands().map((c) => c.getName()).sort();

  assertEquals(names, [
    "build",
    "build-log",
    "clean-sims",
    "completions",
    "create",
    "devices",
    "help",
    "init",
    "lsp",
    "open",
    "preview",
    "run",
    "screenshot",
    "sims",
    "teams",
  ]);
});

Deno.test("preview subcommand declares scheme, display, delay, and app-arg options", () => {
  const preview = buildCli().getCommand("preview");
  if (!preview) throw new Error("preview command not found");

  const optionNames = preview.getOptions().map((o) => o.name);
  for (const flag of ["scheme", "display", "delay", "app-arg", "logs"]) {
    assertEquals(
      optionNames.includes(flag),
      true,
      `expected --${flag} on 'preview', got: ${optionNames.join(", ")}`,
    );
  }
});

Deno.test("top-level help mentions newton", () => {
  const help = buildCli().getHelp();
  assertStringIncludes(help, "newton");
});
