import React from 'react';
import { Utensils, Sparkles, Shield } from 'lucide-react';

export default function Header() {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-amber-100 shadow-sm transition-all duration-200">
      <div className="max-w-2xl mx-auto px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          {/* Brand Logo & Name */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center text-amber-50 shadow-md ring-2 ring-amber-400/30">
              <Utensils className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-stone-900 font-serif">
                  Saravana Bhavan
                </h1>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 uppercase tracking-wider">
                  Hotel
                </span>
              </div>
              <p className="text-xs text-stone-500 font-medium hidden sm:block">
                Authentic South Indian Hospitality
              </p>
            </div>
          </div>

          {/* Badges & Navigation */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-amber-50/90 border border-amber-200/80 text-amber-900 text-xs px-3 py-1.5 rounded-full font-semibold shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span>Customer Feedback</span>
            </div>

            <a
              href="/manager"
              className="inline-flex items-center gap-1 text-stone-700 hover:text-amber-950 bg-stone-100 hover:bg-stone-200 px-2.5 py-1.5 rounded-full text-xs font-bold border border-stone-300 transition-colors"
              title="Open Hotel Manager Portal"
            >
              <Shield className="w-3.5 h-3.5 text-amber-800" />
              <span>Manager</span>
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
