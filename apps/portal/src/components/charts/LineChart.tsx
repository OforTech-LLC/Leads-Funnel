'use client';

import { useState, useMemo, useRef, useCallback } from 'react';

interface DataPoint {
  label: string;
  values: number[];
}

interface LineSeries {
  name: string;
  color: string;
}

interface LineChartProps {
  data: DataPoint[];
  series: LineSeries[];
  height?: number;
  className?: string;
}

const PADDING = { top: 20, right: 20, bottom: 40, left: 50 };

export default function LineChart({ data, series, height = 280, className = '' }: LineChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    label: string;
    values: { name: string; value: number; color: string }[];
  } | null>(null);
  const [dimensions, setDimensions] = useState({ width: 600 });

  // Responsive width
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

  // Compute scales
  const { yMax, yTicks, xStep } = useMemo(() => {
    if (data.length === 0) return { yMax: 100, yTicks: [0, 25, 50, 75, 100], xStep: 0 };

    let maxVal = 0;
    for (const point of data) {
      for (const v of point.values) {
        if (v > maxVal) maxVal = v;
      }
    }

    // Round up to nice number
    const magnitude = Math.pow(10, Math.floor(Math.log10(maxVal || 1)));
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

    return {
      yMax: niceMax,
      yTicks: ticks,
      xStep: data.length > 1 ? chartWidth / (data.length - 1) : chartWidth,
    };
  }, [data, chartWidth]);

  // Build paths
  const paths = useMemo(() => {
    if (data.length === 0) return [];

    return series.map((s, seriesIdx) => {
      const points = data.map((d, i) => {
        const x = PADDING.left + i * xStep;
        const y = PADDING.top + chartHeight - (d.values[seriesIdx] / yMax) * chartHeight;
        return { x, y };
      });

      const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

      // Area fill path
      const areaD =
        pathD +
        ` L ${points[points.length - 1].x} ${PADDING.top + chartHeight}` +
        ` L ${points[0].x} ${PADDING.top + chartHeight} Z`;

      return { ...s, pathD, areaD, points };
    });
  }, [data, series, xStep, yMax, chartHeight]);

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg || data.length === 0) return;

    const rect = svg.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;

    // Find nearest data point
    const idx = Math.round(Math.max(0, Math.min(data.length - 1, (mouseX - PADDING.left) / xStep)));
    const point = data[idx];
    if (!point) return;

    const x = PADDING.left + idx * xStep;
    const minY = Math.min(
      ...series.map((_, si) => PADDING.top + chartHeight - (point.values[si] / yMax) * chartHeight)
    );

    setTooltip({
      x,
      y: minY,
      label: point.label,
      values: series.map((s, si) => ({
        name: s.name,
        value: point.values[si],
        color: s.color,
      })),
    });
  }

  function handleMouseLeave() {
    setTooltip(null);
  }

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

  // Decide which x-axis labels to show (skip some if too many)
  const labelInterval = Math.max(1, Math.ceil(data.length / 8));

  return (
    <div ref={containerRef} className={className}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="w-full"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        role="img"
        aria-label="Line chart showing lead trends over time"
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

        {/* X-axis labels */}
        {data.map((d, i) => {
          if (i % labelInterval !== 0 && i !== data.length - 1) return null;
          const x = PADDING.left + i * xStep;
          return (
            <text
              key={i}
              x={x}
              y={height - 8}
              textAnchor="middle"
              className="fill-gray-400 text-[11px]"
            >
              {d.label}
            </text>
          );
        })}

        {/* Area fills */}
        {paths.map((p) => (
          <path key={`area-${p.name}`} d={p.areaD} fill={p.color} opacity={0.08} />
        ))}

        {/* Lines */}
        {paths.map((p) => (
          <path
            key={`line-${p.name}`}
            d={p.pathD}
            fill="none"
            stroke={p.color}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-all"
            style={{
              strokeDasharray: '2000',
              strokeDashoffset: '0',
              animation: 'line-draw 1.2s ease-out',
            }}
          />
        ))}

        {/* Tooltip crosshair and dots */}
        {tooltip && (
          <>
            <line
              x1={tooltip.x}
              y1={PADDING.top}
              x2={tooltip.x}
              y2={PADDING.top + chartHeight}
              stroke="#cbd5e1"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
            {tooltip.values.map((v, i) => {
              const y = PADDING.top + chartHeight - (v.value / yMax) * chartHeight;
              return (
                <circle
                  key={i}
                  cx={tooltip.x}
                  cy={y}
                  r={5}
                  fill={v.color}
                  stroke="white"
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
          className="pointer-events-none absolute z-50 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg"
          style={{
            left: Math.min(tooltip.x - 60, width - 140),
            top: tooltip.y - 70,
          }}
        >
          <p className="mb-1 text-xs font-medium text-gray-500">{tooltip.label}</p>
          {tooltip.values.map((v) => (
            <div key={v.name} className="flex items-center gap-2 text-xs">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: v.color }}
              />
              <span className="text-gray-600">{v.name}:</span>
              <span className="font-semibold text-gray-900">{v.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
