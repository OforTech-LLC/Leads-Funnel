'use client';

import { useState, useMemo } from 'react';

interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutSegment[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  className?: string;
}

export default function DonutChart({
  data,
  size = 220,
  thickness = 36,
  centerLabel,
  className = '',
}: DonutChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const total = useMemo(() => data.reduce((sum, d) => sum + d.value, 0), [data]);

  const segments = useMemo(() => {
    if (total === 0) return [];

    const cx = size / 2;
    const cy = size / 2;
    const radius = (size - thickness) / 2;
    const circumference = 2 * Math.PI * radius;

    let offset = 0;
    return data.map((d) => {
      const fraction = d.value / total;
      const dashLength = fraction * circumference;
      const gapLength = circumference - dashLength;
      const rotation = (offset / total) * 360 - 90; // start from top

      offset += d.value;

      return {
        ...d,
        cx,
        cy,
        radius,
        circumference,
        dashLength,
        gapLength,
        rotation,
        fraction,
        percentage: Math.round(fraction * 100),
      };
    });
  }, [data, total, size, thickness]);

  if (data.length === 0 || total === 0) {
    return (
      <div
        className={`flex flex-col items-center justify-center ${className}`}
        style={{ minHeight: size }}
      >
        <p className="text-sm text-gray-400">No data available</p>
      </div>
    );
  }

  const hoveredSegment = hoveredIndex !== null ? segments[hoveredIndex] : null;

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* SVG Donut */}
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          role="img"
          aria-label="Donut chart showing leads by status"
        >
          {/* Background ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={(size - thickness) / 2}
            fill="none"
            stroke="#f1f5f9"
            strokeWidth={thickness}
          />

          {/* Segments */}
          {segments.map((seg, i) => (
            <circle
              key={i}
              cx={seg.cx}
              cy={seg.cy}
              r={seg.radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={hoveredIndex === i ? thickness + 6 : thickness}
              strokeDasharray={`${seg.dashLength} ${seg.gapLength}`}
              strokeLinecap="butt"
              transform={`rotate(${seg.rotation} ${seg.cx} ${seg.cy})`}
              className="cursor-pointer transition-all duration-200"
              style={{
                opacity: hoveredIndex === null || hoveredIndex === i ? 1 : 0.5,
                animation: `donut-segment 0.8s ease-out ${i * 0.1}s both`,
              }}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
          ))}
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {hoveredSegment ? (
            <>
              <span className="text-2xl font-bold text-gray-900">{hoveredSegment.value}</span>
              <span className="text-xs text-gray-500">{hoveredSegment.label}</span>
              <span className="text-xs text-gray-400">{hoveredSegment.percentage}%</span>
            </>
          ) : (
            <>
              <span className="text-2xl font-bold text-gray-900">{total}</span>
              <span className="text-xs text-gray-500">{centerLabel || 'Total'}</span>
            </>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2">
        {segments.map((seg, i) => (
          <div
            key={i}
            className={`flex items-center gap-1.5 cursor-pointer transition-opacity ${
              hoveredIndex === null || hoveredIndex === i ? 'opacity-100' : 'opacity-50'
            }`}
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: seg.color }}
            />
            <span className="text-xs text-gray-600">
              {seg.label} <span className="font-semibold text-gray-900">{seg.value}</span>
            </span>
          </div>
        ))}
      </div>

      {/* Accessible data table (visually hidden) */}
      <div className="sr-only">
        <table>
          <caption>Leads by status</caption>
          <thead>
            <tr>
              <th>Status</th>
              <th>Count</th>
              <th>Percentage</th>
            </tr>
          </thead>
          <tbody>
            {segments.map((seg) => (
              <tr key={seg.label}>
                <td>{seg.label}</td>
                <td>{seg.value}</td>
                <td>{seg.percentage}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
