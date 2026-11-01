/**
 * Incremental parser for official HM Land Registry Price Paid Data (SPPD/APPD).
 * 15 columns for complete/yearly CSV, 16 for monthly change-only files.
 * This accepts arbitrary chunk boundaries including quoted commas/newlines.
 * No portal content, applicant data, or external libraries are involved.
 */
export type HmlrChange = {
  transaction_id: string;
  record_status: "A" | "C" | "D";
  sold_at?: string;
  price?: number;
  postcode?: string;
  property_code?: "D" | "S" | "T" | "F" | "O";
  new_build?: string;
  tenure?: string;
  paon?: string;
  saon?: string;
  street?: string;
  locality?: string;
  town?: string;
  district?: string;
  county?: string;
  category?: "A" | "B";
};

export const HMLR_ATTRIBUTION =
  "Contains HM Land Registry data © Crown copyright and database right 2021. This data is licensed under the Open Government Licence v3.0.";

const validDay = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const time = Date.parse(value + "T12:00:00Z");
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value;
};

/** Invalid official-source records are reported and omitted, never assigned invented values. */
export function normalizeHmlrRecord(fields: readonly string[]): HmlrChange | null {
  if (fields.length !== 15 && fields.length !== 16) return null;
  const id = (fields[0] ?? "").trim().replace(/^\{/, "").replace(/\}$/, "");
  if (!/^[A-Za-z0-9-]{1,120}$/.test(id)) return null;
  const record_status = (fields[15] ?? "A").trim().toUpperCase();
  if (record_status !== "A" && record_status !== "C" && record_status !== "D") return null;
  if (record_status === "D") return { transaction_id: id, record_status };
  const price = Number(fields[1]);
  const sold_at = fields[2]?.slice(0, 10) ?? "";
  const postcode = (fields[3] ?? "").normalize("NFKC").trim().toUpperCase().replace(/\s+/g, "");
  const property_code = (fields[4] ?? "").trim().toUpperCase();
  const category = (fields[14] ?? "").trim().toUpperCase();
  if (!Number.isFinite(price) || price < 1000 || price > 100_000_000 ||
    !validDay(sold_at) ||
    !/^[A-Z]{1,2}[0-9][0-9A-Z]?[0-9][A-Z]{2}$/.test(postcode) ||
    !["D","S","T","F","O"].includes(property_code) ||
    (category !== "A" && category !== "B")) return null;
  const tidy = (index: number, limit: number) =>
    (fields[index] ?? "").trim().normalize("NFKC").slice(0, limit);
  return {
    transaction_id: id, record_status, sold_at, price, postcode,
    property_code: property_code as HmlrChange["property_code"],
    new_build: tidy(5, 1), tenure: tidy(6, 1),
    paon: tidy(7, 250), saon: tidy(8, 250),
    street: tidy(9, 250), locality: tidy(10, 200),
    town: tidy(11, 150), district: tidy(12, 150), county: tidy(13, 150),
    category: category as "A" | "B",
  };
}

/**
 * Streaming, strict RFC4180-ish CSV tokenizer. Avoids reading multi-GB
 * national files into memory. Caller must handle rejected rows explicitly.
 */
export async function* streamHmlrCsvRows(
  chunks: AsyncIterable<string | Uint8Array>,
): AsyncGenerator<string[]> {
  const decoder = new TextDecoder();
  let state: "start" | "bare" | "quoted" | "after-quote" = "start";
  let fields: string[] = [];
  let value = "";
  let ignoreNextLF = false;
  let first = true;

  const append = (character: string) => {
    value += character;
    if (value.length > 1200) throw new Error("HMLR CSV field too large");
  };
  const addField = () => {
    fields.push(value);
    if (fields.length > 16) throw new Error("Too many HMLR CSV columns");
    value = "";
    state = "start";
  };
  function* finishRow(): Generator<string[]> {
    addField();
    if (fields.length === 1 && fields[0].trim() === "") {
      fields = [];
      return;
    }
    yield fields;
    fields = [];
  }
  for await (const chunk of chunks) {
    const text = typeof chunk === "string" ? chunk : decoder.decode(chunk, { stream: true });
    for (let i = 0; i < text.length; i++) {
      let character = text[i];
      if (first) {
        first = false;
        if (character === "\uFEFF") continue;
      }
      if (ignoreNextLF) {
        ignoreNextLF = false;
        if (character === "\n") continue;
      }
      if (state === "quoted") {
        if (character === '"') state = "after-quote";
        else append(character);
        continue;
      }
      if (state === "after-quote") {
        if (character === '"') {
          append('"');
          state = "quoted";
          continue;
        }
        if (character !== "," && character !== "\r" && character !== "\n") {
          throw new Error("Unexpected character after quoted HMLR CSV field");
        }
      } else if (state === "start" && character === '"') {
        state = "quoted";
        continue;
      } else if (character === '"') {
        throw new Error("Malformed quoted HMLR CSV field");
      }
      if (character === ",") {
        addField();
      } else if (character === "\r" || character === "\n") {
        yield* finishRow();
        ignoreNextLF = character === "\r";
      } else {
        state = "bare";
        append(character);
      }
    }
  }
  const tail = decoder.decode();
  if (tail) {
    // The official feed uses valid UTF-8. A non-empty decoder tail here is
    // an incomplete multi-byte sequence, which should fail data verification.
    if (tail.includes("\uFFFD")) throw new Error("Invalid HMLR UTF-8 encoding");
    value += tail;
  }
  if (state === "quoted") throw new Error("Unterminated quoted HMLR CSV field");
  if (value || fields.length > 0 || state === "after-quote") yield* finishRow();
}
