import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const lock = JSON.parse(readFileSync(new URL("../package-lock.json", import.meta.url), "utf8"));
assert.ok(lock.lockfileVersion >= 3, "A current npm lockfile is required");
assert.ok(lock.packages?.[""], "Root package is missing from lockfile");
for (const field of ["dependencies", "devDependencies", "optionalDependencies"]) {
  assert.deepEqual(lock.packages[""][field] ?? {}, manifest[field] ?? {}, `${field} differs between package.json and package-lock.json`);
}
console.log("Package manifest and lockfile agree");
