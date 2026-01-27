'use client';

import { useState } from 'react';

interface NoteFormProps {
  onSubmit: (content: string) => void;
  isSubmitting?: boolean;
}

export default function NoteForm({ onSubmit, isSubmitting = false }: NoteFormProps) {
  const [content, setContent] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || isSubmitting) return;
    onSubmit(trimmed);
    setContent('');
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label htmlFor="note-content" className="sr-only">
        Add a note
      </label>
      <textarea
        id="note-content"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Add a note..."
        rows={3}
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 resize-none"
        disabled={isSubmitting}
      />
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!content.trim() || isSubmitting}
          className="inline-flex min-h-[44px] items-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700 active:bg-brand-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <svg className="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Saving...
            </>
          ) : (
            'Add Note'
          )}
        </button>
      </div>
    </form>
  );
}
