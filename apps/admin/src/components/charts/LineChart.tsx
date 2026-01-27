'use client';

/**
 * SVG Line Chart
 *
 * Pure SVG + React line chart with:
 * - Multiple series support with different colors
 * - Animated path drawing via CSS transitions
 * - Hover tooltips showing exact values
 * - Responsive width via ResizeObserver
 * - X-axis date labels, Y-axis count labels
 * - Grid lines
 */

import { useRef, useState, useEffect, useCallback, useMemo } from 'react';

export interface LineChartSeries {
  name: string;
  data: number[];
  color: string;
}

interface LineChartProps {
  series: LineChartSeries[];
  labels: string[];
  height?: number;
  yAxisLabel?: string;
}

const PADDING = { top: 20, right: 20, bottom: 40, left: 50 };
const GRID_LINE_COUNT = 5;

export default function LineChart({ series, labels, height = 300, yAxisLabel }: LineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    label: string;
    values: { name: string; value: number; color: string }[];
  } | null>(null);
  const [animated, setAnimated] = useState(false);

  // Responsive width
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

    // Trigger animation after mount
    const timer = setTimeout(() => setAnimated(true), 50);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, []);

  // Chart dimensions
  const chartWidth = width - PADDING.left - PADDING.right;
  const chartHeight = height - PADDING.top - PADDING.bottom;

  // Compute y-axis range
  const { yMin, yMax, yStep } = useMemo(() => {
    let max = 0;
    for (const s of series) {
      for (const v of s.data) {
        if (v > max) max = v;
      }
    }
    if (max === 0) max = 10;
    const step = Math.ceil(max / GRID_LINE_COUNT);
    return { yMin: 0, yMax: step * GRID_LINE_COUNT, yStep: step };
  }, [series]);

  // Map data to SVG coordinates
  const getX = useCallback(
    (index: number) => {
      if (labels.length <= 1) return PADDING.left + chartWidth / 2;
      return PADDING.left + (index / (labels.length - 1)) * chartWidth;
    },
    [labels.length, chartWidth]
  );

  const getY = useCallback(
    (value: number) => {
      return PADDING.top + chartHeight - (value / yMax) * chartHeight;
    },
    [chartHeight, yMax]
  );

  // Build SVG path for a series
  const buildPath = useCallback(
    (data: number[]) => {
      if (data.length === 0) return '';
      return data
        .map((v, i) => {
          const x = getX(i);
          const y = getY(v);
          return `${i === 0 ? 'M' : 'L'}${x},${y}`;
        })
        .join(' ');
    },
    [getX, getY]
  );

  // Compute path length for animation
  const computePathLength = useCallback(
    (data: number[]) => {
      let length = 0;
      for (let i = 1; i < data.length; i++) {
        const dx = getX(i) - getX(i - 1);
        const dy = getY(data[i]) - getY(data[i - 1]);
        length += Math.sqrt(dx * dx + dy * dy);
      }
      return length;
    },
    [getX, getY]
  );

  // Grid lines
  const gridLines = useMemo(() => {
    const lines = [];
    for (let i = 0; i <= GRID_LINE_COUNT; i++) {
      const value = yMin + i * yStep;
      const y = getY(value);
      lines.push({ y, label: value.toLocaleString() });
    }
    return lines;
  }, [yMin, yStep, getY]);

  // X-axis labels (show max ~10 labels)
  const xAxisLabels = useMemo(() => {
    if (labels.length <= 10) {
      return labels.map((l, i) => ({ x: getX(i), label: l }));
    }
    const step = Math.ceil(labels.length / 10);
    return labels
      .filter((_, i) => i % step === 0 || i === labels.length - 1)
      .map((l) => {
        const origIndex = labels.indexOf(l);
        return { x: getX(origIndex), label: l };
      });
  }, [labels, getX]);

  // Handle mouse move for tooltip
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const svg = e.currentTarget;
      const rect = svg.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;

      // Find nearest data point index
      let nearestIndex = 0;
      let nearestDist = Infinity;
      for (let i = 0; i < labels.length; i++) {
        const dist = Math.abs(getX(i) - mouseX);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestIndex = i;
        }
      }

      if (nearestDist > 50) {
        setTooltip(null);
        return;
      }

      setTooltip({
        x: getX(nearestIndex),
        y: PADDING.top,
        label: labels[nearestIndex],
        values: series.map((s) => ({
          name: s.name,
          value: s.data[nearestIndex] ?? 0,
          color: s.color,
        })),
      });
    },
    [labels, series, getX]
  );

  return (
    <div ref={containerRef} className="w-full">
      <svg
        width={width}
        height={height}
        className="select-none"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
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
        {xAxisLabels.map((item, i) => (
          <text
            key={i}
            x={item.x}
            y={height - 8}
            textAnchor="middle"
            className="text-[10px] fill-[var(--text-tertiary)]"
          >
            {item.label}
          </text>
        ))}

        {/* Data lines */}
        {series.map((s) => {
          const path = buildPath(s.data);
          const pathLength = computePathLength(s.data);
          return (
            <path
              key={s.name}
              d={path}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                strokeDasharray: pathLength,
                strokeDashoffset: animated ? 0 : pathLength,
                transition: 'stroke-dashoffset 1s ease-out',
              }}
            />
          );
        })}

        {/* Data points */}
        {series.map((s) =>
          s.data.map((v, i) => (
            <circle
              key={`${s.name}-${i}`}
              cx={getX(i)}
              cy={getY(v)}
              r={3}
              fill={s.color}
              stroke="var(--card-bg)"
              strokeWidth={2}
              style={{
                opacity: animated ? 1 : 0,
                transition: `opacity 0.3s ease-out ${0.8 + i * 0.02}s`,
              }}
            />
          ))
        )}

        {/* Tooltip hover line */}
        {tooltip && (
          <>
            <line
              x1={tooltip.x}
              y1={PADDING.top}
              x2={tooltip.x}
              y2={height - PADDING.bottom}
              stroke="var(--text-tertiary)"
              strokeWidth={1}
              strokeDasharray="4,4"
            />
            {/* Highlight dots */}
            {tooltip.values.map((v, i) => {
              const dataIndex = labels.indexOf(tooltip.label);
              if (dataIndex < 0) return null;
              return (
                <circle
                  key={i}
                  cx={tooltip.x}
                  cy={getY(v.value)}
                  r={5}
                  fill={v.color}
                  stroke="var(--card-bg)"
                  strokeWidth={2}
                />
              );
            })}
          </>
        )}
      </svg>

      {/* Tooltip popup */}
      {tooltip && (
        <div
          className="absolute pointer-events-none bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg shadow-lg p-3 text-xs z-50"
          style={{
            left: Math.min(tooltip.x + 12, width - 180),
            top: tooltip.y + 12,
          }}
        >
          <div className="font-medium text-[var(--text-primary)] mb-1">{tooltip.label}</div>
          {tooltip.values.map((v, i) => (
            <div key={i} className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: v.color }}
              />
              <span className="text-[var(--text-secondary)]">{v.name}:</span>
              <span className="font-medium text-[var(--text-primary)]">
                {v.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      {series.length > 1 && (
        <div className="flex items-center gap-4 mt-2 px-2">
          {series.map((s) => (
            <div key={s.name} className="flex items-center gap-1.5 text-xs">
              <span className="w-3 h-0.5 rounded" style={{ backgroundColor: s.color }} />
              <span className="text-[var(--text-secondary)]">{s.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
