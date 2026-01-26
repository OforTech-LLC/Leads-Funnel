/**
 * Remotion Render Script
 *
 * This script renders all hero videos for the 47 service funnels.
 * Run with: npx ts-node src/remotion/render.ts
 *
 * Prerequisites:
 * - ffmpeg installed
 * - Remotion dependencies installed
 */

import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import path from 'path';
import fs from 'fs';

// Service IDs to render
const SERVICE_IDS = [
  'real-estate', 'life-insurance', 'construction', 'moving', 'dentist',
  'plastic-surgeon', 'roofing', 'cleaning', 'hvac', 'plumbing',
  'electrician', 'pest-control', 'landscaping', 'pool-service', 'home-remodeling',
  'solar', 'locksmith', 'pressure-washing', 'water-damage-restoration', 'mold-remediation',
  'flooring', 'painting', 'windows-doors', 'fencing', 'concrete',
  'junk-removal', 'appliance-repair', 'orthodontist', 'dermatology', 'medspa',
  'chiropractic', 'physical-therapy', 'hair-transplant', 'cosmetic-dentistry',
  'personal-injury-attorney', 'immigration-attorney', 'criminal-defense-attorney',
  'tax-accounting', 'business-consulting', 'commercial-cleaning', 'security-systems',
  'it-services', 'marketing-agency', 'auto-repair', 'auto-detailing', 'towing', 'auto-glass',
];

const OUTPUT_DIR = path.join(__dirname, '../../public/videos');

async function renderVideos() {
  console.log('🎬 Starting Remotion video rendering...\n');

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Bundle the Remotion project
  console.log('📦 Bundling Remotion project...');
  const bundleLocation = await bundle({
    entryPoint: path.join(__dirname, './index.ts'),
    webpackOverride: (config) => config,
  });
  console.log('✅ Bundle complete\n');

  // Render each video
  let completed = 0;
  const total = SERVICE_IDS.length;

  for (const serviceId of SERVICE_IDS) {
    const compositionId = `hero-${serviceId}`;
    const outputPath = path.join(OUTPUT_DIR, `${compositionId}.mp4`);

    // Skip if already rendered
    if (fs.existsSync(outputPath)) {
      console.log(`⏭️  Skipping ${compositionId} (already exists)`);
      completed++;
      continue;
    }

    console.log(`🎥 Rendering ${compositionId} (${completed + 1}/${total})...`);

    try {
      const composition = await selectComposition({
        serveUrl: bundleLocation,
        id: compositionId,
      });

      await renderMedia({
        composition,
        serveUrl: bundleLocation,
        codec: 'h264',
        outputLocation: outputPath,
        chromiumOptions: {
          enableMultiProcessOnLinux: true,
        },
        // Optimize for web
        imageFormat: 'jpeg',
        jpegQuality: 80,
        // CRF for quality (lower = better quality, larger file)
        crf: 23,
      });

      console.log(`✅ Rendered ${compositionId}`);
    } catch (error) {
      console.error(`❌ Failed to render ${compositionId}:`, error);
    }

    completed++;
  }

  console.log(`\n🎉 Rendering complete! ${completed}/${total} videos rendered.`);
  console.log(`📁 Output directory: ${OUTPUT_DIR}`);
}

// Run if called directly
if (require.main === module) {
  renderVideos().catch(console.error);
}

export { renderVideos, SERVICE_IDS, OUTPUT_DIR };
