import React, { useEffect } from 'react';
import {
  CheckCircle2,
  Heart,
  Star,
  Receipt,
  Sparkles,
  Clock,
  RotateCcw,
  ArrowRight,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function ThankYouScreen({ submissionData, onReset }) {
  // Fire subtle golden confetti on load
  useEffect(() => {
    try {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.55 },
        colors: ['#D97706', '#F59E0B', '#10B981', '#B45309'],
      });
    } catch {
      // Ignore if canvas is unavailable
    }
  }, []);

  const overallRating = submissionData?.ratings?.overall || 5;
  const submissionId = submissionData?.submissionId || 'SB-1';

  const formattedDate = new Date(submissionData?.submittedAt || Date.now()).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div className="py-8 sm:py-12 animate-fade-in max-w-lg mx-auto px-4">
      {/* Dedicated Customer Thank You Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-amber-200/80 shadow-soft-lg text-center relative overflow-hidden">
        {/* Subtle decorative background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-100/60 rounded-full blur-2xl -z-10 pointer-events-none" />

        {/* Success Icon */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-2xl bg-gradient-to-tr from-emerald-600 to-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30 ring-4 ring-emerald-100 mb-4 animate-slide-up">
          <CheckCircle2 className="w-9 h-9 sm:w-11 sm:h-11" />
        </div>

        {/* Hospitality Pill */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          <span>Feedback Recorded Successfully</span>
        </div>

        {/* Required Headings & Messages */}
        <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 font-serif tracking-tight">
          Thank You!
        </h2>

        <p className="mt-2 text-base sm:text-lg font-bold text-amber-900 font-serif">
          Thank you for sharing your experience with Saravana Bhavan Hotel.
        </p>

        <p className="mt-2 text-sm sm:text-base italic font-medium text-stone-700">
          “Your feedback helps us serve you better.”
        </p>

        <p className="mt-3 text-xs sm:text-sm text-stone-600 font-medium">
          We look forward to welcoming you again.
        </p>

        {/* Receipt / Confirmation Details Box */}
        <div className="mt-6 p-4 rounded-2xl bg-amber-50/50 border border-amber-100/80 text-left text-xs text-stone-600 space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-amber-200/50">
            <span className="font-semibold text-stone-700 flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5 text-amber-600" />
              Submission Reference
            </span>
            <span className="font-mono font-bold text-amber-900 bg-white px-2 py-0.5 rounded border border-amber-200">
              {submissionId}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-stone-500">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              Submitted At
            </span>
            <span className="font-medium text-stone-800">
              {formattedDate}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-stone-500">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              Overall Rating
            </span>
            <span className="font-bold text-amber-800 flex items-center gap-1">
              {overallRating} / 5 Stars
            </span>
          </div>
        </div>

        {/* Completion Confirmation Notice */}
        <div className="mt-5 p-3 rounded-xl bg-stone-50 border border-stone-200/70 text-[11px] text-stone-500 flex items-center justify-center gap-1.5">
          <Heart className="w-3.5 h-3.5 text-rose-500 shrink-0" />
          <span>Your feedback has been saved. Thank you for your time.</span>
        </div>

      </div>
    </div>
  );
}
