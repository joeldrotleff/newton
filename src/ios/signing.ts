import { fail } from "../util/errors.ts";
import { runCapture } from "../util/process.ts";
import { join } from "../util/paths.ts";

export interface DevelopmentTeam {
  teamId: string;
  organization: string;
  commonName: string;
}

export async function listDevelopmentTeams(): Promise<DevelopmentTeam[]> {
  const result = await runCapture("security", [
    "find-certificate",
    "-a",
    "-c",
    "Apple Development",
    "-p",
  ], { check: false });
  if (result.code !== 0 || !result.stdout.trim()) return [];

  const teams = new Map<string, DevelopmentTeam>();
  for (const pem of splitCertificates(result.stdout)) {
    const subject = await certificateSubject(pem);
    const fields = parseCertificateSubject(subject);
    const teamId = fields.OU;
    const commonName = fields.CN;
    if (!teamId || !commonName?.startsWith("Apple Development:")) continue;

    teams.set(teamId, {
      teamId,
      organization: fields.O ?? "Unknown Organization",
      commonName,
    });
  }

  return [...teams.values()].toSorted((left, right) =>
    left.organization.localeCompare(right.organization) || left.teamId.localeCompare(right.teamId)
  );
}

export function parseCertificateSubject(subject: string): Record<string, string> {
  const normalized = subject.replace(/^subject=/, "");
  const fields: Record<string, string> = {};

  for (const part of splitEscaped(normalized, ",")) {
    const [key, ...valueParts] = splitEscaped(part, "=");
    if (!key || valueParts.length === 0) continue;
    fields[key.trim()] = unescapeSubjectValue(valueParts.join("="));
  }

  return fields;
}

export async function chooseDevelopmentTeam(): Promise<string | undefined> {
  const teams = await listDevelopmentTeams();
  if (teams.length === 0) {
    console.log(
      "No Apple Development signing teams found; project will be created without DEVELOPMENT_TEAM.",
    );
    return undefined;
  }

  console.log("Available Apple Development teams:");
  teams.forEach((team, index) => {
    console.log(`  ${index + 1}) ${team.organization} (${team.teamId})`);
    console.log(`     ${team.commonName}`);
  });
  console.log(`  ${teams.length + 1}) Skip signing team for now`);

  while (true) {
    const answer = await readLine(`Select a signing team [1-${teams.length + 1}]: `);
    if (answer === null) fail("No signing team selected.");
    const choice = Number(answer.trim());
    if (Number.isInteger(choice) && choice >= 1 && choice <= teams.length) {
      return teams[choice - 1].teamId;
    }
    if (choice === teams.length + 1) return undefined;
    console.log(`Enter a number from 1 to ${teams.length + 1}.`);
  }
}

async function readLine(message: string): Promise<string | null> {
  await Deno.stdout.write(new TextEncoder().encode(message));
  const buffer = new Uint8Array(1024);
  const bytesRead = await Deno.stdin.read(buffer);
  if (bytesRead === null) return null;
  return new TextDecoder().decode(buffer.subarray(0, bytesRead)).split(/\r?\n/, 1)[0];
}

function splitCertificates(pemBundle: string): string[] {
  const matches = pemBundle.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g);
  return matches ?? [];
}

async function certificateSubject(pem: string): Promise<string> {
  const tempDir = await Deno.makeTempDir();
  const certPath = join(tempDir, "certificate.pem");
  try {
    await Deno.writeTextFile(certPath, pem);
    const result = await runCapture("openssl", [
      "x509",
      "-in",
      certPath,
      "-noout",
      "-subject",
      "-nameopt",
      "RFC2253",
    ]);
    return result.stdout.trim();
  } finally {
    await Deno.remove(tempDir, { recursive: true }).catch(() => {});
  }
}

function splitEscaped(value: string, separator: string): string[] {
  const parts: string[] = [];
  let current = "";
  let escaped = false;

  for (const character of value) {
    if (escaped) {
      current += character;
      escaped = false;
      continue;
    }
    if (character === "\\") {
      current += character;
      escaped = true;
      continue;
    }
    if (character === separator) {
      parts.push(current);
      current = "";
      continue;
    }
    current += character;
  }

  parts.push(current);
  return parts;
}

function unescapeSubjectValue(value: string): string {
  return value.trim().replaceAll("\\,", ",").replaceAll("\\=", "=").replaceAll("\\\\", "\\");
}
