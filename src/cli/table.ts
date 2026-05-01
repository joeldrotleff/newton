export function printTable(headers: string[], rows: string[][]): void {
  const widths = headers.map((header, index) =>
    Math.max(header.length, ...rows.map((row) => String(row[index] ?? "").length))
  );
  const format = (row: string[]) =>
    row.map((cell, index) => String(cell).padEnd(widths[index])).join("  ");
  console.log(format(headers));
  console.log(widths.map((width) => "-".repeat(width)).join("  "));
  for (const row of rows) console.log(format(row));
}
