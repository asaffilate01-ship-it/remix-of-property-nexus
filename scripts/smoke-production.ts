import { runProductionSmoke } from "../src/lib/production-smoke.ts";

const baseUrl = process.env.SMOKE_BASE_URL ?? process.env.APP_URL ?? "";
const expectedRelease =
  process.env.SMOKE_EXPECTED_RELEASE_SHA ?? process.env.PUBLIC_RELEASE_SHA ?? "";

try {
  const result = await runProductionSmoke({ baseUrl, expectedRelease });
  for (const check of result.checks) console.log(`PASS: ${check}`);
  for (const error of result.errors) console.error(`ERROR: ${error}`);

  if (result.errors.length > 0) {
    console.error(`Production smoke test failed with ${result.errors.length} blocking issue(s).`);
    process.exitCode = 1;
  } else {
    console.log("Production smoke test passed for the expected immutable release.");
  }
} catch (error) {
  console.error(
    `Production smoke test configuration failed: ${
      error instanceof Error ? error.message : "unknown error"
    }`,
  );
  process.exitCode = 1;
}
