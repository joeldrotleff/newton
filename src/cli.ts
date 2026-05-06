import { Command, EnumType } from "@cliffy/command";
import { CompletionsCommand } from "@cliffy/command/completions";
import { HelpCommand } from "@cliffy/command/help";

import { buildLogCommand } from "./commands/build-log.ts";
import { buildCommand } from "./commands/build.ts";
import { cleanSimsCommand } from "./commands/clean-sims.ts";
import { createCommand } from "./commands/create.ts";
import { devicesCommand } from "./commands/devices.ts";
import { initCommand } from "./commands/init.ts";
import { lspCommand } from "./commands/lsp.ts";
import { openCommand } from "./commands/open.ts";
import { previewCommand } from "./commands/preview.ts";
import { runCommand } from "./commands/run.ts";
import { screenshotCommand } from "./commands/screenshot.ts";
import { simsCommand } from "./commands/sims.ts";
import { teamsCommand } from "./commands/teams.ts";

const VERSION = "0.1.0";

// Constrained enum types — cliffy validates the value and feeds them to shell completions.
const idiomType = new EnumType(["iphone", "ipad"]);
const displayType = new EnumType(["inline", "open", "none"]);

// Subcommand option groups are inlined per-command rather than shared via helpers,
// because cliffy's deeply-generic Command type erases option types when threaded
// through helper functions, which silently breaks `.action()` typing.

export function buildCli() {
  return new Command()
    .name("newton")
    .version(VERSION)
    .description(
      "iOS automation toolkit: scaffold, build, run, screenshot, and preview Xcode projects.",
    )
    .meta("Docs", "https://github.com/joeldrotleff/newton")
    .action(function () {
      this.showHelp();
    })
    //
    // init
    //
    .command(
      "init",
      new Command()
        .description("Create newton.json from the current Xcode project & simulator defaults.")
        .option("-f, --force", "Overwrite an existing newton.json")
        .example("Basic", "newton init")
        .example("Overwrite", "newton init --force")
        .action((options) => initCommand(options)),
    )
    //
    // create
    //
    .command(
      "create",
      new Command()
        .description("Scaffold a new SwiftUI iOS project and write its Newton config.")
        .arguments("<name:string>")
        .option("--output <path:file>", "Directory in which to create the project")
        .option("--bundle-id <id:string>", "Bundle identifier (e.g. com.acme.MyApp)")
        .option("--team-id <id:string>", "Apple Development team ID for code signing")
        .option("--no-team", "Skip development-team selection")
        .example("Quickstart", "newton create MyApp")
        .example("Custom bundle id", "newton create MyApp --bundle-id com.acme.MyApp")
        .example("No signing", "newton create MyApp --no-team")
        .action((options, name) => createCommand(name, options)),
    )
    //
    // sims
    //
    .command(
      "sims",
      new Command()
        .type("idiom", idiomType)
        .description("List installed iOS simulators and mark Newton's default choice.")
        .option("--idiom <idiom:idiom>", "Filter to iphone or ipad simulators")
        .option("--app-store <idiom:idiom>", "Filter to App Store-compatible simulators")
        .example("All simulators", "newton sims")
        .example("iPad only", "newton sims --idiom ipad")
        .action((options) => simsCommand(options)),
    )
    //
    // clean-sims
    //
    .command(
      "clean-sims",
      new Command()
        .description("Delete unavailable (orphaned) simulators or all simulators on a runtime.")
        .option(
          "--runtime <version:string>",
          "Delete only simulators on this runtime (e.g. iOS-17-5)",
        )
        .example("Cleanup orphans", "newton clean-sims")
        .example("Clean by runtime", "newton clean-sims --runtime iOS-17-5")
        .action((options) => cleanSimsCommand(options)),
    )
    //
    // devices
    //
    .command(
      "devices",
      new Command()
        .description("List connected physical iPhone & iPad devices visible to Xcode.")
        .action(() => devicesCommand()),
    )
    //
    // teams
    //
    .command(
      "teams",
      new Command()
        .description("List local Apple Development signing teams discovered from certificates.")
        .action(() => teamsCommand()),
    )
    //
    // open
    //
    .command(
      "open",
      new Command()
        .description("Open the discovered or configured Xcode project/workspace.")
        .option("--project <path:file>", "Path to .xcodeproj")
        .option("--workspace <path:file>", "Path to .xcworkspace")
        .action((options) => openCommand(options)),
    )
    //
    // build
    //
    .command(
      "build",
      new Command()
        .type("idiom", idiomType)
        .description("Build the selected scheme for a simulator or connected device.")
        .option("--scheme <name:string>", "Xcode scheme to build")
        .option("--project <path:file>", "Path to .xcodeproj")
        .option("--workspace <path:file>", "Path to .xcworkspace")
        .option("--configuration <name:string>", "Xcode build configuration (e.g. Debug, Release)")
        .option("--derived-data <path:file>", "Custom DerivedData directory")
        .option("--sim <name:string>", "Simulator name (e.g. 'iPhone 15')")
        .option("--udid <id:string>", "Simulator UDID")
        .option("--idiom <idiom:idiom>", "Device idiom")
        .option("--app-store <idiom:idiom>", "Pick an App Store-compatible simulator")
        .option("--device [name:string]", "Build for a connected device (optional name)")
        .option("--verbose", "Print verbose xcodebuild output")
        .example("Build for sim", "newton build --scheme MyApp")
        .example("Build for device", "newton build --scheme MyApp --device")
        .action((options) => buildCommand(options)),
    )
    //
    // build-log
    //
    .command(
      "build-log",
      new Command()
        .description("Open the latest Newton xcodebuild log in $VISUAL, $EDITOR, or nvim.")
        .example("Open latest build log", "newton build-log")
        .action(() => buildLogCommand()),
    )
    //
    // run
    //
    .command(
      "run",
      new Command()
        .type("idiom", idiomType)
        .description("Build, install, and launch the app, optionally streaming logs.")
        .option("--scheme <name:string>", "Xcode scheme to run")
        .option("--project <path:file>", "Path to .xcodeproj")
        .option("--workspace <path:file>", "Path to .xcworkspace")
        .option("--configuration <name:string>", "Xcode build configuration")
        .option("--derived-data <path:file>", "Custom DerivedData directory")
        .option("--sim <name:string>", "Simulator name")
        .option("--udid <id:string>", "Simulator UDID")
        .option("--idiom <idiom:idiom>", "Device idiom")
        .option("--app-store <idiom:idiom>", "Pick an App Store-compatible simulator")
        .option("--device [name:string]", "Run on a connected device (optional name)")
        .option("--no-logs", "Don't stream device/simulator logs")
        .option("--detach", "Launch the app, then disconnect without streaming logs")
        .option("--log-level <level:string>", "os_log level filter (e.g. debug, info)")
        .option("--log-filter <predicate:string>", "os_log NSPredicate filter")
        .option("--app-arg <arg:string>", "Extra launch argument (repeatable)", { collect: true })
        .option("--verbose", "Print verbose xcodebuild output")
        .example("Run on default sim", "newton run --scheme MyApp")
        .example("Run detached", "newton run --scheme MyApp --detach")
        .example("Run on device", "newton run --scheme MyApp --device")
        .action((options) => runCommand(options)),
    )
    //
    // screenshot
    //
    .command(
      "screenshot",
      new Command()
        .type("idiom", idiomType)
        .type("display", displayType)
        .description("Capture a screenshot from the selected simulator.")
        .option("--sim <name:string>", "Simulator name")
        .option("--udid <id:string>", "Simulator UDID")
        .option("--idiom <idiom:idiom>", "Device idiom")
        .option("--app-store <idiom:idiom>", "Pick an App Store-compatible simulator")
        .option("--output <path:file>", "Output file path")
        .option("--display <mode:display>", "How to display the screenshot", {
          default: "none" as const,
        })
        .example("Save to disk", "newton screenshot --output shot.png")
        .example("Inline preview", "newton screenshot --display inline")
        .action((options) => screenshotCommand(options)),
    )
    //
    // preview
    //
    .command(
      "preview",
      new Command()
        .type("idiom", idiomType)
        .type("display", displayType)
        .description("Run a named app-side preview and capture it as a screenshot.")
        .arguments("<name:string>")
        .option("--scheme <name:string>", "Xcode scheme to run")
        .option("--project <path:file>", "Path to .xcodeproj")
        .option("--workspace <path:file>", "Path to .xcworkspace")
        .option("--configuration <name:string>", "Xcode build configuration")
        .option("--derived-data <path:file>", "Custom DerivedData directory")
        .option("--sim <name:string>", "Simulator name")
        .option("--udid <id:string>", "Simulator UDID")
        .option("--idiom <idiom:idiom>", "Device idiom")
        .option("--app-store <idiom:idiom>", "Pick an App Store-compatible simulator")
        .option("--device [name:string]", "Run on a connected device (optional name)")
        .option("--output <path:file>", "Output screenshot file path")
        .option("--display <mode:display>", "How to display the screenshot", {
          default: "inline" as const,
        })
        .option("--delay <seconds:number>", "Seconds to wait before capturing", { default: 2 })
        .option("--app-arg <arg:string>", "Extra launch argument (repeatable)", { collect: true })
        .option("--logs", "Stream device/simulator logs while running")
        .option("--verbose", "Print verbose xcodebuild output")
        .example("Capture preview", "newton preview metricCards --scheme MyApp")
        .example("Open in viewer", "newton preview metricCards --scheme MyApp --display open")
        .action((options, name) => previewCommand(name, options)),
    )
    //
    // lsp
    //
    .command(
      "lsp",
      new Command()
        .type("idiom", idiomType)
        .description("Generate SourceKit-LSP support files via xcode-build-server.")
        .option("--scheme <name:string>", "Xcode scheme to introspect")
        .option("--project <path:file>", "Path to .xcodeproj")
        .option("--workspace <path:file>", "Path to .xcworkspace")
        .option("--configuration <name:string>", "Xcode build configuration")
        .option("--derived-data <path:file>", "Custom DerivedData directory")
        .option("--sim <name:string>", "Simulator name")
        .option("--udid <id:string>", "Simulator UDID")
        .option("--idiom <idiom:idiom>", "Device idiom")
        .option("--app-store <idiom:idiom>", "Pick an App Store-compatible simulator")
        .option("--source-root <path:file>", "Copy buildServer.json to this directory")
        .option("--verbose", "Print verbose xcodebuild output")
        .example("Generate LSP files", "newton lsp --scheme MyApp")
        .example("Copy to source root", "newton lsp --scheme MyApp --source-root ./MyApp")
        .action((options) => lspCommand(options)),
    )
    //
    // help / completions (built-in)
    //
    .command("help", new HelpCommand().global())
    .command("completions", new CompletionsCommand());
}

export async function runCli(args: string[]): Promise<void> {
  await buildCli().parse(args);
}
