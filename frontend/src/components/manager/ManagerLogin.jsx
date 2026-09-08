import React, { useState } from 'react';
import { managerLogin } from '../../services/managerService';
import { Shield, Lock, Mail, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';

export default function ManagerLogin({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setErrorMessage('');
    setIsLoading(true);

    try {
      await managerLogin(email.trim(), password);
      if (onLoginSuccess) {
        onLoginSuccess();
      } else {
        window.location.pathname = '/manager/dashboard';
      }
    } catch (err) {
      setErrorMessage(err.message || 'Invalid username or password.');
    } finally {
      setIsLoading(false);
    }
  };

  const fillDevCredentials = () => {
    setEmail('manager@saravanabhavan.com');
    setPassword('test123');
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen bg-hotel-warmBg flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-800 to-amber-600 text-white shadow-lg shadow-amber-900/20 mb-4">
            <Shield className="w-8 h-8 text-amber-100" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-stone-900">
            Saravana Bhavan
          </h1>
          <p className="text-sm font-semibold text-amber-800 uppercase tracking-widest mt-1">
            Manager Portal
          </p>
          <p className="text-xs text-stone-500 mt-2">
            Secure administrative access for hotel leadership & analytics
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-3xl p-7 sm:p-8 shadow-xl border border-amber-200/60 backdrop-blur-xs">
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Error Banner */}
            {errorMessage && (
              <div
                role="alert"
                className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-2.5 animate-fade-in"
              >
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label
                htmlFor="manager-email"
                className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5"
              >
                Email / Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="manager-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="manager@saravanabhavan.com"
                  autoComplete="username"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="manager-password"
                className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="manager-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  required
                  className="w-full pl-10 pr-11 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 hover:text-stone-600 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-6 font-bold text-sm text-white bg-gradient-to-r from-amber-700 via-amber-800 to-amber-900 hover:from-amber-800 hover:to-amber-950 disabled:opacity-75 rounded-xl shadow-md shadow-amber-900/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <span>Login to Dashboard</span>
              )}
            </button>
          </form>

          {/* Development Quick-fill Hint */}
          <div className="mt-6 pt-5 border-t border-stone-100 text-center">
            <button
              type="button"
              onClick={fillDevCredentials}
              className="text-xs text-amber-800 hover:text-amber-950 font-medium underline underline-offset-4 cursor-pointer"
            >
              Click to autofill default credentials (manager@saravanabhavan.com / test123)
            </button>
          </div>
        </div>

        {/* Guest Return Link */}
        <p className="text-center text-xs text-stone-500 mt-6">
          Are you a customer?{' '}
          <a
            href="/"
            className="text-amber-800 font-semibold hover:underline"
          >
            Go to Customer Feedback Form
          </a>
        </p>
      </div>
    </div>
  );
}
