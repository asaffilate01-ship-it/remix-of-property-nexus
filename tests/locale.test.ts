import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { formatCurrency, isAppLocale, translateUi } from "../src/lib/locale.ts";

describe("workspace locale", () => {
  test("accepts only supported UK locales", () => {
    assert.equal(isAppLocale("en-GB"), true);
    assert.equal(isAppLocale("cy-GB"), true);
    assert.equal(isAppLocale("en-US"), false);
  });

  test("translates the navigation shell and safely falls back", () => {
    assert.equal(translateUi("cy-GB", "Settings"), "Gosodiadau");
    assert.equal(translateUi("cy-GB", "Future feature"), "Future feature");
    assert.equal(translateUi("en-GB", "Settings"), "Settings");
  });

  test("uses locale-aware GBP formatting", () => {
    assert.match(formatCurrency("en-GB", 1234.5), /1,234\.50/);
    assert.match(formatCurrency("cy-GB", 1234.5), /1,234\.50/);
  });
});
