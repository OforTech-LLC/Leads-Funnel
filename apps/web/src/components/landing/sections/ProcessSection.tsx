'use client';

/**
 * Process Section Component
 *
 * Display how the service works in numbered steps.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { GlassCard, tokens } from '@/design-system';

interface ProcessStep {
  number: number;
  title: string;
  description: string;
  icon?: React.ReactNode;
}

interface ProcessSectionProps {
  title: string;
  subtitle?: string;
  steps: ProcessStep[];
  variant?: 'horizontal' | 'vertical' | 'timeline';
  accentColor?: string;
}

export const ProcessSection: React.FC<ProcessSectionProps> = ({
  title,
  subtitle,
  steps,
  variant = 'horizontal',
  accentColor = tokens.colors.accent.primary,
}) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: 'easeOut' },
    },
  };

  const renderHorizontal = () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${Math.min(steps.length, 4)}, 1fr)`,
        gap: tokens.spacing[6],
      }}
    >
      {steps.map((step, index) => (
        <motion.div key={index} variants={itemVariants} style={{ position: 'relative' }}>
          {/* Connector line */}
          {index < steps.length - 1 && (
            <div
              style={{
                position: 'absolute',
                top: '32px',
                left: '50%',
                width: '100%',
                height: '2px',
                background: `linear-gradient(90deg, ${accentColor}40, ${accentColor}10)`,
                zIndex: 0,
              }}
            />
          )}

          <GlassCard variant="light" padding="lg" style={{ position: 'relative', zIndex: 1 }}>
            {/* Step number */}
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: tokens.radii.full,
                background: `linear-gradient(135deg, ${accentColor}, ${tokens.colors.accent.secondary})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: tokens.spacing[4],
                fontSize: tokens.typography.fontSize.xl,
                fontWeight: tokens.typography.fontWeight.bold,
                color: tokens.colors.text.primary,
                boxShadow: `0 0 20px ${accentColor}40`,
              }}
            >
              {step.number}
            </div>

            <h3
              style={{
                fontSize: tokens.typography.fontSize.lg,
                fontWeight: tokens.typography.fontWeight.semibold,
                marginBottom: tokens.spacing[2],
                color: tokens.colors.text.primary,
              }}
            >
              {step.title}
            </h3>

            <p
              style={{
                fontSize: tokens.typography.fontSize.sm,
                color: tokens.colors.text.secondary,
                lineHeight: tokens.typography.lineHeight.relaxed,
                margin: 0,
              }}
            >
              {step.description}
            </p>
          </GlassCard>
        </motion.div>
      ))}
    </div>
  );

  const renderTimeline = () => (
    <div style={{ maxWidth: '700px', margin: '0 auto' }}>
      {steps.map((step, index) => (
        <motion.div
          key={index}
          variants={itemVariants}
          style={{
            display: 'flex',
            gap: tokens.spacing[6],
            marginBottom: index < steps.length - 1 ? tokens.spacing[8] : 0,
            position: 'relative',
          }}
        >
          {/* Timeline line */}
          {index < steps.length - 1 && (
            <div
              style={{
                position: 'absolute',
                left: '24px',
                top: '48px',
                width: '2px',
                height: `calc(100% + ${tokens.spacing[8]})`,
                background: `linear-gradient(180deg, ${accentColor}40, ${accentColor}10)`,
              }}
            />
          )}

          {/* Step number */}
          <div
            style={{
              flexShrink: 0,
              width: '48px',
              height: '48px',
              borderRadius: tokens.radii.full,
              background: `linear-gradient(135deg, ${accentColor}, ${tokens.colors.accent.secondary})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: tokens.typography.fontSize.xl,
              fontWeight: tokens.typography.fontWeight.bold,
              color: tokens.colors.text.primary,
              boxShadow: `0 0 20px ${accentColor}40`,
              position: 'relative',
              zIndex: 1,
            }}
          >
            {step.number}
          </div>

          {/* Content */}
          <GlassCard variant="light" padding="md" style={{ flex: 1 }}>
            <h3
              style={{
                fontSize: tokens.typography.fontSize.lg,
                fontWeight: tokens.typography.fontWeight.semibold,
                marginBottom: tokens.spacing[2],
                color: tokens.colors.text.primary,
              }}
            >
              {step.title}
            </h3>
            <p
              style={{
                fontSize: tokens.typography.fontSize.base,
                color: tokens.colors.text.secondary,
                lineHeight: tokens.typography.lineHeight.relaxed,
                margin: 0,
              }}
            >
              {step.description}
            </p>
          </GlassCard>
        </motion.div>
      ))}
    </div>
  );

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Section Header */}
      <motion.div variants={itemVariants} style={{ textAlign: 'center', marginBottom: tokens.spacing[12] }}>
        <h2
          style={{
            fontSize: 'clamp(2rem, 5vw, 3rem)',
            fontWeight: tokens.typography.fontWeight.bold,
            marginBottom: tokens.spacing[4],
            color: tokens.colors.text.primary,
          }}
        >
          {title}
        </h2>
        {subtitle && (
          <p
            style={{
              fontSize: tokens.typography.fontSize.lg,
              color: tokens.colors.text.secondary,
              maxWidth: '600px',
              margin: '0 auto',
            }}
          >
            {subtitle}
          </p>
        )}
      </motion.div>

      {/* Steps */}
      {variant === 'timeline' ? renderTimeline() : renderHorizontal()}
    </motion.div>
  );
};

export default ProcessSection;
