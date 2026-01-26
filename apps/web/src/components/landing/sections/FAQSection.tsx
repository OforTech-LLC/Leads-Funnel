'use client';

/**
 * FAQ Section Component
 *
 * Display frequently asked questions with accordion.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { FAQAccordion, tokens } from '@/design-system';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSectionProps {
  title: string;
  subtitle?: string;
  faqs: FAQItem[];
  accentColor?: string;
}

export const FAQSection: React.FC<FAQSectionProps> = ({
  title,
  subtitle,
  faqs,
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
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: 'easeOut' },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-100px' }}
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

      {/* FAQ Accordion */}
      <motion.div variants={itemVariants}>
        <FAQAccordion items={faqs} />
      </motion.div>

      {/* Contact prompt */}
      <motion.div
        variants={itemVariants}
        style={{
          textAlign: 'center',
          marginTop: tokens.spacing[10],
          padding: tokens.spacing[6],
          background: tokens.colors.surface.glass,
          borderRadius: tokens.radii.xl,
          border: `1px solid ${tokens.colors.border.subtle}`,
        }}
      >
        <p style={{ color: tokens.colors.text.secondary, margin: 0 }}>
          Still have questions?{' '}
          <a
            href="#contact"
            style={{
              color: accentColor,
              textDecoration: 'none',
              fontWeight: tokens.typography.fontWeight.medium,
            }}
          >
            Contact us
          </a>{' '}
          and we&apos;ll be happy to help.
        </p>
      </motion.div>
    </motion.div>
  );
};

export default FAQSection;
