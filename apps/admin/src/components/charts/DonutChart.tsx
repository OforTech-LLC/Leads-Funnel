'use client';

/**
 * SVG Donut Chart
 *
 * Animated donut/pie chart with:
 * - Animated segment drawing
 * - Center summary text
 * - Legend with values
 * - Hover highlight effect
 */

import { useState, useEffect, useMemo } from 'react';

export interface DonutChartSegment {
  name: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  segments: DonutChartSegment[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string | number;
}

const ANIMATION_DURATION = 800;

export default function DonutChart({
  segments,
  size = 200,
  thickness = 32,
  centerLabel,
  centerValue,
}: DonutChartProps) {
  const [animated, setAnimated] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const total = useMemo(() => segments.reduce((sum, s) => sum + s.value, 0), [segments]);

  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  // Compute segment arcs
  const arcs = useMemo(() => {
    let accumulated = 0;
    return segments.map((segment) => {
      const fraction = total > 0 ? segment.value / total : 0;
      const dashLength = fraction * circumference;
      const dashGap = circumference - dashLength;
      const rotation = (accumulated / total) * 360 - 90;
      accumulated += segment.value;
      return {
        segment,
        fraction,
        dashArray: `${dashLength} ${dashGap}`,
        rotation,
        dashLength,
      };
    });
  }, [segments, total, circumference]);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Chart */}
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="select-none">
          {/* Background circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="var(--border-color)"
            strokeWidth={thickness}
          />

          {/* Segments */}
          {arcs.map((arc, i) => (
            <circle
              key={arc.segment.name}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={arc.segment.color}
              strokeWidth={hoveredIndex === i ? thickness + 4 : thickness}
              strokeDasharray={arc.dashArray}
              strokeDashoffset={animated ? 0 : circumference}
              strokeLinecap="butt"
              transform={`rotate(${arc.rotation} ${center} ${center})`}
              className="cursor-pointer"
              style={{
                transition: `stroke-dashoffset ${ANIMATION_DURATION}ms ease-out ${i * 100}ms, stroke-width 0.2s ease`,
                opacity: hoveredIndex !== null && hoveredIndex !== i ? 0.5 : 1,
              }}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
          ))}
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {centerValue !== undefined && (
            <span className="text-2xl font-semibold text-[var(--text-primary)]">
              {typeof centerValue === 'number' ? centerValue.toLocaleString() : centerValue}
            </span>
          )}
          {centerLabel && (
            <span className="text-xs text-[var(--text-secondary)]">{centerLabel}</span>
          )}
        </div>
      </div>

      {/* Hover info */}
      {hoveredIndex !== null && segments[hoveredIndex] && (
        <div className="text-center text-sm">
          <span className="font-medium text-[var(--text-primary)]">
            {segments[hoveredIndex].name}
          </span>
          <span className="text-[var(--text-secondary)] ml-2">
            {segments[hoveredIndex].value.toLocaleString()}
            {total > 0 && (
              <span className="ml-1">
                ({((segments[hoveredIndex].value / total) * 100).toFixed(1)}%)
              </span>
            )}
          </span>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5">
        {segments.map((segment, i) => (
          <div
            key={segment.name}
            className="flex items-center gap-1.5 text-xs cursor-pointer"
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: segment.color }}
            />
            <span className="text-[var(--text-secondary)]">{segment.name}</span>
            <span className="text-[var(--text-primary)] font-medium">
              {segment.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
