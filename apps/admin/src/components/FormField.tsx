'use client';

/**
 * Form Input Wrapper
 *
 * Provides consistent label, input, and error message layout.
 */

import { cn } from '@/lib/utils';

interface FormFieldProps {
  label: string;
  name: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'textarea' | 'select';
  value: string | number;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  options?: { value: string; label: string }[];
  className?: string;
  rows?: number;
}

export default function FormField({
  label,
  name,
  type = 'text',
  value,
  onChange,
  error,
  placeholder,
  required,
  disabled,
  options,
  className,
  rows = 3,
}: FormFieldProps) {
  const baseClasses = cn(
    'w-full px-3 py-2 text-sm rounded-md border transition-colors',
    'bg-[var(--card-bg)] text-[var(--text-primary)]',
    error
      ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
      : 'border-[var(--border-color)] focus:ring-blue-500 focus:border-blue-500',
    disabled && 'opacity-60 cursor-not-allowed',
    'focus:outline-none focus:ring-1'
  );

  return (
    <div className={cn('space-y-1', className)}>
      <label htmlFor={name} className="block text-sm font-medium text-[var(--text-primary)]">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>

      {type === 'textarea' ? (
        <textarea
          id={name}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          rows={rows}
          className={baseClasses}
        />
      ) : type === 'select' ? (
        <select
          id={name}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          disabled={disabled}
          className={baseClasses}
        >
          <option value="">Select...</option>
          {options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={baseClasses}
        />
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
