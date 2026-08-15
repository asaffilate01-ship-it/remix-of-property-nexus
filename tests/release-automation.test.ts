import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, test } from "node:test";

const projectRoot = resolve(import.meta.dirname, "..");

describe("release evidence automation", () => {
  test("exposes the production smoke runner as a package command", () => {
    const packageJson = JSON.parse(readFileSync(resolve(projectRoot, "package.json"), "utf8")) as {
      scripts: Record<string, string>;
    };

    assert.match(packageJson.scripts["smoke:production"], /smoke-production\.ts/);
  });

  test("requires an explicit production origin and release for manual smoke runs", () => {
    const workflow = readFileSync(
      resolve(projectRoot, ".github/workflows/production-smoke.yml"),
      "utf8",
    );

    assert.match(workflow, /workflow_dispatch:/);
    assert.match(workflow, /base_url:[\s\S]*required: true/);
    assert.match(workflow, /release_sha:[\s\S]*required: true/);
    assert.match(workflow, /environment: production/);
    assert.match(workflow, /SMOKE_BASE_URL: \$\{\{ inputs\.base_url \}\}/);
    assert.match(workflow, /SMOKE_EXPECTED_RELEASE_SHA: \$\{\{ inputs\.release_sha \}\}/);
  });

  test("quality CI retains a CycloneDX dependency inventory", () => {
    const workflow = readFileSync(resolve(projectRoot, ".github/workflows/quality.yml"), "utf8");

    assert.match(workflow, /npm sbom --sbom-format cyclonedx/);
    assert.match(workflow, /actions\/checkout@v6/);
    assert.match(workflow, /actions\/setup-node@v6/);
    assert.match(workflow, /actions\/upload-artifact@v7/);
    assert.match(workflow, /retention-days: 30/);
  });
});
