/**
 * Service Hero Video Composition
 *
 * Generic hero video template for all services.
 * Renders a dark luxury aesthetic with purple/indigo accents,
 * glassy overlays, and service-relevant abstract visuals.
 */

import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  spring,
  Sequence,
} from 'remotion';

// Video configuration
export const SERVICE_VIDEO_CONFIG = {
  fps: 30,
  durationInFrames: 90, // 3 seconds at 30fps
  width: 1920,
  height: 1080,
};

// Service-specific styling
const SERVICE_THEMES: Record<string, { icon: string; gradient: string; accent: string }> = {
  // Core Services
  'real-estate': { icon: '🏠', gradient: 'linear-gradient(135deg, #4f46e5, #7c3aed)', accent: '#818cf8' },
  'life-insurance': { icon: '🛡️', gradient: 'linear-gradient(135deg, #0ea5e9, #6366f1)', accent: '#38bdf8' },
  'construction': { icon: '🏗️', gradient: 'linear-gradient(135deg, #f59e0b, #ef4444)', accent: '#fbbf24' },
  'moving': { icon: '📦', gradient: 'linear-gradient(135deg, #10b981, #14b8a6)', accent: '#34d399' },
  'dentist': { icon: '🦷', gradient: 'linear-gradient(135deg, #06b6d4, #3b82f6)', accent: '#22d3ee' },
  'plastic-surgeon': { icon: '✨', gradient: 'linear-gradient(135deg, #ec4899, #f43f5e)', accent: '#f472b6' },
  'roofing': { icon: '🏠', gradient: 'linear-gradient(135deg, #78350f, #b45309)', accent: '#d97706' },
  'cleaning': { icon: '🧹', gradient: 'linear-gradient(135deg, #14b8a6, #22c55e)', accent: '#2dd4bf' },

  // Home Services
  'hvac': { icon: '❄️', gradient: 'linear-gradient(135deg, #0284c7, #7c3aed)', accent: '#0ea5e9' },
  'plumbing': { icon: '🔧', gradient: 'linear-gradient(135deg, #2563eb, #4f46e5)', accent: '#3b82f6' },
  'electrician': { icon: '⚡', gradient: 'linear-gradient(135deg, #eab308, #f59e0b)', accent: '#facc15' },
  'pest-control': { icon: '🛡️', gradient: 'linear-gradient(135deg, #65a30d, #16a34a)', accent: '#84cc16' },
  'landscaping': { icon: '🌿', gradient: 'linear-gradient(135deg, #16a34a, #15803d)', accent: '#22c55e' },
  'pool-service': { icon: '🏊', gradient: 'linear-gradient(135deg, #0891b2, #0284c7)', accent: '#06b6d4' },
  'home-remodeling': { icon: '🔨', gradient: 'linear-gradient(135deg, #b45309, #c2410c)', accent: '#ea580c' },
  'solar': { icon: '☀️', gradient: 'linear-gradient(135deg, #eab308, #f97316)', accent: '#fbbf24' },
  'locksmith': { icon: '🔐', gradient: 'linear-gradient(135deg, #6b7280, #4b5563)', accent: '#9ca3af' },
  'pressure-washing': { icon: '💧', gradient: 'linear-gradient(135deg, #0ea5e9, #06b6d4)', accent: '#38bdf8' },
  'water-damage-restoration': { icon: '🌊', gradient: 'linear-gradient(135deg, #0369a1, #1d4ed8)', accent: '#0284c7' },
  'mold-remediation': { icon: '🔬', gradient: 'linear-gradient(135deg, #059669, #047857)', accent: '#10b981' },
  'flooring': { icon: '🪵', gradient: 'linear-gradient(135deg, #92400e, #a16207)', accent: '#b45309' },
  'painting': { icon: '🎨', gradient: 'linear-gradient(135deg, #7c3aed, #a855f7)', accent: '#8b5cf6' },
  'windows-doors': { icon: '🪟', gradient: 'linear-gradient(135deg, #0891b2, #0e7490)', accent: '#06b6d4' },
  'fencing': { icon: '🏡', gradient: 'linear-gradient(135deg, #713f12, #854d0e)', accent: '#a16207' },
  'concrete': { icon: '🧱', gradient: 'linear-gradient(135deg, #57534e, #78716c)', accent: '#a8a29e' },
  'junk-removal': { icon: '🚛', gradient: 'linear-gradient(135deg, #059669, #0d9488)', accent: '#14b8a6' },
  'appliance-repair': { icon: '🔌', gradient: 'linear-gradient(135deg, #2563eb, #4338ca)', accent: '#3b82f6' },

  // Health & Beauty
  'orthodontist': { icon: '😁', gradient: 'linear-gradient(135deg, #0ea5e9, #6366f1)', accent: '#38bdf8' },
  'dermatology': { icon: '🧴', gradient: 'linear-gradient(135deg, #f472b6, #ec4899)', accent: '#f9a8d4' },
  'medspa': { icon: '💆', gradient: 'linear-gradient(135deg, #a855f7, #ec4899)', accent: '#c084fc' },
  'chiropractic': { icon: '🦴', gradient: 'linear-gradient(135deg, #0891b2, #059669)', accent: '#14b8a6' },
  'physical-therapy': { icon: '🏃', gradient: 'linear-gradient(135deg, #10b981, #0ea5e9)', accent: '#22d3ee' },
  'hair-transplant': { icon: '💇', gradient: 'linear-gradient(135deg, #8b5cf6, #a855f7)', accent: '#c084fc' },
  'cosmetic-dentistry': { icon: '💎', gradient: 'linear-gradient(135deg, #06b6d4, #6366f1)', accent: '#22d3ee' },

  // Professional & Legal
  'personal-injury-attorney': { icon: '⚖️', gradient: 'linear-gradient(135deg, #1e3a8a, #4338ca)', accent: '#4f46e5' },
  'immigration-attorney': { icon: '🌍', gradient: 'linear-gradient(135deg, #0369a1, #1d4ed8)', accent: '#2563eb' },
  'criminal-defense-attorney': { icon: '🛡️', gradient: 'linear-gradient(135deg, #374151, #6b7280)', accent: '#9ca3af' },
  'tax-accounting': { icon: '📊', gradient: 'linear-gradient(135deg, #15803d, #0f766e)', accent: '#16a34a' },
  'business-consulting': { icon: '💼', gradient: 'linear-gradient(135deg, #4338ca, #7c3aed)', accent: '#6366f1' },

  // Business Services
  'commercial-cleaning': { icon: '🏢', gradient: 'linear-gradient(135deg, #0891b2, #14b8a6)', accent: '#2dd4bf' },
  'security-systems': { icon: '🔒', gradient: 'linear-gradient(135deg, #374151, #1f2937)', accent: '#6b7280' },
  'it-services': { icon: '💻', gradient: 'linear-gradient(135deg, #3b82f6, #6366f1)', accent: '#60a5fa' },
  'marketing-agency': { icon: '📈', gradient: 'linear-gradient(135deg, #f97316, #ef4444)', accent: '#fb923c' },

  // Auto Services
  'auto-repair': { icon: '🔧', gradient: 'linear-gradient(135deg, #374151, #1f2937)', accent: '#6b7280' },
  'auto-detailing': { icon: '🚗', gradient: 'linear-gradient(135deg, #0891b2, #0284c7)', accent: '#38bdf8' },
  'towing': { icon: '🚚', gradient: 'linear-gradient(135deg, #dc2626, #b91c1c)', accent: '#f87171' },
  'auto-glass': { icon: '🪟', gradient: 'linear-gradient(135deg, #0284c7, #0369a1)', accent: '#0ea5e9' },
};

// Default theme for unknown services
const DEFAULT_THEME = {
  icon: '✨',
  gradient: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
  accent: '#a78bfa',
};

interface ServiceHeroVideoProps {
  serviceId: string;
}

// Animated background orb
const GlowOrb: React.FC<{
  x: number;
  y: number;
  size: number;
  color: string;
  delay: number;
}> = ({ x, y, size, color, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200 },
  });

  const pulse = interpolate(
    frame,
    [0, 45, 90],
    [0.8, 1.2, 0.8],
    { extrapolateRight: 'clamp' }
  );

  const scale = progress * pulse;
  const opacity = interpolate(progress, [0, 1], [0, 0.6]);

  return (
    <div
      style={{
        position: 'absolute',
        left: `${x}%`,
        top: `${y}%`,
        width: size,
        height: size,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        filter: 'blur(60px)',
        transform: `scale(${scale}) translate(-50%, -50%)`,
        opacity,
      }}
    />
  );
};

// Animated glass panel
const GlassPanel: React.FC<{
  delay: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}> = ({ delay, x, y, width, height, rotation }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 100 },
  });

  const opacity = interpolate(progress, [0, 1], [0, 0.1]);
  const translateY = interpolate(progress, [0, 1], [50, 0]);

  return (
    <div
      style={{
        position: 'absolute',
        left: `${x}%`,
        top: `${y}%`,
        width,
        height,
        background: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 20,
        transform: `rotate(${rotation}deg) translateY(${translateY}px)`,
        opacity,
      }}
    />
  );
};

// Main hero video component
export const ServiceHeroVideo: React.FC<ServiceHeroVideoProps> = ({ serviceId }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const theme = SERVICE_THEMES[serviceId] || DEFAULT_THEME;

  // Title animation
  const titleProgress = spring({
    frame: frame - 15,
    fps,
    config: { damping: 100 },
  });

  const titleOpacity = interpolate(titleProgress, [0, 1], [0, 1]);
  const titleY = interpolate(titleProgress, [0, 1], [30, 0]);

  // Subtitle animation
  const subtitleProgress = spring({
    frame: frame - 30,
    fps,
    config: { damping: 100 },
  });

  const subtitleOpacity = interpolate(subtitleProgress, [0, 1], [0, 1]);

  // Icon animation
  const iconProgress = spring({
    frame: frame - 5,
    fps,
    config: { damping: 80 },
  });

  const iconScale = interpolate(iconProgress, [0, 1], [0, 1]);
  const iconRotation = interpolate(frame, [0, durationInFrames], [0, 10]);

  // Format service name for display
  const serviceName = serviceId
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return (
    <AbsoluteFill
      style={{
        background: '#0a0a0f',
        fontFamily: 'Inter, -apple-system, sans-serif',
      }}
    >
      {/* Animated background gradient */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: theme.gradient,
          opacity: 0.15,
        }}
      />

      {/* Glow orbs */}
      <GlowOrb x={20} y={30} size={400} color={theme.accent} delay={0} />
      <GlowOrb x={80} y={60} size={500} color="#6366f1" delay={10} />
      <GlowOrb x={50} y={80} size={350} color="#ec4899" delay={20} />

      {/* Glass panels */}
      <GlassPanel delay={5} x={10} y={20} width={300} height={400} rotation={-15} />
      <GlassPanel delay={15} x={70} y={30} width={350} height={300} rotation={10} />
      <GlassPanel delay={25} x={40} y={60} width={280} height={350} rotation={-5} />

      {/* Grid pattern overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          opacity: 0.5,
        }}
      />

      {/* Content container */}
      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 80,
        }}
      >
        {/* Service icon */}
        <Sequence from={5}>
          <div
            style={{
              fontSize: 120,
              marginBottom: 40,
              transform: `scale(${iconScale}) rotate(${iconRotation}deg)`,
              filter: `drop-shadow(0 0 30px ${theme.accent})`,
            }}
          >
            {theme.icon}
          </div>
        </Sequence>

        {/* Service name */}
        <Sequence from={15}>
          <h1
            style={{
              fontSize: 80,
              fontWeight: 800,
              color: '#ffffff',
              margin: 0,
              textAlign: 'center',
              opacity: titleOpacity,
              transform: `translateY(${titleY}px)`,
              textShadow: `0 0 40px ${theme.accent}`,
              letterSpacing: '-2px',
            }}
          >
            {serviceName}
          </h1>
        </Sequence>

        {/* Tagline */}
        <Sequence from={30}>
          <p
            style={{
              fontSize: 32,
              color: 'rgba(255, 255, 255, 0.7)',
              margin: 0,
              marginTop: 24,
              textAlign: 'center',
              opacity: subtitleOpacity,
              fontWeight: 500,
            }}
          >
            Premium Services in Miami
          </p>
        </Sequence>

        {/* Accent line */}
        <Sequence from={45}>
          <div
            style={{
              width: interpolate(
                spring({ frame: frame - 45, fps, config: { damping: 100 } }),
                [0, 1],
                [0, 200]
              ),
              height: 4,
              background: theme.gradient,
              borderRadius: 2,
              marginTop: 40,
              boxShadow: `0 0 20px ${theme.accent}`,
            }}
          />
        </Sequence>
      </AbsoluteFill>

      {/* Vignette overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.4) 100%)',
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};

export default ServiceHeroVideo;
