'use client';

/**
 * SVG Bar Chart
 *
 * Vertical grouped bar chart with:
 * - Hover tooltips
 * - Animated entrance (bars grow upward)
 * - Legend
 * - Responsive width via ResizeObserver
 */

import { useRef, useState, useEffect, useMemo } from 'react';

export interface BarChartSeries {
  name: string;
  data: number[];
  color: string;
}

interface BarChartProps {
  series: BarChartSeries[];
  labels: string[];
  height?: number;
  yAxisLabel?: string;
}

const PADDING = { top: 20, right: 20, bottom: 50, left: 50 };
const GRID_LINE_COUNT = 5;
const BAR_GROUP_GAP = 0.3; // fraction of group width for gap
const BAR_GAP = 2; // px between bars in a group

export default function BarChart({ series, labels, height = 300, yAxisLabel }: BarChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const [animated, setAnimated] = useState(false);
  const [hoveredBar, setHoveredBar] = useState<{
    x: number;
    y: number;
    label: string;
    seriesName: string;
    value: number;
    color: string;
  } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    setWidth(el.getBoundingClientRect().width);

    const timer = setTimeout(() => setAnimated(true), 50);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, []);

  const chartWidth = width - PADDING.left - PADDING.right;
  const chartHeight = height - PADDING.top - PADDING.bottom;

  // Y-axis range
  const { yMax, yStep } = useMemo(() => {
    let max = 0;
    for (const s of series) {
      for (const v of s.data) {
        if (v > max) max = v;
      }
    }
    if (max === 0) max = 10;
    const step = Math.ceil(max / GRID_LINE_COUNT);
    return { yMax: step * GRID_LINE_COUNT, yStep: step };
  }, [series]);

  const getY = (value: number) => PADDING.top + chartHeight - (value / yMax) * chartHeight;

  // Grid lines
  const gridLines = useMemo(() => {
    const lines = [];
    for (let i = 0; i <= GRID_LINE_COUNT; i++) {
      const value = i * yStep;
      lines.push({ y: getY(value), label: value.toLocaleString() });
    }
    return lines;
  }, [yStep, yMax, chartHeight]);

  // Bar dimensions
  const groupWidth = labels.length > 0 ? chartWidth / labels.length : 0;
  const barAreaWidth = groupWidth * (1 - BAR_GROUP_GAP);
  const barWidth =
    series.length > 0
      ? (barAreaWidth - BAR_GAP * (series.length - 1)) / series.length
      : barAreaWidth;

  return (
    <div ref={containerRef} className="w-full relative">
      <svg
        width={width}
        height={height}
        className="select-none"
        onMouseLeave={() => setHoveredBar(null)}
      >
        {/* Grid lines */}
        {gridLines.map((line, i) => (
          <g key={i}>
            <line
              x1={PADDING.left}
              y1={line.y}
              x2={width - PADDING.right}
              y2={line.y}
              stroke="var(--border-color)"
              strokeDasharray={i === 0 ? undefined : '4,4'}
              strokeWidth={1}
            />
            <text
              x={PADDING.left - 8}
              y={line.y + 4}
              textAnchor="end"
              className="text-[10px] fill-[var(--text-tertiary)]"
            >
              {line.label}
            </text>
          </g>
        ))}

        {/* Y-axis label */}
        {yAxisLabel && (
          <text
            x={14}
            y={height / 2}
            textAnchor="middle"
            transform={`rotate(-90, 14, ${height / 2})`}
            className="text-[10px] fill-[var(--text-secondary)]"
          >
            {yAxisLabel}
          </text>
        )}

        {/* X-axis labels */}
        {labels.map((label, i) => {
          const x = PADDING.left + groupWidth * i + groupWidth / 2;
          return (
            <text
              key={i}
              x={x}
              y={height - 8}
              textAnchor="middle"
              className="text-[10px] fill-[var(--text-tertiary)]"
            >
              {label.length > 12 ? label.slice(0, 12) + '...' : label}
            </text>
          );
        })}

        {/* Bars */}
        {labels.map((label, labelIndex) => {
          const groupX = PADDING.left + groupWidth * labelIndex + (groupWidth * BAR_GROUP_GAP) / 2;

          return series.map((s, seriesIndex) => {
            const value = s.data[labelIndex] ?? 0;
            const barHeight = (value / yMax) * chartHeight;
            const x = groupX + seriesIndex * (barWidth + BAR_GAP);
            const y = PADDING.top + chartHeight - barHeight;

            return (
              <rect
                key={`${label}-${s.name}`}
                x={x}
                y={y}
                width={Math.max(barWidth, 1)}
                height={Math.max(barHeight, 0)}
                fill={s.color}
                rx={2}
                className="cursor-pointer"
                style={{
                  transformOrigin: `${x + barWidth / 2}px ${PADDING.top + chartHeight}px`,
                  transform: animated ? 'scaleY(1)' : 'scaleY(0)',
                  transition: `transform 0.6s ease-out ${labelIndex * 0.05}s`,
                  opacity:
                    hoveredBar && hoveredBar.label === label && hoveredBar.seriesName !== s.name
                      ? 0.5
                      : 1,
                }}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const svgRect = containerRef.current?.getBoundingClientRect();
                  setHoveredBar({
                    x: rect.left - (svgRect?.left || 0) + barWidth / 2,
                    y: y - 8,
                    label,
                    seriesName: s.name,
                    value,
                    color: s.color,
                  });
                }}
                onMouseLeave={() => setHoveredBar(null)}
              />
            );
          });
        })}
      </svg>

      {/* Tooltip */}
      {hoveredBar && (
        <div
          className="absolute pointer-events-none bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg shadow-lg p-2.5 text-xs z-50"
          style={{
            left: Math.min(hoveredBar.x + 8, width - 140),
            top: Math.max(hoveredBar.y, 0),
          }}
        >
          <div className="font-medium text-[var(--text-primary)] mb-0.5">{hoveredBar.label}</div>
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: hoveredBar.color }}
            />
            <span className="text-[var(--text-secondary)]">{hoveredBar.seriesName}:</span>
            <span className="font-medium text-[var(--text-primary)]">
              {hoveredBar.value.toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* Legend */}
      {series.length > 1 && (
        <div className="flex items-center gap-4 mt-2 px-2">
          {series.map((s) => (
            <div key={s.name} className="flex items-center gap-1.5 text-xs">
              <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: s.color }} />
              <span className="text-[var(--text-secondary)]">{s.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
