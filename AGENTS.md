# Newton — Agent Guide

Standalone Deno CLI for iOS app build, run, screenshot, preview, and SourceKit-LSP workflows. iOS-only, macOS-only.

## Commands

```sh
deno task check       # type-check src/main.ts
deno task test        # run all tests under tests/
deno task compile     # produce ./newton standalone binary
deno task install     # compile + copy to ~/.local/bin/newton
deno fmt              # format (lineWidth 100, semicolons, double quotes)
```

Local run without compiling:

```sh
deno run --allow-run --allow-read --allow-write --allow-env src/main.ts <subcommand>
```

## Layout

- [src/main.ts](src/main.ts) — entry point; calls `runCli(Deno.args)`
- [src/cli.ts](src/cli.ts) — Cliffy command tree; one block per subcommand
- [src/commands/](src/commands/) — thin per-subcommand orchestrators
  - [options.ts](src/commands/options.ts) — `RunCliOptions`/`PreviewCliOptions` types and `resolveRunOptions` which layers CLI flags over `newton.json`
- [src/ios/](src/ios/) — domain logic (project discovery, xcodebuild, simulator/device, screenshot, signing, scaffold)
  - [config.ts](src/ios/config.ts) — `newton.json` schema and read/write
  - [project.ts](src/ios/project.ts) — `discoverProject()` (config → fs scan)
  - [xcodebuild.ts](src/ios/xcodebuild.ts) — `buildArgs`, `build`, `showBuildSettings`
  - [simulator.ts](src/ios/simulator.ts) — `resolveSimulator`, idiom/App Store filters, ranking
  - [run.ts](src/ios/run.ts) — `runApp` (build → install → launch → optional log stream)
- [src/util/](src/util/) — `errors.ts`, `paths.ts`, `process.ts`, `spinner.ts` (build progress)
- [templates/](templates/) — starter SwiftUI project rendered by `newton create`
- [tests/](tests/) — Deno test files; one per source module

## Architecture notes

- **`newton.json` is the source of truth** for scheme, project/workspace, configuration, appName, and preferred simulator. CLI flags only cover runtime concerns (idiom, device target, logging, app args, verbose). See commit `849c6b2`.
- **DerivedData** always lives at `.newton/DerivedData` ([defaultDerivedDataPath](src/ios/project.ts#L77)). There is no override flag.
- **Build logs** are written to `.newton/logs/<timestamp>.log` by [BuildLogger](src/util/spinner.ts); `newton build-log` opens the latest.
- **`run` defaults to logs ON.** Use `--detach` to launch and exit. Preview never streams logs.
- **`lsp` takes no flags** — it shells out to `xcode-build-server` using the config's scheme and Newton's derived data root, then writes `buildServer.json`.
- **Project discovery** prefers `newton.json` > single `.xcworkspace` > single `.xcodeproj`. SPM-generated `.swiftpm/.../package.xcworkspace` is filtered out (commit `3b3c02b`).

## Conventions

- Subcommand option groups are inlined per-command in [cli.ts](src/cli.ts) rather than shared via helpers — Cliffy's generic `Command` type erases option types when threaded through helpers, breaking `.action()` typing. See the comment near the top of [cli.ts](src/cli.ts).
- Cliffy converts kebab-case flags (`--bundle-id`) to camelCase keys (`bundleId`) on the options object.
- Inline comments next to xcodebuild/xcrun args explain *why* the flag is passed (commit `f043cae`).
- `fail(msg)` from [util/errors.ts](src/util/errors.ts) for user-facing errors; throws so subprocess paths unwind cleanly.

## Testing

- Pure-function tests dominate (`buildArgs`, `launchArguments`, simulator ranking, option resolution).
- File-system tests use `Deno.makeTempDir()` + `Deno.chdir()` and clean up in `finally`. macOS tempdirs resolve through `/private/var/...` after `chdir`, so derive expected paths from `Deno.cwd()` after the chdir, not from the original `makeTempDir()` return.
- No subprocess mocking — anything that shells out to `xcodebuild` / `xcrun` is exercised manually.

## Common gotchas

- After editing CLI flag definitions, also update the matching `*CliOptions` type in [src/commands/options.ts](src/commands/options.ts) — TypeScript will not catch missing CLI types because Cliffy options are loosely typed at the callsite.
- `--device` is a `[name:string]` flag (optional value). Boolean form selects a connected device interactively; string form pins by name.
- Don't add a `--derived-data` flag back. It was removed deliberately; everything assumes `.newton/DerivedData`.
