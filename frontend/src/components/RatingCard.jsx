import React from 'react';
import {
  UtensilsCrossed,
  Sparkles,
  Droplets,
  Car,
  Soup,
  HeartHandshake,
  Check,
  AlertCircle
} from 'lucide-react';
import { RATING_OPTIONS } from '../data/questions';

// Icon dictionary for clean mapping
const ICON_MAP = {
  UtensilsCrossed,
  Sparkles,
  Droplets,
  Car,
  Soup,
  HeartHandshake,
};

export default function RatingCard({
  question,
  index,
  selectedValue,
  onSelect,
  hasError,
}) {
  const IconComponent = ICON_MAP[question.icon] || UtensilsCrossed;

  return (
    <div
      id={`question-${question.id}`}
      className={`p-4 sm:p-5 rounded-2xl bg-white border transition-all duration-200 shadow-sm ${
        hasError
          ? 'border-rose-400 bg-rose-50/20 ring-2 ring-rose-400/20 animate-pulse-subtle'
          : selectedValue
          ? 'border-amber-200/90 shadow-soft'
          : 'border-stone-200/80 hover:border-amber-200/60'
      }`}
    >
      {/* Header with Question and Icon */}
      <div className="flex items-start gap-3 mb-3">
        <div className={`p-2.5 rounded-xl shrink-0 transition-colors ${
          selectedValue
            ? 'bg-amber-100 text-amber-800'
            : 'bg-stone-100 text-stone-600'
        }`}>
          <IconComponent className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <h4 className="text-sm sm:text-base font-bold text-stone-900 tracking-tight">
              {question.title} <span className="text-rose-600">*</span>
            </h4>
            {selectedValue && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60 shrink-0">
                <Check className="w-3 h-3 stroke-[3]" />
                <span className="capitalize">{selectedValue}</span>
              </span>
            )}
          </div>
          <p className="text-xs text-stone-500 mt-0.5 leading-snug">
            {question.subtitle}
          </p>
        </div>
      </div>

      {/* 3-Option Button Group: Good / Average / Bad */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-1">
        {RATING_OPTIONS.map((option) => {
          const isSelected = selectedValue === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onSelect(question.id, option.value)}
              className={`min-h-[48px] sm:min-h-[52px] px-2 py-2 rounded-xl text-xs sm:text-sm font-bold flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 transition-all duration-150 touch-manipulation focus:outline-none ${
                isSelected
                  ? option.activeBg
                  : `bg-stone-50/80 border border-stone-200 text-stone-700 ${option.hoverBg} active:scale-95`
              }`}
            >
              <span className="text-base sm:text-lg select-none leading-none">
                {option.emoji}
              </span>
              <span className="tracking-tight">{option.label}</span>
            </button>
          );
        })}
      </div>

      {/* Validation Error Hint */}
      {hasError && !selectedValue && (
        <div className="mt-2.5 flex items-center gap-1.5 text-xs text-rose-600 font-medium">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>Please choose Good, Average, or Bad</span>
        </div>
      )}
    </div>
  );
}
