import React, { useState, useEffect } from 'react';
import { Utensils, Sparkles } from 'lucide-react';

export default function SplashScreen({ onComplete }) {
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Keep splash screen visible for 5.0 seconds, then smoothly fade out
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, 5000);

    // Completely complete transition after fade out animation (5.45s total)
    const completeTimer = setTimeout(() => {
      if (onComplete) onComplete();
    }, 5450);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-[#FFFDF9] via-[#FAF7F2] to-[#F5EFE6] px-6 text-center select-none overflow-hidden transition-opacity duration-500 ease-out ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      aria-live="polite"
      aria-label="Welcome to Saravana Bhavan"
    >
      {/* Warm Ambient Decorative Lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 sm:w-96 sm:h-96 bg-gradient-to-br from-amber-300/25 via-amber-200/15 to-transparent rounded-full blur-3xl -z-10 pointer-events-none" />
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-72 h-72 bg-amber-400/10 rounded-full blur-2xl -z-10 pointer-events-none" />

      {/* Decorative Traditional Hospitality Motif & Emblem */}
      <div className="animate-fade-in flex flex-col items-center max-w-lg mx-auto">
        <div className="relative mb-4 sm:mb-5">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-amber-600 via-amber-700 to-amber-900 flex items-center justify-center text-amber-50 shadow-xl shadow-amber-800/25 ring-4 ring-amber-200/60 transition-transform">
            <Utensils className="w-8 h-8 sm:w-10 sm:h-10 text-amber-100" />
          </div>
          {/* Subtle Sparkle Accent */}
          <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Small Hospitality Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100/80 border border-amber-200 text-amber-900 text-xs font-semibold tracking-wider uppercase mb-3 sm:mb-4">
          <span>Traditional South Indian Hospitality</span>
        </div>

        {/* Prominent Main Welcome */}
        <h1 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-extrabold text-stone-900 font-serif tracking-tight leading-tight">
          Welcome to <br className="xs:hidden" />
          <span className="text-amber-800">Saravana Bhavan</span>
        </h1>

        {/* Decorative Golden Divider */}
        <div className="flex items-center justify-center gap-2 my-3.5 sm:my-4 w-full max-w-[200px]">
          <div className="h-px bg-gradient-to-r from-transparent via-amber-400 to-transparent flex-1" />
          <div className="w-1.5 h-1.5 rounded-full bg-amber-600" />
          <div className="h-px bg-gradient-to-r from-transparent via-amber-400 to-transparent flex-1" />
        </div>

        {/* Primary Hospitality Quote */}
        <div className="mt-3 p-4 sm:p-5 rounded-2xl bg-white/80 backdrop-blur-xs border border-amber-200/80 shadow-soft max-w-sm sm:max-w-md mx-auto">
          <p className="text-lg sm:text-xl font-serif italic text-amber-950 font-bold leading-snug">
            “Your experience matters for us.”
          </p>
          <div className="my-2 h-px bg-gradient-to-r from-transparent via-amber-300 to-transparent w-2/3 mx-auto" />
          <p className="text-xs sm:text-sm text-stone-600 font-medium">
            Please take a moment to share your valuable dining feedback.
          </p>
        </div>
      </div>

      {/* Subtle Progress Loading Indicator (5.0s smooth transition) */}
      <div className="absolute bottom-8 sm:bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
        <div className="w-36 h-1.5 bg-amber-200/50 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-amber-600 to-amber-700 rounded-full animate-[splashProgress_5s_ease-in-out_forwards]" />
        </div>
        <span className="text-[11px] text-stone-600 font-medium tracking-wide">
          Opening feedback form in 5s...
        </span>
      </div>
    </div>
  );
}
