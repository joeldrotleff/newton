#!/usr/bin/env -S deno run --allow-run --allow-read --allow-write --allow-env
import { runCli } from "./cli.ts";
import { NewtonError } from "./util/errors.ts";

try {
  await runCli(Deno.args);
} catch (error) {
  if (error instanceof NewtonError) {
    console.error(error.message);
    Deno.exit(error.exitCode);
  }
  throw error;
}
