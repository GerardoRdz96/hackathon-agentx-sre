'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

export function IncidentForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch('/api/incidents', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit incident');
      }

      formRef.current?.reset();
      setFileName(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
        Report Incident
      </h2>

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Title</label>
          <input
            name="title"
            type="text"
            required
            placeholder="e.g., Payments failing with timeout errors"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Description</label>
          <textarea
            name="description"
            required
            rows={4}
            placeholder="Describe the incident in detail: what happened, when, impact..."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500 resize-none"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Reporter Email (optional)</label>
          <input
            name="reporter_email"
            type="email"
            placeholder="you@company.com"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Screenshot (optional)</label>
          <label className="flex items-center justify-center gap-2 w-full bg-gray-800 border border-dashed border-gray-700 rounded-lg px-3 py-3 text-sm text-gray-500 cursor-pointer hover:border-gray-500 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {fileName || 'Upload image'}
            <input
              name="image"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setFileName(e.target.files?.[0]?.name || null)}
            />
          </label>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-800 rounded-lg px-3 py-2 text-xs text-red-400">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm rounded-lg px-4 py-2.5 transition-all"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" className="opacity-75" />
              </svg>
              Running 5-Agent Pipeline...
            </span>
          ) : (
            'Submit Incident'
          )}
        </button>
      </form>
    </div>
  );
}
