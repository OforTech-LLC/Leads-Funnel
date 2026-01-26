'use client';

/**
 * Loading Spinner Component
 * Animated spinner for form submission states
 */

import { motion } from 'framer-motion';

interface LoadingSpinnerProps {
  size?: number;
  color?: string;
  className?: string;
}

export function LoadingSpinner({
  size = 24,
  color = 'currentColor',
  className = '',
}: LoadingSpinnerProps) {
  return (
    <div className={className} style={{ width: size, height: size }}>
      <motion.svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        animate={{ rotate: 360 }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: 'linear',
        }}
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke={color}
          strokeWidth="3"
          fill="none"
          strokeOpacity="0.25"
        />
        <motion.circle
          cx="12"
          cy="12"
          r="10"
          stroke={color}
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          strokeDasharray="63"
          strokeDashoffset="47"
        />
      </motion.svg>
    </div>
  );
}

/**
 * Dot Loading Animation
 * Three bouncing dots for loading states
 */
export function LoadingDots({
  size = 8,
  color = 'currentColor',
  className = '',
}: LoadingSpinnerProps) {
  const dotVariants = {
    start: { y: 0 },
    end: { y: -10 },
  };

  const containerVariants = {
    start: {
      transition: {
        staggerChildren: 0.15,
      },
    },
    end: {
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  return (
    <motion.div
      className={className}
      style={{ display: 'flex', gap: size / 2, alignItems: 'center' }}
      variants={containerVariants}
      initial="start"
      animate="end"
    >
      {[0, 1, 2].map((index) => (
        <motion.span
          key={index}
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            backgroundColor: color,
          }}
          variants={dotVariants}
          transition={{
            duration: 0.4,
            repeat: Infinity,
            repeatType: 'reverse',
            ease: 'easeInOut',
          }}
        />
      ))}
    </motion.div>
  );
}

export default LoadingSpinner;
