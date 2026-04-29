export class NewtonError extends Error {
  constructor(message: string, readonly exitCode = 1) {
    super(message);
    this.name = "NewtonError";
  }
}

export function fail(message: string, exitCode = 1): never {
  throw new NewtonError(message, exitCode);
}

export function assertPresent(value: string | undefined, flagName: string): string {
  if (!value) fail(`Missing required ${flagName}.`);
  return value;
}
