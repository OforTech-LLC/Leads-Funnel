'use client';

import { useState, useRef, useEffect } from 'react';
import type { LeadStatus } from '@/lib/types';
import { PORTAL_STATUS_OPTIONS, STATUS_DOT_COLORS } from '@/lib/lead-status';

interface StatusSelectProps {
  currentStatus: LeadStatus;
  onStatusChange: (status: LeadStatus) => void;
  disabled?: boolean;
}

export default function StatusSelect({
  currentStatus,
  onStatusChange,
  disabled = false,
}: StatusSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const current =
    PORTAL_STATUS_OPTIONS.find((o) => o.value === currentStatus) || PORTAL_STATUS_OPTIONS[0];

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Change lead status"
      >
        <span
          className={`h-2.5 w-2.5 rounded-full ${
            STATUS_DOT_COLORS[current.value] || STATUS_DOT_COLORS.new
          }`}
        />
        {current.label}
        <svg
          className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="absolute right-0 z-50 mt-1 w-40 origin-top-right rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
          role="listbox"
          aria-label="Status options"
        >
          {PORTAL_STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === currentStatus}
              className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors min-h-[44px] ${
                option.value === currentStatus
                  ? 'bg-brand-50 font-medium text-brand-700'
                  : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
              }`}
              onClick={() => {
                if (option.value !== currentStatus) {
                  onStatusChange(option.value);
                }
                setIsOpen(false);
              }}
            >
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  STATUS_DOT_COLORS[option.value] || STATUS_DOT_COLORS.new
                }`}
              />
              {option.label}
              {option.value === currentStatus && (
                <svg
                  className="ml-auto h-4 w-4 text-brand-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
