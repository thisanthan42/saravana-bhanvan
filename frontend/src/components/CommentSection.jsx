import React from 'react';
import { MessageSquareText } from 'lucide-react';

export default function CommentSection({ value, onChange }) {
  const maxLength = 600;

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200/80 shadow-sm transition-all duration-200 focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-500/20">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-amber-50 text-amber-800">
            <MessageSquareText className="w-4 h-4" />
          </div>
          <label htmlFor="customer-comment" className="text-sm sm:text-base font-bold text-stone-900 cursor-pointer">
            Tell us more about your experience
          </label>
        </div>
        <span className="text-[11px] font-semibold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
          Optional
        </span>
      </div>

      <p className="text-xs text-stone-500 mb-3 pl-8 sm:pl-0">
        We welcome any specific dish compliments, staff mentions, or suggestions for our team.
      </p>

      <textarea
        id="customer-comment"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        rows={3}
        placeholder="Share your suggestions, compliments, or concerns..."
        className="w-full px-3.5 py-3 text-sm text-stone-800 bg-stone-50/60 border border-stone-200 rounded-xl placeholder:text-stone-400 focus:bg-white focus:outline-none transition-colors resize-y min-h-[90px]"
      />

      <div className="mt-1.5 flex justify-end">
        <span className="text-[11px] text-stone-600">
          {value.length} / {maxLength} characters
        </span>
      </div>
    </div>
  );
}
