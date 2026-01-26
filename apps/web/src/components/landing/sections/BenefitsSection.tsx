'use client';

/**
 * Benefits Section Component
 *
 * Display service benefits in a grid layout.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { GlassCard, tokens } from '@/design-system';

interface Benefit {
  icon: React.ReactNode;
  title: string;
  description: string;
}

interface BenefitsSectionProps {
  title: string;
  subtitle?: string;
  benefits: Benefit[];
  columns?: 2 | 3 | 4;
  accentColor?: string;
}

export const BenefitsSection: React.FC<BenefitsSectionProps> = ({
  title,
  subtitle,
  benefits,
  columns = 3,
  accentColor = tokens.colors.accent.primary,
}) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
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

  const gridColumns = {
    2: 'repeat(auto-fit, minmax(300px, 1fr))',
    3: 'repeat(auto-fit, minmax(280px, 1fr))',
    4: 'repeat(auto-fit, minmax(250px, 1fr))',
  };

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

      {/* Benefits Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: gridColumns[columns],
          gap: tokens.spacing[6],
        }}
      >
        {benefits.map((benefit, index) => (
          <motion.div key={index} variants={itemVariants}>
            <GlassCard variant="light" padding="lg" glow>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: tokens.radii.lg,
                  background: `${accentColor}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: tokens.spacing[4],
                  color: accentColor,
                }}
              >
                {benefit.icon}
              </div>
              <h3
                style={{
                  fontSize: tokens.typography.fontSize.xl,
                  fontWeight: tokens.typography.fontWeight.semibold,
                  marginBottom: tokens.spacing[3],
                  color: tokens.colors.text.primary,
                }}
              >
                {benefit.title}
              </h3>
              <p
                style={{
                  fontSize: tokens.typography.fontSize.base,
                  color: tokens.colors.text.secondary,
                  lineHeight: tokens.typography.lineHeight.relaxed,
                  margin: 0,
                }}
              >
                {benefit.description}
              </p>
            </GlassCard>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default BenefitsSection;
