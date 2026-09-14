import { assertEquals } from "@std/assert";
import { timestampLine } from "../src/util/process.ts";

Deno.test("timestampLine prefixes an ISO timestamp", () => {
  const date = new Date("2026-08-28T21:35:12.123Z");
  assertEquals(
    timestampLine("ACK! DROPPED FRAME", date),
    "[2026-08-28T21:35:12.123Z] ACK! DROPPED FRAME",
  );
});
