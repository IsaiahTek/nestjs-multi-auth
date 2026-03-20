#!/usr/bin/env node

const { Command } = require('commander');
const path = require('path');
const fs = require('fs');

const program = new Command();

program
  .name('nestjs-multi-auth')
  .description('Auth CLI tools')
  .version('1.0.0');


// 🔍 Resolve DataSource path
function resolveDataSource() {
  const cwd = process.cwd();

  const possiblePaths = [
    'dist/data-source.js',
    'dist/database/data-source.js',
    'src/data-source.ts',
    'src/database/data-source.ts',
  ];

  for (const p of possiblePaths) {
    const fullPath = path.join(cwd, p);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }

  throw new Error(
    '[!] Could not find data-source file. Expected one of:\n' +
      possiblePaths.map(p => ` - ${p}`).join('\n')
  );
}


// 🔧 Extract or create DataSource
function extractDataSource(exported) {
  const { DataSource } = require('typeorm');

  if (!exported) {
    throw new Error('No exports found in data-source file');
  }

  // ✅ Already a DataSource instance
  if (exported.AppDataSource instanceof DataSource) {
    return exported.AppDataSource;
  }

  if (exported.dataSource instanceof DataSource) {
    return exported.dataSource;
  }

  if (exported.default instanceof DataSource) {
    return exported.default;
  }

  // ✅ Config object → wrap it
  const config =
    exported.default ||
    exported.databaseConfig ||
    exported;

  return new DataSource(config);
}


// 🔧 Load DataSource (TS + JS support)
async function loadDataSource() {
  const dataSourcePath = resolveDataSource();

  console.log('[i] Using DataSource at:', dataSourcePath);

  if (dataSourcePath.endsWith('.ts')) {
    require('ts-node/register');
  }

  const exported = require(dataSourcePath);

  const dataSource = extractDataSource(exported);

  if (!dataSource.isInitialized) {
    await dataSource.initialize();
  }

  return dataSource;
}


// 🔁 Shared runner
async function runWithDataSource(fn) {
  const dataSource = await loadDataSource();

  try {
    await fn(dataSource);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}


// 🚀 MIGRATE COMMAND
program
  .command('migrate')
  .description('Run auth migrations')
  .action(async () => {
    try {
      const { AuthMigrationService } = require('../dist/migrations/migration.service');

      await runWithDataSource(async (dataSource) => {
        const service = new AuthMigrationService(dataSource);
        await service.runMigrations();
      });

      console.log('[i] Auth migrations completed');
      process.exit(0);
    } catch (err) {
      console.error('[!] Migration failed:\n', err);
      process.exit(1);
    }
  });


// 🔍 DOCTOR COMMAND
program
  .command('doctor')
  .description('Check auth schema status')
  .action(async () => {
    try {
      const { AuthMigrationService } = require('../dist/migrations/migration.service');

      await runWithDataSource(async (dataSource) => {
        const service = new AuthMigrationService(dataSource);
        const version = await service.getCurrentVersion();

        console.log('[i] Current auth schema version:', version);
      });

      process.exit(0);
    } catch (err) {
      console.error('[!] Doctor check failed:\n', err);
      process.exit(1);
    }
  });


program.parse(process.argv);