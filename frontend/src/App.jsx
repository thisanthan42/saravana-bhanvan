import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import SplashScreen from './components/SplashScreen';
import StarRating from './components/StarRating';
import RatingCard from './components/RatingCard';
import CommentSection from './components/CommentSection';
import ValidationBanner from './components/ValidationBanner';
import ThankYouScreen from './components/ThankYouScreen';
import InvalidQRScreen from './components/InvalidQRScreen';
import Footer from './components/Footer';
import ManagerLogin from './components/manager/ManagerLogin';
import ManagerDashboard from './components/manager/ManagerDashboard';
import QRManagement from './components/manager/QRManagement';
import SuperAdminDashboard from './components/admin/SuperAdminDashboard';
import { managerStorage } from './services/managerService';
import { SPECIFIC_QUESTIONS } from './data/questions';
import {
  submitFeedback,
  hasSubmittedInSession,
  getSessionSubmissionData,
  clearSessionFeedback,
  resolveQRToken,
} from './services/feedbackService';
import { Send, CheckCircle, Sparkles, Loader2, AlertCircle } from 'lucide-react';

function extractQRToken() {
  if (typeof window === 'undefined') return '';
  const searchParams = new URLSearchParams(window.location.search);
  const qParam = searchParams.get('token');
  if (qParam) return qParam.trim();

  // Check path pattern e.g. /q/:token or /feedback/q/:token
  const pathname = window.location.pathname;
  const match = pathname.match(/(?:\/feedback)?\/q\/([^/?#]+)/i);
  if (match && match[1]) return match[1].trim();

  return '';
}

export default function App() {
  // Navigation State
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  // Listen to browser popstate (back/forward navigation)
  useEffect(() => {
    const handlePopState = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (path) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ====================================================================
  // ROUTE 1: SUPER ADMIN LOGIN (/admin/login)
  // ====================================================================
  if (currentPath === '/admin/login') {
    const mgr = managerStorage.getManager();
    if (managerStorage.getToken() && (mgr?.role === 'super_admin' || mgr?.role === 'owner')) {
      return (
        <SuperAdminDashboard
          onNavigateToManager={() => navigateTo('/manager/dashboard')}
          onNavigateToQR={() => navigateTo('/manager/qr')}
          onLogout={() => navigateTo('/admin/login')}
        />
      );
    }
    return <ManagerLogin onLoginSuccess={() => navigateTo('/admin/dashboard')} />;
  }

  // ====================================================================
  // ROUTE 2: PROTECTED SUPER ADMIN CONTROL PANEL (/admin, /admin/dashboard, /admin/*)
  // ====================================================================
  if (currentPath.startsWith('/admin')) {
    if (!managerStorage.getToken()) {
      return <ManagerLogin onLoginSuccess={() => navigateTo('/admin/dashboard')} />;
    }
    const mgr = managerStorage.getManager();
    if (mgr?.role !== 'super_admin' && mgr?.role !== 'owner') {
      return (
        <ManagerDashboard
          onNavigateToQR={() => navigateTo('/manager/qr')}
          onNavigateToAdmin={() => navigateTo('/admin/dashboard')}
          onLogout={() => navigateTo('/manager/login')}
        />
      );
    }
    return (
      <SuperAdminDashboard
        onNavigateToManager={() => navigateTo('/manager/dashboard')}
        onNavigateToQR={() => navigateTo('/manager/qr')}
        onLogout={() => navigateTo('/admin/login')}
      />
    );
  }

  // ====================================================================
  // ROUTE 3: MANAGER LOGIN (/manager/login)
  // ====================================================================
  if (currentPath === '/manager/login') {
    return <ManagerLogin onLoginSuccess={() => navigateTo('/manager/dashboard')} />;
  }

  // ====================================================================
  // ROUTE 4: PROTECTED QR MANAGEMENT (/manager/qr)
  // ====================================================================
  if (currentPath === '/manager/qr') {
    if (!managerStorage.getToken()) {
      return <ManagerLogin onLoginSuccess={() => navigateTo('/manager/qr')} />;
    }
    return (
      <QRManagement
        onNavigateToDashboard={() => navigateTo('/manager/dashboard')}
        onLogout={() => navigateTo('/manager/login')}
      />
    );
  }

  // ====================================================================
  // ROUTE 5: PROTECTED MANAGER DASHBOARD (/manager/dashboard or /manager)
  // ====================================================================
  if (currentPath.startsWith('/manager')) {
    // If unauthenticated, redirect to login
    if (!managerStorage.getToken()) {
      return <ManagerLogin onLoginSuccess={() => navigateTo('/manager/dashboard')} />;
    }
    return (
      <ManagerDashboard
        onNavigateToQR={() => navigateTo('/manager/qr')}
        onNavigateToAdmin={() => navigateTo('/admin/dashboard')}
        onLogout={() => navigateTo('/manager/login')}
      />
    );
  }

  // ====================================================================
  // ROUTE 4: DEFAULT CUSTOMER FEEDBACK EXPERIENCE (/, /feedback, /q/:token)
  // 100% UNCHANGED, APPROVED EXPERIENCE
  // ====================================================================
  return <CustomerFeedbackApp />;
}

/**
 * Customer-Facing Feedback Application
 * Approved Part 1, 2, and 3 Experience
 */
function CustomerFeedbackApp() {
  // Splash Screen State (auto-transitions after ~5s)
  const [showSplash, setShowSplash] = useState(true);

  // Form State
  const [overallRating, setOverallRating] = useState(0);
  const [specificRatings, setSpecificRatings] = useState({
    service: '',
    cleanliness: '',
    toilet: '',
    parking: '',
    food: '',
    staffBehaviour: '',
  });
  const [comment, setComment] = useState('');

  // UI, API & Validation State
  const [validationErrors, setValidationErrors] = useState([]);
  const [apiError, setApiError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionData, setSubmissionData] = useState(null);

  const formRef = useRef(null);

  // QR Token Verification State
  const [qrToken, setQrToken] = useState(() => extractQRToken());
  const [qrValidationStatus, setQrValidationStatus] = useState(() => (extractQRToken() ? 'checking' : 'valid'));

  useEffect(() => {
    const token = extractQRToken();
    if (!token) {
      setQrValidationStatus('valid');
      return;
    }

    resolveQRToken(token).then((res) => {
      if (res.valid && res.active) {
        setQrToken(token);
        setQrValidationStatus('valid');
      } else {
        setQrValidationStatus('invalid');
      }
    });
  }, []);

  // Check if customer already submitted feedback in this session
  useEffect(() => {
    if (hasSubmittedInSession()) {
      const savedData = getSessionSubmissionData();
      setSubmissionData(savedData);
      setIsSubmitted(true);
    }
  }, []);

  if (qrValidationStatus === 'checking') {
    return (
      <div className="min-h-screen bg-hotel-warmBg flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-amber-700 animate-spin mb-3" />
        <p className="text-sm font-semibold text-stone-700 font-serif">Welcome to Saravana Bhavan...</p>
      </div>
    );
  }

  if (qrValidationStatus === 'invalid') {
    return (
      <InvalidQRScreen
        onReset={() => {
          window.history.pushState({}, '', '/');
          setQrToken('');
          setQrValidationStatus('valid');
        }}
      />
    );
  }

  // Scroll to the first missing field when validation fails
  const scrollToFirstMissing = (missingKeys) => {
    const targetKey = missingKeys?.[0];
    if (!targetKey) return;

    const elementId = targetKey === 'overall' ? 'overall-rating-section' : `question-${targetKey}`;
    const el = document.getElementById(elementId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Handle specific question option selection
  const handleSpecificRating = (questionId, value) => {
    setSpecificRatings((prev) => ({
      ...prev,
      [questionId]: value,
    }));

    // Clear error for this specific field if it had an error
    setValidationErrors((prev) => prev.filter((id) => id !== questionId));
  };

  // Handle overall star selection
  const handleOverallRating = (stars) => {
    setOverallRating(stars);
    setValidationErrors((prev) => prev.filter((id) => id !== 'overall'));
  };

  // Form submission & validation
  const handleSubmit = async (e) => {
    e.preventDefault();

    // 1. Determine all missing fields
    const missing = [];

    if (!overallRating) {
      missing.push('overall');
    }

    SPECIFIC_QUESTIONS.forEach((q) => {
      if (!specificRatings[q.id]) {
        missing.push(q.id);
      }
    });

    // 2. Validate
    if (missing.length > 0) {
      setValidationErrors(missing);
      scrollToFirstMissing(missing);
      return;
    }

    // 3. Clear errors and submit
    setValidationErrors([]);
    setApiError('');
    setIsSubmitting(true);

    try {
      const response = await submitFeedback({
        overallRating,
        serviceRating: specificRatings.service,
        cleanlinessRating: specificRatings.cleanliness,
        toiletRating: specificRatings.toilet,
        parkingRating: specificRatings.parking,
        foodRating: specificRatings.food,
        staffBehaviourRating: specificRatings.staffBehaviour,
        customerComment: comment,
        qrToken,
      });

      if (response.success) {
        setSubmissionData(response.data);
        setIsSubmitted(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (response.alreadyCompleted) {
        const existingData = getSessionSubmissionData();
        if (existingData) {
          setSubmissionData(existingData);
          setIsSubmitted(true);
        } else {
          setApiError(response.message || 'This feedback session has already been completed.');
        }
      } else {
        setApiError(response.message || "We couldn't submit your feedback right now. Please try again.");
      }
    } catch (err) {
      console.error('Submission failed:', err);
      setApiError("We couldn't submit your feedback right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate completion progress
  const totalRequired = 1 + SPECIFIC_QUESTIONS.length;
  const answeredCount =
    (overallRating > 0 ? 1 : 0) +
    Object.values(specificRatings).filter(Boolean).length;
  const progressPercent = Math.round((answeredCount / totalRequired) * 100);

  return (
    <div className="min-h-screen flex flex-col bg-hotel-warmBg">
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
      <Header />

      <main className="flex-grow">
        {isSubmitted ? (
          <ThankYouScreen submissionData={submissionData} />
        ) : (
          <div className="max-w-xl mx-auto px-4 py-5 sm:py-7">
            {/* Feedback Form Section (Opens directly with no quote/hero) */}
            <form
              ref={formRef}
              onSubmit={handleSubmit}
              noValidate
              className="space-y-5"
            >
              {/* Progress Indicator */}
              <div className="bg-white/80 backdrop-blur-xs p-3 rounded-xl border border-amber-200/60 shadow-xs">
                <div className="flex items-center justify-between text-xs font-semibold text-stone-700 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    Feedback Progress
                  </span>
                  <span className="text-amber-800 font-bold">
                    {answeredCount} of {totalRequired} questions answered ({progressPercent}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Section A: Overall 5-Star Rating */}
              <StarRating
                value={overallRating}
                onChange={handleOverallRating}
                hasError={validationErrors.includes('overall')}
              />

              {/* Section B: 6 Specific Experience Questions */}
              <div className="space-y-3">
                <div className="px-1 pt-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-md">
                    Section B • Specific Experience <span className="text-rose-600">*</span>
                  </span>
                  <h3 className="text-sm sm:text-base font-bold text-stone-900 mt-1.5">
                    Please rate each aspect of your visit
                  </h3>
                  <p className="text-xs text-stone-500">
                    Select Good, Average, or Bad for all questions below.
                  </p>
                </div>

                {SPECIFIC_QUESTIONS.map((question, index) => (
                  <RatingCard
                    key={question.id}
                    question={question}
                    index={index}
                    selectedValue={specificRatings[question.id]}
                    onSelect={handleSpecificRating}
                    hasError={validationErrors.includes(question.id)}
                  />
                ))}
              </div>

              {/* Section C: Optional Customer Comment */}
              <div className="pt-2">
                <CommentSection
                  value={comment}
                  onChange={setComment}
                />
              </div>

              {/* Friendly Validation Alert if validation failed */}
              {validationErrors.length > 0 && (
                <ValidationBanner
                  missingFields={validationErrors}
                  onScrollToMissing={() => scrollToFirstMissing(validationErrors)}
                />
              )}

              {/* Friendly API / Network Error Alert */}
              {apiError && (
                <div
                  role="alert"
                  className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 shadow-sm flex items-start gap-3 animate-fade-in"
                >
                  <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{apiError}</p>
                    <p className="text-xs text-stone-600 mt-0.5">
                      Your ratings and comments are preserved on this page. Please click Submit Feedback to retry.
                    </p>
                  </div>
                </div>
              )}

              {/* Large Primary Submit Button */}
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full min-h-[54px] sm:min-h-[58px] px-6 py-3.5 text-base sm:text-lg font-bold text-white bg-gradient-to-r from-amber-700 via-amber-800 to-amber-900 hover:from-amber-800 hover:to-amber-950 active:scale-[0.99] disabled:opacity-75 rounded-2xl shadow-lg shadow-amber-900/25 hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2.5 touch-manipulation focus:outline-none focus:ring-4 focus:ring-amber-500/30 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Submitting your feedback...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      <span>Submit Feedback</span>
                    </>
                  )}
                </button>

                <p className="text-[11px] text-stone-600 text-center mt-2.5">
                  Your feedback is submitted directly to Saravana Bhavan Hotel management.
                </p>
              </div>
            </form>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
