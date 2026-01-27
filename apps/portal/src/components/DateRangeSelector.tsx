'use client';

import { useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { DateRange, DateRangePreset } from '@/lib/analytics';

const PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: 'custom', label: 'Custom' },
];

interface DateRangeSelectorProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

export default function DateRangeSelector({
  value,
  onChange,
  className = '',
}: DateRangeSelectorProps) {
  const [showCustom, setShowCustom] = useState(value.preset === 'custom');
  const [customFrom, setCustomFrom] = useState(value.from || '');
  const [customTo, setCustomTo] = useState(value.to || '');

  function handlePresetClick(preset: DateRangePreset) {
    if (preset === 'custom') {
      setShowCustom(true);
      if (customFrom && customTo) {
        onChange({ preset: 'custom', from: customFrom, to: customTo });
      }
    } else {
      setShowCustom(false);
      onChange({ preset });
    }
  }

  function handleCustomApply() {
    if (customFrom && customTo) {
      onChange({ preset: 'custom', from: customFrom, to: customTo });
    }
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {/* Preset buttons */}
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((preset) => (
          <button
            key={preset.value}
            type="button"
            onClick={() => handlePresetClick(preset.value)}
            className={`min-h-[36px] rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              value.preset === preset.value
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Custom date inputs */}
      {showCustom && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="h-9 rounded-lg border border-gray-200 bg-white px-2 text-xs text-gray-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            aria-label="Start date"
          />
          <span className="text-xs text-gray-400">to</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="h-9 rounded-lg border border-gray-200 bg-white px-2 text-xs text-gray-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            aria-label="End date"
          />
          <button
            type="button"
            onClick={handleCustomApply}
            disabled={!customFrom || !customTo}
            className="h-9 rounded-lg bg-brand-600 px-3 text-xs font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}

// ── Hook to sync date range with URL params ──

export function useDateRange(): [DateRange, (range: DateRange) => void] {
  const router = useRouter();
  const searchParams = useSearchParams();

  const dateRange: DateRange = {
    preset: (searchParams.get('range') as DateRangePreset) || '30d',
    from: searchParams.get('from') || undefined,
    to: searchParams.get('to') || undefined,
  };

  const setDateRange = useCallback(
    (range: DateRange) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('range', range.preset);
      if (range.preset === 'custom' && range.from && range.to) {
        params.set('from', range.from);
        params.set('to', range.to);
      } else {
        params.delete('from');
        params.delete('to');
      }
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  return [dateRange, setDateRange];
}
