export type CliFlagValue = string | boolean | string[];
export type CliFlags = Record<string, CliFlagValue>;

export function stringFlag(flags: CliFlags, name: string): string | undefined {
  const value = flags[name];
  return typeof value === "string" ? value : undefined;
}

export function stringListFlag(flags: CliFlags, name: string): string[] {
  const value = flags[name];
  if (!value) return [];
  return Array.isArray(value) ? value : [String(value)];
}

export function booleanFlag(flags: CliFlags, name: string): boolean | undefined {
  if (flags[`no-${name}`]) return false;
  return typeof flags[name] === "boolean" ? flags[name] : undefined;
}
