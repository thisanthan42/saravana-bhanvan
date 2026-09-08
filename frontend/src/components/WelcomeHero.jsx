import React from 'react';
import { ArrowDown, Clock, ShieldCheck, HeartHandshake } from 'lucide-react';

export default function WelcomeHero({ onStartFeedback }) {
  return (
    <section className="relative overflow-hidden pt-6 pb-4 sm:pt-10 sm:pb-6 text-center">
      {/* Decorative Warm Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 bg-gradient-to-b from-amber-200/40 via-amber-100/20 to-transparent blur-3xl -z-10 pointer-events-none rounded-full" />

      <div className="max-w-xl mx-auto px-4">
        {/* Hospitality Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100/70 border border-amber-200 text-amber-900 text-xs font-semibold mb-3">
          <HeartHandshake className="w-3.5 h-3.5 text-amber-700" />
          <span>Guest Satisfaction & Quality</span>
        </div>

        {/* Main Title */}
        <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight font-serif">
          Welcome to <span className="text-amber-700">Saravana Bhavan Hotel</span>
        </h2>

        {/* Core Hospitality Statement */}
        <p className="mt-2 text-base sm:text-lg font-semibold text-stone-800">
          “Your experience matters to us.”
        </p>

        {/* Explanatory Sentence */}
        <p className="mt-1.5 text-sm text-stone-600 leading-relaxed max-w-md mx-auto">
          Please take a moment to share your experience. Your feedback helps us serve you better.
        </p>

        {/* Primary CTA Button */}
        <div className="mt-5">
          <button
            type="button"
            onClick={onStartFeedback}
            className="group relative inline-flex items-center justify-center gap-2.5 px-6 py-3.5 w-full sm:w-auto text-base font-bold text-white bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 hover:from-amber-700 hover:to-amber-900 rounded-xl shadow-lg shadow-amber-700/25 hover:shadow-xl hover:shadow-amber-700/35 active:scale-[0.98] transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-amber-500/30"
          >
            <span>Give Your Feedback</span>
            <ArrowDown className="w-4 h-4 transition-transform group-hover:translate-y-0.5" />
          </button>
        </div>

        {/* Trust & Ease Highlights */}
        <div className="mt-5 grid grid-cols-2 gap-2 text-xs text-stone-500 pt-3 border-t border-amber-100/80">
          <div className="flex items-center justify-center gap-1.5 py-1">
            <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Takes only 1–2 minutes</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 py-1">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>No login or signup required</span>
          </div>
        </div>
      </div>
    </section>
  );
}
