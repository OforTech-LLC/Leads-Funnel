#!/usr/bin/env node
/**
 * Lambda Bundle Script
 *
 * Uses esbuild to bundle the Lambda function with all dependencies
 * into a single file for deployment.
 */

import { build } from 'esbuild';
import { writeFileSync, mkdirSync, existsSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const distDir = join(rootDir, 'lambda-dist');

async function bundle() {
  console.log('🔨 Bundling Lambda function...');

  // Clean the dist directory
  if (existsSync(distDir)) {
    rmSync(distDir, { recursive: true });
  }
  mkdirSync(distDir, { recursive: true });

  try {
    // Bundle with esbuild
    await build({
      entryPoints: [join(rootDir, 'src', 'index.ts')],
      bundle: true,
      platform: 'node',
      target: 'node22',
      format: 'esm',
      outfile: join(distDir, 'index.mjs'),
      minify: false, // Keep readable for debugging
      sourcemap: true,
      // Bundle all dependencies - ensures everything is available
      external: [],
      banner: {
        js: `
// ESM compatibility for Lambda
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
        `.trim(),
      },
    });

    // Create package.json for ES modules
    const packageJson = {
      name: '@leads-funnel/api',
      version: '0.1.0',
      private: true,
      type: 'module',
    };
    writeFileSync(
      join(distDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    console.log('✅ Lambda bundled successfully to lambda-dist/');
    console.log('   Entry point: index.mjs');
    console.log('   Handler: index.handler');
  } catch (error) {
    console.error('❌ Bundle failed:', error);
    process.exit(1);
  }
}

bundle();
