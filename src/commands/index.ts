import { CliFlags } from "../cli/flags.ts";
import { fail } from "../util/errors.ts";
import { buildCommand } from "./build.ts";
import { cleanSimsCommand } from "./clean-sims.ts";
import { createCommand } from "./create.ts";
import { devicesCommand } from "./devices.ts";
import { initCommand } from "./init.ts";
import { lspCommand } from "./lsp.ts";
import { openCommand } from "./open.ts";
import { previewCommand } from "./preview.ts";
import { runCommand } from "./run.ts";
import { screenshotCommand } from "./screenshot.ts";
import { simsCommand } from "./sims.ts";
import { teamsCommand } from "./teams.ts";

export async function handleCommand(command: string, flags: CliFlags): Promise<void> {
  switch (command) {
    case "init":
      return initCommand(flags);
    case "create":
      return createCommand(flags);
    case "sims":
      return simsCommand(flags);
    case "clean-sims":
      return cleanSimsCommand(flags);
    case "devices":
      return devicesCommand();
    case "teams":
      return teamsCommand();
    case "open":
      return openCommand(flags);
    case "build":
      return buildCommand(flags);
    case "run":
      return runCommand(flags);
    case "screenshot":
      return screenshotCommand(flags);
    case "preview":
      return previewCommand(flags);
    case "lsp":
      return lspCommand(flags);
    default:
      fail("Usage: newton <create|sims|clean-sims|devices|teams|open|build|run|screenshot|preview|lsp>");
  }
}
