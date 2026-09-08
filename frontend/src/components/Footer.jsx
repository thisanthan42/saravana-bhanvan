import React from 'react';
import { Utensils, Heart } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-12 py-8 bg-stone-900 text-stone-300 border-t border-amber-900/30">
      <div className="max-w-xl mx-auto px-4 text-center">
        {/* Decorative Brand Emblem */}
        <div className="w-9 h-9 mx-auto rounded-xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3 shadow-inner">
          <Utensils className="w-4 h-4" />
        </div>

        {/* Required Hospitality Statements */}
        <p className="text-sm font-bold text-amber-100 tracking-wide font-serif">
          Thank you for choosing Saravana Bhavan Hotel.
        </p>
        <p className="text-xs text-stone-400 mt-1">
          We appreciate your valuable feedback.
        </p>

        {/* Subtle Hospitality Sign-off */}
        <div className="mt-6 pt-4 border-t border-stone-800 flex flex-col sm:flex-row items-center justify-between text-[11px] text-stone-300 gap-2">
          <span>&copy; {currentYear} Saravana Bhavan Hotel. All rights reserved.</span>
          <span className="flex items-center gap-1 text-stone-300">
            Crafted with <Heart className="w-3 h-3 text-rose-500 fill-rose-500" /> for our guests
          </span>
        </div>
      </div>
    </footer>
  );
}
