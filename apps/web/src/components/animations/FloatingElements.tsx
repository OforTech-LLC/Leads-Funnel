'use client';

/**
 * Floating Elements Component
 * Decorative floating shapes in background
 */

import { motion } from 'framer-motion';
import { useMemo } from 'react';

interface FloatingElementsProps {
  count?: number;
  colors?: string[];
  minSize?: number;
  maxSize?: number;
  className?: string;
}

interface FloatingShape {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  duration: number;
  delay: number;
  shape: 'circle' | 'square' | 'triangle';
}

export function FloatingElements({
  count = 12,
  colors = ['#3B82F6', '#8B5CF6', '#EC4899', '#06B6D4', '#22C55E'],
  minSize = 20,
  maxSize = 80,
  className = '',
}: FloatingElementsProps) {
  const shapes = useMemo<FloatingShape[]>(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: minSize + Math.random() * (maxSize - minSize),
      color: colors[Math.floor(Math.random() * colors.length)],
      duration: 15 + Math.random() * 20,
      delay: Math.random() * -20,
      shape: (['circle', 'square', 'triangle'] as const)[Math.floor(Math.random() * 3)],
    }));
  }, [count, colors, minSize, maxSize]);

  const renderShape = (shape: FloatingShape) => {
    const commonStyle = {
      backgroundColor: shape.color,
      width: shape.size,
      height: shape.size,
      opacity: 0.15,
    };

    switch (shape.shape) {
      case 'circle':
        return <div style={{ ...commonStyle, borderRadius: '50%' }} />;
      case 'square':
        return <div style={{ ...commonStyle, borderRadius: '4px' }} />;
      case 'triangle':
        return (
          <div
            style={{
              width: 0,
              height: 0,
              backgroundColor: 'transparent',
              borderLeft: `${shape.size / 2}px solid transparent`,
              borderRight: `${shape.size / 2}px solid transparent`,
              borderBottom: `${shape.size}px solid ${shape.color}`,
              opacity: 0.15,
            }}
          />
        );
    }
  };

  return (
    <div
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      {shapes.map((shape) => (
        <motion.div
          key={shape.id}
          initial={{
            x: `${shape.x}vw`,
            y: `${shape.y}vh`,
            rotate: 0,
          }}
          animate={{
            x: [`${shape.x}vw`, `${(shape.x + 20) % 100}vw`, `${shape.x}vw`],
            y: [`${shape.y}vh`, `${(shape.y + 30) % 100}vh`, `${shape.y}vh`],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: shape.duration,
            delay: shape.delay,
            repeat: Infinity,
            ease: 'linear',
          }}
          style={{
            position: 'absolute',
            willChange: 'transform',
          }}
        >
          {renderShape(shape)}
        </motion.div>
      ))}
    </div>
  );
}

export default FloatingElements;
