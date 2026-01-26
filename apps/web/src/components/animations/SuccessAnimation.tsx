'use client';

/**
 * Success Animation Component
 * Animated checkmark for form submission success
 */

import { motion } from 'framer-motion';

interface SuccessAnimationProps {
  size?: number;
  color?: string;
  className?: string;
}

export function SuccessAnimation({
  size = 120,
  color = '#10B981',
  className = '',
}: SuccessAnimationProps) {
  const checkVariants = {
    hidden: {
      pathLength: 0,
      opacity: 0,
    },
    visible: {
      pathLength: 1,
      opacity: 1,
      transition: {
        pathLength: { duration: 0.5, ease: 'easeOut', delay: 0.2 },
        opacity: { duration: 0.2 },
      },
    },
  };

  const circleVariants = {
    hidden: {
      scale: 0,
      opacity: 0,
    },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        scale: { duration: 0.4, ease: [0.34, 1.56, 0.64, 1] },
        opacity: { duration: 0.2 },
      },
    },
  };

  return (
    <div className={className} style={{ width: size, height: size }}>
      <motion.svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        initial="hidden"
        animate="visible"
      >
        {/* Background circle */}
        <motion.circle
          cx="50"
          cy="50"
          r="45"
          fill={`${color}15`}
          stroke={color}
          strokeWidth="2"
          variants={circleVariants}
        />

        {/* Inner circle pulse */}
        <motion.circle
          cx="50"
          cy="50"
          r="35"
          fill={`${color}25`}
          variants={circleVariants}
          transition={{ delay: 0.1 }}
        />

        {/* Checkmark */}
        <motion.path
          d="M30 52 L45 67 L72 35"
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          variants={checkVariants}
        />
      </motion.svg>
    </div>
  );
}

export default SuccessAnimation;
