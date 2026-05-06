import { NewtonError } from "./errors.ts";

export interface CommandResult {
  code: number;
  stdout: string;
  stderr: string;
}

export interface StreamingLine {
  stream: "stdout" | "stderr";
  text: string;
}

export interface StreamingResult {
  code: number;
}

const decoder = new TextDecoder();
const encoder = new TextEncoder();

export function commandString(command: string, args: string[]): string {
  return [command, ...args.map((arg) => arg.includes(" ") ? JSON.stringify(arg) : arg)].join(" ");
}

// Run a command to completion and return captured stdout/stderr for Newton to inspect.
export async function runCliCommand(
  command: string,
  args: string[],
  options: { cwd?: string; check?: boolean; env?: Record<string, string> } = {},
): Promise<CommandResult> {
  const result = await new Deno.Command(command, {
    args,
    cwd: options.cwd,
    env: options.env,
    stdout: "piped",
    stderr: "piped",
  }).output();

  const commandResult = {
    code: result.code,
    stdout: decoder.decode(result.stdout),
    stderr: decoder.decode(result.stderr),
  };

  if (options.check !== false && result.code !== 0) {
    throw new NewtonError(
      `Command failed (${result.code}): ${commandString(command, args)}\n${
        commandResult.stderr || commandResult.stdout
      }`,
      result.code,
    );
  }

  return commandResult;
}

// Run a command attached to the user's terminal, as if they invoked it directly.
export async function runCliCommandInTerminal(
  command: string,
  args: string[],
  options: { cwd?: string; check?: boolean } = {},
): Promise<number> {
  const process = new Deno.Command(command, {
    args,
    cwd: options.cwd,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  }).spawn();

  return await waitForProcess(command, args, process, options.check);
}

// Run a command live while letting Newton process stdout/stderr one line at a time.
export async function runCliCommandLiveStream(
  command: string,
  args: string[],
  onLine: (line: StreamingLine) => void | Promise<void>,
  options: { cwd?: string; check?: boolean; env?: Record<string, string> } = {},
): Promise<StreamingResult> {
  const process = new Deno.Command(command, {
    args,
    cwd: options.cwd,
    env: options.env,
    stdin: "inherit",
    stdout: "piped",
    stderr: "piped",
  }).spawn();

  const stdout = readStreamLines(process.stdout, "stdout", onLine);
  const stderr = readStreamLines(process.stderr, "stderr", onLine);
  const code = await waitForProcess(command, args, process, options.check);
  await Promise.all([stdout, stderr]);
  return { code };
}

async function readStreamLines(
  stream: ReadableStream<Uint8Array>,
  streamName: "stdout" | "stderr",
  onLine: (line: StreamingLine) => void | Promise<void>,
): Promise<void> {
  const reader = stream.getReader();
  let pending = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    pending += decoder.decode(value, { stream: true });
    const lines = pending.split(/\r?\n/);
    pending = lines.pop() ?? "";

    for (const text of lines) {
      await onLine({ stream: streamName, text });
    }
  }

  pending += decoder.decode();
  if (pending.length > 0) {
    await onLine({ stream: streamName, text: pending });
  }
}

async function waitForProcess(
  command: string,
  args: string[],
  process: Deno.ChildProcess,
  check = true,
): Promise<number> {
  let interrupted = false;
  let forceKillTimer: number | undefined;
  const handleInterrupt = () => {
    interrupted = true;
    Deno.stderr.writeSync(encoder.encode("\n"));
    try {
      process.kill("SIGINT");
    } catch {
      // The child may have already exited from the terminal's SIGINT.
    }
    forceKillTimer = setTimeout(() => {
      try {
        process.kill("SIGTERM");
      } catch {
        // Nothing left to terminate.
      }
    }, 1_000);
  };

  Deno.addSignalListener("SIGINT", handleInterrupt);
  try {
    const status = await process.status;

    if (forceKillTimer !== undefined) clearTimeout(forceKillTimer);
    if (interrupted) return status.code || 130;

    if (check !== false && status.code !== 0) {
      throw new NewtonError(
        `Command failed (${status.code}): ${commandString(command, args)}`,
        status.code,
      );
    }

    return status.code;
  } finally {
    Deno.removeSignalListener("SIGINT", handleInterrupt);
  }
}

export async function executableExists(command: string): Promise<boolean> {
  const result = await runCliCommand("/usr/bin/env", [
    "which", // Locate the executable using the caller's PATH.
    command,
  ], { check: false });
  return result.code === 0;
}
