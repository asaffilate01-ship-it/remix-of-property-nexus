import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, test } from "node:test";
import {
  auditMigrationFiles,
  createMigrationManifest,
  type MigrationFile,
  type MigrationManifest,
  verifyMigrationManifest,
} from "../src/lib/migration-integrity.ts";

const projectRoot = resolve(import.meta.dirname, "..");

function validMigration(name = "20260101000000_create_example.sql", extraSql = ""): MigrationFile {
  return {
    name,
    sql: `
      CREATE TABLE public.example (id uuid PRIMARY KEY);
      ALTER TABLE public.example ENABLE ROW LEVEL SECURITY;
      ${extraSql}
    `,
  };
}

describe("migration integrity", () => {
  test("the repository migration history matches its immutable manifest", () => {
    const migrationsDirectory = resolve(projectRoot, "supabase/migrations");
    const files = readdirSync(migrationsDirectory)
      .filter((name) => name.endsWith(".sql"))
      .map((name) => ({
        name,
        sql: readFileSync(resolve(migrationsDirectory, name), "utf8"),
      }));
    const manifest = JSON.parse(
      readFileSync(resolve(projectRoot, "supabase/migration-manifest.json"), "utf8"),
    ) as MigrationManifest;

    assert.deepEqual(auditMigrationFiles(files), []);
    assert.deepEqual(verifyMigrationManifest(files, manifest), []);
  });

  test("detects duplicate timestamps and duplicate migration content", () => {
    const first = validMigration();
    const second = { ...first, name: "20260101000000_duplicate.sql" };
    const errors = auditMigrationFiles([first, second]).join("\n");

    assert.match(errors, /timestamp is already used/);
    assert.match(errors, /content exactly duplicates/);
  });

  test("requires RLS and a safe SECURITY DEFINER search path", () => {
    const errors = auditMigrationFiles([
      {
        name: "20260101000000_unsafe.sql",
        sql: `
          CREATE TABLE public.unsafe_table (id uuid);
          CREATE FUNCTION public.unsafe_fn() RETURNS void
          LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN NULL; END; $$;
        `,
      },
    ]).join("\n");

    assert.match(errors, /must enable row-level security/);
    assert.match(errors, /must set an explicit search_path/);
  });

  test("rejects disabling RLS and grants to PUBLIC", () => {
    const errors = auditMigrationFiles([
      validMigration(
        "20260101000000_unsafe_grant.sql",
        "ALTER TABLE public.example DISABLE ROW LEVEL SECURITY; GRANT SELECT ON public.example TO PUBLIC;",
      ),
    ]).join("\n");

    assert.match(errors, /disabling row-level security is prohibited/);
    assert.match(errors, /grants to the PostgreSQL PUBLIC role are prohibited/);
  });

  test("detects modified, missing and untracked migrations", () => {
    const original = validMigration();
    const manifest = createMigrationManifest([original]);
    const changed = { ...original, sql: `${original.sql}\n-- changed` };
    const untracked = validMigration("20260101000001_untracked.sql");

    assert.match(verifyMigrationManifest([changed], manifest).join("\n"), /hash differs/);
    assert.match(verifyMigrationManifest([], manifest).join("\n"), /has no migration file/);
    assert.match(
      verifyMigrationManifest([original, untracked], manifest).join("\n"),
      /missing from the integrity manifest/,
    );
  });
});
