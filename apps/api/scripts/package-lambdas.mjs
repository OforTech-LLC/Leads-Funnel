#!/usr/bin/env node
/**
 * Package Lambda entrypoints into deployable ZIPs.
 *
 * Bundles each entrypoint with esbuild, writes an ESM package.json,
 * and zips the output to apps/api/dist/*.zip for Terraform consumption.
 */

import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const distDir = join(rootDir, 'dist');
const bundleRoot = join(rootDir, 'lambda-bundles');

const bundles = [
  { name: 'lead-handler', entry: 'src/index.ts' },
  { name: 'admin-handler', entry: 'src/handlers/admin.ts' },
  { name: 'health-handler', entry: 'src/health/handler.ts' },
  { name: 'assignment-worker', entry: 'src/workers/assignment-worker.ts' },
  { name: 'notification-worker', entry: 'src/workers/notification-worker.ts' },
  { name: 'pre-token-admin', entry: 'src/workers/pre-token-admin.ts' },
  { name: 'pre-token-portal', entry: 'src/workers/pre-token-portal.ts' },
];

function ensureZipAvailable() {
  try {
    execFileSync('zip', ['-v'], { stdio: 'ignore' });
  } catch {
    throw new Error('zip command not found. Install zip to package lambdas.');
  }
}

function writeEsmPackageJson(targetDir) {
  const packageJson = {
    name: '@leads-funnel/lambda',
    version: '1.0.0',
    private: true,
    type: 'module',
  };
  writeFileSync(join(targetDir, 'package.json'), JSON.stringify(packageJson, null, 2));
}

async function bundleEntry(entry) {
  const bundleDir = join(bundleRoot, entry.name);
  if (existsSync(bundleDir)) {
    rmSync(bundleDir, { recursive: true, force: true });
  }
  mkdirSync(bundleDir, { recursive: true });

  await build({
    entryPoints: [join(rootDir, entry.entry)],
    bundle: true,
    platform: 'node',
    target: 'node22',
    format: 'esm',
    outfile: join(bundleDir, 'index.mjs'),
    sourcemap: true,
    minify: false,
    external: [],
    banner: {
      js: `
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
      `.trim(),
    },
  });

  writeEsmPackageJson(bundleDir);

  if (!existsSync(distDir)) {
    mkdirSync(distDir, { recursive: true });
  }

  const zipPath = join(distDir, `${entry.name}.zip`);
  if (existsSync(zipPath)) {
    rmSync(zipPath);
  }

  execFileSync('zip', ['-q', '-r', zipPath, '.'], { cwd: bundleDir });
  return zipPath;
}

async function run() {
  ensureZipAvailable();
  if (existsSync(bundleRoot)) {
    rmSync(bundleRoot, { recursive: true, force: true });
  }
  mkdirSync(bundleRoot, { recursive: true });

  console.log('🔨 Bundling Lambda entrypoints...');
  for (const entry of bundles) {
    const zipPath = await bundleEntry(entry);
    console.log(`✅ ${entry.name} -> ${zipPath}`);
  }
}

run().catch((error) => {
  console.error('❌ Lambda packaging failed:', error);
  process.exit(1);
});
