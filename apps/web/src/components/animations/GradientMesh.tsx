'use client';

/**
 * Gradient Mesh Background Component
 * Animated gradient background with subtle movement
 */

import { useEffect, useRef } from 'react';

interface GradientMeshProps {
  colors?: string[];
  className?: string;
  speed?: number;
}

export function GradientMesh({
  colors = ['#3B82F6', '#8B5CF6', '#EC4899', '#06B6D4'],
  className = '',
  speed = 0.002,
}: GradientMeshProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    // Set canvas size
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);

    // Animation loop
    const animate = () => {
      if (!canvas || !ctx) return;

      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Create gradient with animated colors
      const gradient = ctx.createLinearGradient(
        width * (0.3 + 0.2 * Math.sin(time)),
        height * (0.2 + 0.2 * Math.cos(time * 0.7)),
        width * (0.7 + 0.2 * Math.cos(time * 0.5)),
        height * (0.8 + 0.2 * Math.sin(time * 0.8))
      );

      colors.forEach((color, i) => {
        const offset = (i / (colors.length - 1) + Math.sin(time + i) * 0.1) % 1;
        gradient.addColorStop(Math.max(0, Math.min(1, offset)), color);
      });

      // Fill with gradient
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Add mesh overlay
      ctx.globalAlpha = 0.1;
      const cellSize = 40;
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 0.5;

      for (let x = 0; x < width; x += cellSize) {
        for (let y = 0; y < height; y += cellSize) {
          const offsetX = Math.sin(time + x * 0.01 + y * 0.01) * 5;
          const offsetY = Math.cos(time + x * 0.01 - y * 0.01) * 5;
          ctx.beginPath();
          ctx.arc(x + offsetX, y + offsetY, 2, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      ctx.globalAlpha = 1;
      time += speed;
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationRef.current);
    };
  }, [colors, speed]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    />
  );
}

export default GradientMesh;
