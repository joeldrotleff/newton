import { NewtonError } from "./errors.ts";

export interface CommandResult {
  code: number;
  stdout: string;
  stderr: string;
}

const decoder = new TextDecoder();

export function commandString(command: string, args: string[]): string {
  return [command, ...args.map((arg) => arg.includes(" ") ? JSON.stringify(arg) : arg)].join(" ");
}

export async function runCapture(
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

export async function runInherit(
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
  const status = await process.status;

  if (options.check !== false && status.code !== 0) {
    throw new NewtonError(
      `Command failed (${status.code}): ${commandString(command, args)}`,
      status.code,
    );
  }

  return status.code;
}

export async function runPipe(
  producerCommand: string,
  producerArgs: string[],
  consumerCommand: string,
  consumerArgs: string[],
  options: { cwd?: string } = {},
): Promise<void> {
  const producer = new Deno.Command(producerCommand, {
    args: producerArgs,
    cwd: options.cwd,
    stdout: "piped",
    stderr: "inherit",
  }).spawn();

  const consumer = new Deno.Command(consumerCommand, {
    args: consumerArgs,
    cwd: options.cwd,
    stdin: "piped",
    stdout: "inherit",
    stderr: "inherit",
  }).spawn();

  await producer.stdout.pipeTo(consumer.stdin);
  const [producerStatus, consumerStatus] = await Promise.all([producer.status, consumer.status]);

  if (producerStatus.code !== 0) {
    throw new NewtonError(
      `Command failed (${producerStatus.code}): ${commandString(producerCommand, producerArgs)}`,
      producerStatus.code,
    );
  }
  if (consumerStatus.code !== 0) {
    throw new NewtonError(
      `Command failed (${consumerStatus.code}): ${commandString(consumerCommand, consumerArgs)}`,
      consumerStatus.code,
    );
  }
}

export async function executableExists(command: string): Promise<boolean> {
  const result = await runCapture("/usr/bin/env", ["which", command], { check: false });
  return result.code === 0;
}
