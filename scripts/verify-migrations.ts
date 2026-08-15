import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  auditMigrationFiles,
  createMigrationManifest,
  type MigrationFile,
  type MigrationManifest,
  verifyMigrationManifest,
} from "../src/lib/migration-integrity.ts";

const projectRoot = resolve(import.meta.dirname, "..");
const migrationsDirectory = resolve(projectRoot, "supabase/migrations");
const manifestPath = resolve(projectRoot, "supabase/migration-manifest.json");
const writeManifest = process.argv.includes("--write");

const migrations: MigrationFile[] = readdirSync(migrationsDirectory)
  .filter((name) => name.endsWith(".sql"))
  .sort()
  .map((name) => ({
    name,
    sql: readFileSync(resolve(migrationsDirectory, name), "utf8"),
  }));

const auditErrors = auditMigrationFiles(migrations);
if (auditErrors.length > 0) {
  console.error("Migration security audit failed:");
  for (const error of auditErrors) console.error(`- ${error}`);
  process.exitCode = 1;
} else if (writeManifest) {
  writeFileSync(
    manifestPath,
    `${JSON.stringify(createMigrationManifest(migrations), null, 2)}\n`,
    "utf8",
  );
  console.log(`Wrote integrity manifest for ${migrations.length} migrations.`);
} else {
  let manifest: MigrationManifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as MigrationManifest;
  } catch (error) {
    console.error(`Could not read migration manifest: ${String(error)}`);
    process.exit(1);
  }

  const integrityErrors = verifyMigrationManifest(migrations, manifest);
  if (integrityErrors.length > 0) {
    console.error("Migration integrity verification failed:");
    for (const error of integrityErrors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    console.log(
      `Verified ${migrations.length} immutable migrations: unique ordering, RLS coverage and secure function definitions.`,
    );
  }
}
