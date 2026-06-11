/* global console, process */
/**
 * Applies SQL migrations from ./drizzle in lexical order, tracking applied
 * files in _perennial_migrations. Fails fast with a named-var error when
 * DATABASE_URL is missing (TOOLS.md env policy).
 */
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('perennial/db: DATABASE_URL is not set — refusing to migrate.');
  process.exit(1);
}

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'drizzle');

const client = new pg.Client({ connectionString: databaseUrl });

try {
  await client.connect();
  await client.query(
    'CREATE TABLE IF NOT EXISTS _perennial_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())',
  );
  const files = (await readdir(migrationsDir)).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    const { rowCount } = await client.query('SELECT 1 FROM _perennial_migrations WHERE name = $1', [
      file,
    ]);
    if (rowCount > 0) {
      continue;
    }
    const sqlText = await readFile(join(migrationsDir, file), 'utf8');
    await client.query('BEGIN');
    try {
      await client.query(sqlText);
      await client.query('INSERT INTO _perennial_migrations (name) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.error(`applied ${file}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  }
} catch (error) {
  console.error('perennial/db: migration failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await client.end();
}
