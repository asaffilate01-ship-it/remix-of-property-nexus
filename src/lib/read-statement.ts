import { parseStatementCsv, parseStatementLines } from "./statement-import";
export async function readStatement(file: File, currency = "GBP") {
  if (file.size > 10 * 1024 * 1024) throw new Error("Use a file smaller than 10 MB");
  if (/\.csv$/i.test(file.name)) return parseStatementCsv(await file.text(), currency);
  if (!/\.pdf$/i.test(file.name)) throw new Error("Choose a PDF or CSV file");
  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  try {
    const pdf = await task.promise;
    if (pdf.numPages > 50) throw new Error("Use a statement of at most 50 pages");
    const lines: string[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const text = await page.getTextContent();
      const groups = new Map<number, {x: number; text: string}[]>();
      for (const item of text.items) {
        if (!("str" in item)) continue;
        const y = Math.round(item.transform[5] / 3) * 3;
        groups.set(y, [...(groups.get(y) ?? []), { x: item.transform[4], text: item.str }]);
      }
      for (const [, parts] of [...groups].sort(([a], [b]) => b - a)) lines.push(parts.sort((a, b) => a.x - b.x).map(v => v.text).join(" "));
    }
    if (lines.some(line => currency === "EUR" ? /£|\bGBP\b/.test(line) : /€|\bEUR\b/.test(line))) throw new Error(`Statement currency must be ${currency}`);
    return parseStatementLines(lines);
  } finally { await task.destroy(); }
}
