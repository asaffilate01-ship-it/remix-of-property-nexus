import { createHash } from "node:crypto";

export type MigrationFile = {
  name: string;
  sql: string;
};

export type MigrationManifest = {
  schemaVersion: 1;
  algorithm: "sha256";
  migrations: Array<{
    file: string;
    sha256: string;
  }>;
};

const migrationNamePattern = /^(\d{14})_[A-Za-z0-9][A-Za-z0-9_-]*\.sql$/;

export function migrationSha256(sql: string): string {
  return createHash("sha256").update(sql).digest("hex");
}

export function createMigrationManifest(files: MigrationFile[]): MigrationManifest {
  return {
    schemaVersion: 1,
    algorithm: "sha256",
    migrations: [...files]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(({ name, sql }) => ({ file: name, sha256: migrationSha256(sql) })),
  };
}

function withoutSqlComments(sql: string): string {
  return sql.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/--[^\r\n]*/g, " ");
}

function normalizeTableName(identifier: string): string {
  const normalized = identifier.replaceAll('"', "").toLowerCase();
  return normalized.includes(".") ? normalized : `public.${normalized}`;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function auditMigrationFiles(files: MigrationFile[]): string[] {
  const errors: string[] = [];
  const timestamps = new Map<string, string>();
  const hashes = new Map<string, string>();
  const sortedFiles = [...files].sort((a, b) => a.name.localeCompare(b.name));

  for (const file of sortedFiles) {
    const nameMatch = migrationNamePattern.exec(file.name);
    if (!nameMatch) {
      errors.push(`${file.name}: migration filenames must use YYYYMMDDHHMMSS_description.sql.`);
    } else {
      const previous = timestamps.get(nameMatch[1]);
      if (previous) {
        errors.push(`${file.name}: timestamp is already used by ${previous}.`);
      } else {
        timestamps.set(nameMatch[1], file.name);
      }
    }

    const hash = migrationSha256(file.sql);
    const duplicate = hashes.get(hash);
    if (duplicate) {
      errors.push(`${file.name}: content exactly duplicates ${duplicate}.`);
    } else {
      hashes.set(hash, file.name);
    }

    const sql = withoutSqlComments(file.sql);
    if (/\bdisable\s+row\s+level\s+security\b/i.test(sql)) {
      errors.push(`${file.name}: disabling row-level security is prohibited.`);
    }
    if (/\bgrant\b[\s\S]*?\bto\s+public\b/i.test(sql)) {
      errors.push(`${file.name}: grants to the PostgreSQL PUBLIC role are prohibited.`);
    }

    const functionStarts = [
      ...sql.matchAll(/\bcreate\s+(?:or\s+replace\s+)?function\s+([^\s(]+)/gi),
    ];
    for (let index = 0; index < functionStarts.length; index += 1) {
      const match = functionStarts[index];
      const start = match.index ?? 0;
      const end = functionStarts[index + 1]?.index ?? sql.length;
      const definition = sql.slice(start, end);
      if (
        /\bsecurity\s+definer\b/i.test(definition) &&
        !/\bset\s+(?:search_path|search\s+path)\s*(?:=|to)\s*/i.test(definition)
      ) {
        errors.push(
          `${file.name}: SECURITY DEFINER function ${match[1]} must set an explicit search_path.`,
        );
      }
    }
  }

  const completeSql = withoutSqlComments(sortedFiles.map(({ sql }) => sql).join("\n"));
  const createdTables = [
    ...completeSql.matchAll(
      /\bcreate\s+(?:unlogged\s+)?table\s+(?:if\s+not\s+exists\s+)?((?:"?[A-Za-z_][\w$]*"?\.)?"?[A-Za-z_][\w$]*"?)/gi,
    ),
  ].map((match) => normalizeTableName(match[1]));

  for (const table of new Set(createdTables)) {
    if (!table.startsWith("public.")) continue;
    const [schema, name] = table.split(".");
    const qualifiedTable = `"?${escapeRegex(schema)}"?\\s*\\.\\s*"?${escapeRegex(name)}"?`;
    const enableRls = new RegExp(
      `\\balter\\s+table\\s+(?:only\\s+)?${qualifiedTable}\\s+enable\\s+row\\s+level\\s+security\\b`,
      "i",
    );
    if (!enableRls.test(completeSql)) {
      errors.push(`${table}: every public table must enable row-level security.`);
    }
  }

  return [...new Set(errors)].sort();
}

export function verifyMigrationManifest(
  files: MigrationFile[],
  manifest: MigrationManifest,
): string[] {
  const errors: string[] = [];

  if (manifest.schemaVersion !== 1 || manifest.algorithm !== "sha256") {
    errors.push("Migration manifest must use schemaVersion 1 and sha256.");
    return errors;
  }

  const actual = createMigrationManifest(files);
  const expectedByFile = new Map(manifest.migrations.map((entry) => [entry.file, entry.sha256]));
  const actualByFile = new Map(actual.migrations.map((entry) => [entry.file, entry.sha256]));

  if (expectedByFile.size !== manifest.migrations.length) {
    errors.push("Migration manifest contains duplicate file entries.");
  }

  for (const entry of actual.migrations) {
    const expectedHash = expectedByFile.get(entry.file);
    if (!expectedHash) {
      errors.push(`${entry.file}: migration is missing from the integrity manifest.`);
    } else if (expectedHash !== entry.sha256) {
      errors.push(`${entry.file}: migration hash differs from the integrity manifest.`);
    }
  }

  for (const entry of manifest.migrations) {
    if (!actualByFile.has(entry.file)) {
      errors.push(`${entry.file}: manifest entry has no migration file.`);
    }
  }

  return [...new Set(errors)].sort();
}
