/**
 * Remotion Root - Entry point for video compositions
 *
 * This file registers all service-specific hero video compositions.
 * Videos are pre-rendered during build time and served from /public/videos/
 */

import { Composition } from 'remotion';
import { ServiceHeroVideo, SERVICE_VIDEO_CONFIG } from './compositions/ServiceHeroVideo';

// Service IDs for all 47 funnels
const SERVICE_IDS = [
  // Core Services (8)
  'real-estate',
  'life-insurance',
  'construction',
  'moving',
  'dentist',
  'plastic-surgeon',
  'roofing',
  'cleaning',
  // Home Services (19)
  'hvac',
  'plumbing',
  'electrician',
  'pest-control',
  'landscaping',
  'pool-service',
  'home-remodeling',
  'solar',
  'locksmith',
  'pressure-washing',
  'water-damage-restoration',
  'mold-remediation',
  'flooring',
  'painting',
  'windows-doors',
  'fencing',
  'concrete',
  'junk-removal',
  'appliance-repair',
  // Health & Beauty (7)
  'orthodontist',
  'dermatology',
  'medspa',
  'chiropractic',
  'physical-therapy',
  'hair-transplant',
  'cosmetic-dentistry',
  // Professional & Legal (5)
  'personal-injury-attorney',
  'immigration-attorney',
  'criminal-defense-attorney',
  'tax-accounting',
  'business-consulting',
  // Business Services (4)
  'commercial-cleaning',
  'security-systems',
  'it-services',
  'marketing-agency',
  // Auto Services (4)
  'auto-repair',
  'auto-detailing',
  'towing',
  'auto-glass',
] as const;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {SERVICE_IDS.map((serviceId) => (
        <Composition
          key={serviceId}
          id={`hero-${serviceId}`}
          component={ServiceHeroVideo}
          durationInFrames={SERVICE_VIDEO_CONFIG.durationInFrames}
          fps={SERVICE_VIDEO_CONFIG.fps}
          width={SERVICE_VIDEO_CONFIG.width}
          height={SERVICE_VIDEO_CONFIG.height}
          defaultProps={{
            serviceId,
          }}
        />
      ))}
    </>
  );
};
