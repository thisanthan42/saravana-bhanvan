import React, { useEffect } from 'react';
import {
  X,
  Star,
  Clock,
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
  Utensils,
  Sparkles,
  Users,
  Car,
  Bath,
  Smile,
} from 'lucide-react';

export default function FeedbackDetailModal({ item, onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);\n  }, [onClose]);

  if (!item) return null;

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const getBadgeClass = (val) => {
    if (val === 'Good') {
      return 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold';
    }
    if (val === 'Average') {
      return 'bg-amber-50 text-amber-800 border-amber-300 font-semibold';
    }
    if (val === 'Bad') {
      return 'bg-rose-50 text-rose-800 border-rose-300 font-bold';
    }
    return 'bg-stone-50 text-stone-700 border-stone-200';
  };

  const categories = [
    { label: 'Food Quality', value: item.food_rating, icon: Utensils },
    { label: 'Service', value: item.service_rating, icon: Sparkles },
    { label: 'Staff Behaviour', value: item.staff_behaviour_rating, icon: Users },
    { label: 'Cleanliness', value: item.cleanliness_rating, icon: Smile },
    { label: 'Toilet / Restroom', value: item.toilet_rating, icon: Bath },
    { label: 'Parking Facility', value: item.parking_rating, icon: Car },
  ];

  return (\n    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-fade-in">\n      <div
        className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh] animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-900 via-amber-800 to-amber-950 text-white p-5 sm:p-6 relative flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold tracking-wider uppercase text-amber-300">
              Customer Feedback Details
            </span>
            <h2 className="text-xl font-bold font-serif mt-0.5">
              Submission #{item.id}
            </h2>
            <div className="flex flex-wrap items-center gap-2.5 text-xs text-amber-200/90 mt-1.5">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>{formatDate(item.created_at)}</span>
              </div>
              {item.table_id && (
                <span className="inline-flex items-center gap-1 bg-amber-700/80 px-2 py-0.5 rounded text-[11px] font-bold text-amber-100 border border-amber-500/50">
                  {item.table_id} {item.branch_id ? `(${item.branch_id})` : ''}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {/* Overall Rating Section */}
          <div className="bg-hotel-warmBg p-4 rounded-2xl border border-amber-200/70 flex items-center justify-between flex-wrap gap-3">
            <div>
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                Overall Experience
              </span>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex text-amber-500">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-6 h-6 ${
                        star <= item.overall_rating
                          ? 'fill-amber-400 text-amber-500'
                          : 'fill-stone-200 text-stone-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-lg font-extrabold text-stone-900">
                  {item.overall_rating} / 5 Stars
                </span>
              </div>
            </div>

            {item.needs_action ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 text-xs font-bold">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Action Required
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Satisfactory Visit
              </span>
            )}
          </div>

          {/* Need Action Reasons Banner */}
          {item.needs_action && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200">
              <span className="text-xs font-bold text-rose-900 uppercase tracking-wider block mb-1">
                ⚠️ Need Action Reason:
              </span>
              <p className="text-sm font-bold text-rose-800 mb-2">
                {item.action_reason_text || (item.action_reasons?.join(' + ')) || 'Requires manager follow-up'}
              </p>
              {item.action_reasons && item.action_reasons.length > 1 && (
                <div className="flex flex-wrap gap-1.5 pt-1 border-t border-rose-200/60">
                  {item.action_reasons.map((reason, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-white border border-rose-300 text-rose-700 text-xs font-semibold shadow-2xs"
                    >
                      • {reason}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Specific Categories Grid */}
          <div>
            <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2.5">
              Specific Ratings
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {categories.map((cat, idx) => {
                const Icon = cat.icon;
                return (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-stone-50 border border-stone-200/80 flex flex-col justify-between"
                  >
                    <div className="flex items-center gap-1.5 text-stone-600 mb-1.5">
                      <Icon className="w-3.5 h-3.5 text-amber-700" />
                      <span className="text-xs font-medium">{cat.label}</span>
                    </div>
                    <span
                      className={`text-center py-1 px-2 rounded-lg border text-xs ${getBadgeClass(
                        cat.value
                      )}`}
                    >
                      {cat.value || 'N/A'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Customer Comment */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-amber-700" />
              <span>Customer Comments</span>
            </div>
            {item.comment && item.comment.trim().length > 0 ? (
              <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/80 text-stone-800 text-sm italic font-serif leading-relaxed">
                "{item.comment}"
              </div>
            ) : (
              <p className="text-xs text-stone-400 italic bg-stone-50 p-3 rounded-xl border border-stone-200">
                No written comment provided by this guest.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-stone-50 p-4 border-t border-stone-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-semibold text-stone-700 bg-white border border-stone-300 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}
