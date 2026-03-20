#!/usr/bin/env node

const { Command } = require('commander');
const path = require('path');
const fs = require('fs');

const program = new Command();

program.name('nestjs-multi-auth').description('Auth CLI tools').version('1.0.0');


// 🔍 Helper: resolve DataSource automatically
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

function extractDataSource(exported) {
  if (!exported) {
    throw new Error('No exports found in data-source file');
  }

  // ✅ Case 1: Already a DataSource instance
  if (exported.AppDataSource) {
    return exported.AppDataSource;
  }

  if (exported.dataSource) {
    return exported.dataSource;
  }

  if (exported.default?.options) {
    return exported.default;
  }

  // ✅ Case 2: Config object → wrap it
  const config =
    exported.default ||
    exported.databaseConfig ||
    exported;

  const { DataSource } = require('typeorm');
  return new DataSource(config);
}


// 🔧 Load DataSource (supports TS + JS)
async function loadDataSource() {
  const dataSourcePath = resolveDataSource();

  if (dataSourcePath.endsWith('.ts')) {
    require('ts-node/register');
  }

  const exported = require(dataSourcePath);

  // Support both default export and named export
  const dataSourceConfig = extractDataSource(exported);
  console.log("Data Source Config: ", dataSourceConfig)
  return dataSourceConfig;
}


// 🚀 MIGRATE COMMAND
program
  .command('migrate')
  .description('Run auth migrations')
  .action(async () => {
    try {
      const { DataSource } = require('typeorm');
      const { AuthMigrationService } = require('../dist/migrations/migration.service');

      const config = await loadDataSource();

      const dataSource = new DataSource(config);
      await dataSource.initialize();

      const service = new AuthMigrationService(dataSource);

      await service.runMigrations();

      console.log('[i] Auth migrations completed');
      process.exit(0);
    } catch (err) {
      console.error('[!] Migration failed:\n', err.message);
      process.exit(1);
    }
  });


// 🔍 DOCTOR COMMAND
program
  .command('doctor')
  .description('Check auth schema status')
  .action(async () => {
    try {
      const { DataSource } = require('typeorm');
      const { AuthMigrationService } = require('../dist/migrations/migration.service');

      const config = await loadDataSource();

      const dataSource = new DataSource(config);
      await dataSource.initialize();

      const service = new AuthMigrationService(dataSource);

      const version = await service.getCurrentVersion();

      console.log('[i] Current auth schema version:', version);

      process.exit(0);
    } catch (err) {
      console.error('[!] Doctor check failed:\n', err.message);
      process.exit(1);
    }
  });


program.parse(process.argv);