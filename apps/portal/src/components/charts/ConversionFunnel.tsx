'use client';

import { useState, useMemo, useCallback } from 'react';
import type { ConversionFunnelStage } from '@/lib/analytics';

interface ConversionFunnelProps {
  data: ConversionFunnelStage[];
  height?: number;
  className?: string;
}

const STAGE_COLORS = [
  { bg: '#3b82f6', bgLight: '#dbeafe' }, // blue - New
  { bg: '#8b5cf6', bgLight: '#ede9fe' }, // purple - Contacted
  { bg: '#06b6d4', bgLight: '#cffafe' }, // cyan - Qualified
  { bg: '#6366f1', bgLight: '#e0e7ff' }, // indigo - Booked
  { bg: '#10b981', bgLight: '#d1fae5' }, // green - Converted
];

const PADDING = { top: 20, right: 20, bottom: 20, left: 20 };

export default function ConversionFunnel({
  data,
  height = 180,
  className = '',
}: ConversionFunnelProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [dimensions, setDimensions] = useState({ width: 600 });

  const containerRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({ width: entry.contentRect.width });
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const { width } = dimensions;
  const chartWidth = width - PADDING.left - PADDING.right;
  const chartHeight = height - PADDING.top - PADDING.bottom;

  const maxCount = useMemo(() => Math.max(...data.map((d) => d.count), 1), [data]);

  const stages = useMemo(() => {
    if (data.length === 0) return [];

    const stageGap = 4;
    const totalGaps = (data.length - 1) * stageGap;
    const stageWidth = (chartWidth - totalGaps) / data.length;
    const maxBarHeight = chartHeight - 40; // leave space for labels

    return data.map((d, i) => {
      const x = PADDING.left + i * (stageWidth + stageGap);
      const barHeight = Math.max(8, (d.count / maxCount) * maxBarHeight);
      const y = PADDING.top + (maxBarHeight - barHeight);
      const colors = STAGE_COLORS[i % STAGE_COLORS.length];

      return {
        ...d,
        x,
        y,
        barHeight,
        stageWidth,
        colors,
      };
    });
  }, [data, chartWidth, chartHeight, maxCount]);

  if (data.length === 0) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl border border-gray-100 bg-white ${className}`}
        style={{ height }}
      >
        <p className="text-sm text-gray-400">No funnel data available</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <svg
        width={width}
        height={height}
        className="w-full"
        role="img"
        aria-label="Conversion funnel showing lead progression through stages"
      >
        {/* Stages */}
        {stages.map((stage, i) => {
          const isHovered = hoveredIndex === i;
          return (
            <g
              key={i}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {/* Bar */}
              <rect
                x={stage.x}
                y={stage.y}
                width={stage.stageWidth}
                height={stage.barHeight}
                rx={6}
                fill={stage.colors.bg}
                opacity={hoveredIndex === null || isHovered ? 1 : 0.5}
                className="transition-all duration-200"
                style={{
                  animation: `bar-grow 0.6s ease-out ${i * 0.1}s both`,
                  transformOrigin: `${stage.x + stage.stageWidth / 2}px ${PADDING.top + chartHeight - 40}px`,
                }}
              />

              {/* Count inside bar */}
              {stage.barHeight > 20 && (
                <text
                  x={stage.x + stage.stageWidth / 2}
                  y={stage.y + stage.barHeight / 2 + 5}
                  textAnchor="middle"
                  className="fill-white text-sm font-bold"
                >
                  {stage.count}
                </text>
              )}

              {/* Count above bar if bar is too small */}
              {stage.barHeight <= 20 && (
                <text
                  x={stage.x + stage.stageWidth / 2}
                  y={stage.y - 6}
                  textAnchor="middle"
                  className="fill-gray-700 text-xs font-bold"
                >
                  {stage.count}
                </text>
              )}

              {/* Label below */}
              <text
                x={stage.x + stage.stageWidth / 2}
                y={PADDING.top + chartHeight - 20}
                textAnchor="middle"
                className="fill-gray-600 text-[11px] font-medium"
              >
                {stage.label}
              </text>

              {/* Percentage */}
              <text
                x={stage.x + stage.stageWidth / 2}
                y={PADDING.top + chartHeight - 6}
                textAnchor="middle"
                className="fill-gray-400 text-[10px]"
              >
                {stage.percentage}%
              </text>

              {/* Drop-off arrow between stages */}
              {i < stages.length - 1 && (
                <g>
                  {/* Arrow */}
                  <text
                    x={stage.x + stage.stageWidth + 2}
                    y={PADDING.top + chartHeight - 32}
                    textAnchor="middle"
                    className="fill-gray-300 text-sm"
                  >
                    {/* Use a right arrow character */}
                  </text>

                  {/* Drop-off percentage */}
                  {stage.dropOffPercent > 0 && isHovered && (
                    <g>
                      <rect
                        x={stage.x + stage.stageWidth - 4}
                        y={stage.y - 22}
                        width={40}
                        height={18}
                        rx={4}
                        fill="#fef2f2"
                        stroke="#fecaca"
                        strokeWidth={1}
                      />
                      <text
                        x={stage.x + stage.stageWidth + 16}
                        y={stage.y - 10}
                        textAnchor="middle"
                        className="fill-red-600 text-[10px] font-medium"
                      >
                        -{stage.dropOffPercent}%
                      </text>
                    </g>
                  )}
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {/* Hover tooltip */}
      {hoveredIndex !== null && stages[hoveredIndex] && (
        <div
          className="pointer-events-none absolute z-50 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg"
          style={{
            left: Math.min(
              Math.max(stages[hoveredIndex].x + stages[hoveredIndex].stageWidth / 2 - 70, 0),
              width - 160
            ),
            top: stages[hoveredIndex].y - 60,
          }}
        >
          <p className="text-xs font-semibold text-gray-900">{stages[hoveredIndex].label}</p>
          <p className="text-xs text-gray-500">
            {stages[hoveredIndex].count} leads ({stages[hoveredIndex].percentage}%)
          </p>
          {hoveredIndex > 0 && stages[hoveredIndex].dropOffPercent > 0 && (
            <p className="text-xs text-red-500">
              {stages[hoveredIndex].dropOffPercent}% drop-off from previous
            </p>
          )}
        </div>
      )}

      {/* Accessible data table (visually hidden) */}
      <div className="sr-only">
        <table>
          <caption>Conversion funnel stages</caption>
          <thead>
            <tr>
              <th>Stage</th>
              <th>Count</th>
              <th>Percentage</th>
              <th>Drop-off</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.stage}>
                <td>{d.label}</td>
                <td>{d.count}</td>
                <td>{d.percentage}%</td>
                <td>{d.dropOffPercent > 0 ? `${d.dropOffPercent}%` : 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
