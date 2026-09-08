import React from 'react';
import { AlertCircle, ArrowUp } from 'lucide-react';

export default function ValidationBanner({ missingFields, onScrollToMissing }) {
  if (!missingFields || missingFields.length === 0) return null;

  return (
    <div
      role="alert"
      className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 shadow-sm animate-fade-in"
    >
      <div className="flex items-start gap-3">
        <div className="p-1 rounded-lg bg-rose-100 text-rose-600 mt-0.5 shrink-0">
          <AlertCircle className="w-5 h-5" />
        </div>

        <div className="flex-1">
          <h4 className="text-sm font-bold text-rose-900">
            Please complete all the questions before submitting.
          </h4>
          <p className="text-xs text-rose-700 mt-0.5 leading-relaxed">
            Your comprehensive feedback ensures we provide you and fellow guests with the highest quality hospitality.
          </p>

          {/* Quick jump to first unanswered */}
          <button
            type="button"
            onClick={onScrollToMissing}
            className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-bold text-rose-800 bg-rose-100 hover:bg-rose-200 px-3 py-1.5 rounded-lg transition-colors focus:outline-none"
          >
            <ArrowUp className="w-3.5 h-3.5" />
            <span>Go to first unanswered question</span>
          </button>
        </div>
      </div>
    </div>
  );
}
