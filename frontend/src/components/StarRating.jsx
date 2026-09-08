import React, { useState } from 'react';
import { Star, AlertCircle } from 'lucide-react';
import { STAR_DESCRIPTIONS } from '../data/questions';

export default function StarRating({ value, onChange, hasError }) {
  const [hoverRating, setHoverRating] = useState(0);

  const activeRating = hoverRating || value;
  const ratingDetails = activeRating ? STAR_DESCRIPTIONS[activeRating] : null;

  return (
    <div
      id="overall-rating-section"
      className={`p-5 sm:p-6 rounded-2xl bg-white border transition-all duration-300 shadow-sm ${
        hasError
          ? 'border-rose-400 bg-rose-50/20 ring-2 ring-rose-400/20 animate-pulse-subtle'
          : value
          ? 'border-amber-300/80 shadow-soft'
          : 'border-stone-200/90 hover:border-amber-200'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-md">
            Section A • Overall Experience <span className="text-rose-600">*</span>
          </span>
          <h3 className="text-base sm:text-lg font-bold text-stone-900 mt-2">
            How was your overall experience at Saravana Bhavan Hotel?
          </h3>
        </div>
      </div>

      <p className="text-xs sm:text-sm text-stone-500 mb-4">
        Tap a star to rate your dining visit from 1 (Poor) to 5 (Excellent).
      </p>

      {/* 5-Star Rating Buttons */}
      <div className="flex items-center justify-center sm:justify-start gap-2 sm:gap-3 py-2">
        {[1, 2, 3, 4, 5].map((starIndex) => {
          const isFilled = (hoverRating || value) >= starIndex;
          const isSelected = value === starIndex;

          return (
            <button
              key={starIndex}
              type="button"
              onClick={() => onChange(starIndex)}
              onMouseEnter={() => setHoverRating(starIndex)}
              onMouseLeave={() => setHoverRating(0)}
              aria-label={`Rate ${starIndex} out of 5 stars`}
              className={`group relative p-2.5 sm:p-3.5 rounded-xl transition-all duration-200 touch-manipulation focus:outline-none focus:ring-2 focus:ring-amber-500/40 ${
                isSelected
                  ? 'bg-amber-100/90 scale-110 shadow-sm'
                  : 'hover:bg-amber-50 active:scale-95'
              }`}
            >
              <Star
                className={`w-8 h-8 sm:w-10 sm:h-10 transition-all duration-200 ${
                  isFilled
                    ? 'fill-amber-400 text-amber-500 drop-shadow-sm'
                    : 'text-stone-300 group-hover:text-amber-300'
                }`}
              />
              <span className="sr-only">{starIndex} Star{starIndex > 1 ? 's' : ''}</span>
            </button>
          );
        })}
      </div>

      {/* Dynamic Feedback Description or Prompt */}
      <div className="mt-3 min-h-[32px] flex items-center justify-between">
        {ratingDetails ? (
          <div className="flex items-center gap-2 text-xs sm:text-sm font-medium animate-fade-in">
            <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 font-bold">
              {activeRating} Star{activeRating > 1 ? 's' : ''} • {ratingDetails.label}
            </span>
            <span className="text-stone-600 hidden sm:inline">
              {ratingDetails.text}
            </span>
          </div>
        ) : (
          <span className="text-xs text-stone-400 italic">
            Please tap a star to give your rating
          </span>
        )}

        {hasError && !value && (
          <div className="flex items-center gap-1.5 text-xs text-rose-600 font-medium">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>Rating required</span>
          </div>
        )}
      </div>
    </div>
  );
}
