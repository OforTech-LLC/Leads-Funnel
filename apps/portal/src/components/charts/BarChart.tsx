'use client';

import { useState, useMemo, useCallback } from 'react';

interface BarDataPoint {
  label: string;
  value: number;
  color?: string;
}

interface BarChartProps {
  data: BarDataPoint[];
  height?: number;
  barColor?: string;
  className?: string;
}

const PADDING = { top: 20, right: 20, bottom: 50, left: 50 };
const BAR_GAP_RATIO = 0.3; // 30% gap between bars

export default function BarChart({
  data,
  height = 280,
  barColor = '#3b82f6',
  className = '',
}: BarChartProps) {
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    label: string;
    value: number;
  } | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [dimensions, setDimensions] = useState({ width: 400 });

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

  const { yMax, yTicks, barWidth, barGap, bars } = useMemo(() => {
    if (data.length === 0) {
      return { yMax: 100, yTicks: [0, 50, 100], barWidth: 0, barGap: 0, bars: [] };
    }

    const maxVal = Math.max(...data.map((d) => d.value), 1);
    const magnitude = Math.pow(10, Math.floor(Math.log10(maxVal)));
    const normalized = maxVal / magnitude;
    let niceMax: number;
    if (normalized <= 1) niceMax = 1 * magnitude;
    else if (normalized <= 2) niceMax = 2 * magnitude;
    else if (normalized <= 5) niceMax = 5 * magnitude;
    else niceMax = 10 * magnitude;
    if (niceMax === 0) niceMax = 10;

    const tickCount = 5;
    const ticks = Array.from({ length: tickCount }, (_, i) =>
      Math.round((niceMax / (tickCount - 1)) * i)
    );

    const totalSlotWidth = chartWidth / data.length;
    const gap = totalSlotWidth * BAR_GAP_RATIO;
    const bw = totalSlotWidth - gap;

    const barData = data.map((d, i) => {
      const x = PADDING.left + i * totalSlotWidth + gap / 2;
      const barH = (d.value / niceMax) * chartHeight;
      const y = PADDING.top + chartHeight - barH;
      return { ...d, x, y, barH, barW: bw };
    });

    return { yMax: niceMax, yTicks: ticks, barWidth: bw, barGap: gap, bars: barData };
  }, [data, chartWidth, chartHeight]);

  if (data.length === 0) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl border border-gray-100 bg-white ${className}`}
        style={{ height }}
      >
        <p className="text-sm text-gray-400">No data available</p>
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
        aria-label="Bar chart showing leads by funnel"
        onMouseLeave={() => {
          setTooltip(null);
          setHoveredIndex(null);
        }}
      >
        {/* Y-axis grid lines and labels */}
        {yTicks.map((tick) => {
          const y = PADDING.top + chartHeight - (tick / yMax) * chartHeight;
          return (
            <g key={tick}>
              <line
                x1={PADDING.left}
                y1={y}
                x2={width - PADDING.right}
                y2={y}
                stroke="#f1f5f9"
                strokeWidth={1}
              />
              <text
                x={PADDING.left - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-gray-400 text-[11px]"
              >
                {tick}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {bars.map((bar, i) => (
          <g key={i}>
            <rect
              x={bar.x}
              y={bar.y}
              width={bar.barW}
              height={bar.barH}
              rx={4}
              fill={bar.color || barColor}
              opacity={hoveredIndex === null || hoveredIndex === i ? 1 : 0.5}
              className="transition-opacity duration-150"
              style={{
                animation: `bar-grow 0.6s ease-out ${i * 0.05}s both`,
                transformOrigin: `${bar.x + bar.barW / 2}px ${PADDING.top + chartHeight}px`,
              }}
              onMouseEnter={() => {
                setHoveredIndex(i);
                setTooltip({
                  x: bar.x + bar.barW / 2,
                  y: bar.y,
                  label: bar.label,
                  value: bar.value,
                });
              }}
              onMouseLeave={() => {
                setHoveredIndex(null);
                setTooltip(null);
              }}
            />

            {/* X-axis label */}
            <text
              x={bar.x + bar.barW / 2}
              y={height - 8}
              textAnchor="middle"
              className="fill-gray-400 text-[10px]"
            >
              {bar.label.length > 10 ? bar.label.slice(0, 9) + '...' : bar.label}
            </text>
          </g>
        ))}

        {/* Bottom axis line */}
        <line
          x1={PADDING.left}
          y1={PADDING.top + chartHeight}
          x2={width - PADDING.right}
          y2={PADDING.top + chartHeight}
          stroke="#e2e8f0"
          strokeWidth={1}
        />
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none absolute z-50 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg"
          style={{
            left: Math.min(Math.max(tooltip.x - 50, 0), width - 120),
            top: tooltip.y - 48,
          }}
        >
          <p className="text-xs font-medium text-gray-500">{tooltip.label}</p>
          <p className="text-sm font-bold text-gray-900">{tooltip.value}</p>
        </div>
      )}
    </div>
  );
}
