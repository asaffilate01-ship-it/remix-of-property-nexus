import { validateProductionEnvironment } from "../src/lib/preflight.ts";

const result = validateProductionEnvironment(process.env);

for (const warning of result.warnings) console.warn(`WARN: ${warning}`);
for (const error of result.errors) console.error(`ERROR: ${error}`);

if (result.errors.length > 0) {
  console.error(`Production preflight failed with ${result.errors.length} blocking issue(s).`);
  process.exitCode = 1;
} else {
  console.log("Production preflight passed. No secret values were printed.");
}
