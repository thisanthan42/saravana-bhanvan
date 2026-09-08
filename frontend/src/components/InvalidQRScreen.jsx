import React from 'react';
import { AlertCircle, ArrowRight, Utensils } from 'lucide-react';

export default function InvalidQRScreen({ onReset }) {
  return (
    <div className="min-h-screen bg-hotel-warmBg flex flex-col justify-between p-4 sm:p-6 font-sans">
      {/* Brand Header */}
      <header className="max-w-md mx-auto w-full pt-4 sm:pt-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-600 to-amber-800 text-amber-50 shadow-md ring-2 ring-amber-400/30 mb-3">
          <Utensils className="w-6 h-6" />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-stone-900 font-serif">
          Saravana Bhavan
        </h1>
        <p className="text-xs uppercase tracking-widest text-amber-800 font-semibold mt-0.5">
          Hotel & Restaurant
        </p>
      </header>

      {/* Main Friendly Notice Card */}
      <main className="max-w-md mx-auto w-full my-auto py-8">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-amber-200/80 shadow-soft-lg text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center">
            <AlertCircle className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <h2 className="text-lg sm:text-xl font-bold font-serif text-stone-900">
              Notice
            </h2>
            <p className="text-sm font-semibold text-amber-900">
              Sorry, this feedback QR code is no longer available.
            </p>
            <p className="text-xs text-stone-600 leading-relaxed pt-1">
              This code may have been updated or retired. You can still share your valuable dining experience with us directly using our general feedback form.
            </p>
          </div>

          <div className="pt-3">
            <button
              type="button"
              onClick={onReset}
              className="w-full min-h-[48px] px-5 py-3 text-sm font-bold text-white bg-gradient-to-r from-amber-700 to-amber-900 hover:from-amber-800 hover:to-amber-950 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Give Feedback Directly</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>

      {/* Hospitality Footer */}
      <footer className="max-w-md mx-auto w-full pb-4 text-center text-xs text-stone-500">
        Thank you for dining with Saravana Bhavan Hotel.
      </footer>
    </div>
  );
}
