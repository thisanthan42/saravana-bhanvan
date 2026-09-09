import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchManagerFeedback,
  fetchBranches,
  managerLogout,
  managerStorage,
  getManagerProfile,
  deleteFeedback,
  toggleStarFeedback,
} from '../../services/managerService';
import FeedbackDetailModal from './FeedbackDetailModal';
import {
  Shield,
  LogOut,
  Star,
  AlertTriangle,
  Search,
  Calendar,
  ArrowUpDown,
  RefreshCw,
  Eye,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle2,
  Inbox,
  AlertCircle,
  FilterX,
  MapPin,
  Building2,
  Utensils,
  Trash2,
  Bookmark,
  BookmarkCheck,
} from 'lucide-react';

export default function ManagerDashboard({ onLogout }) {
  const [manager, setManager] = useState(managerStorage.getManager() || null);
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('1');
  const [feedbackList, setFeedbackList] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    average_rating: '0.0',
    stars: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    needs_action_count: 0,
  });
  const [pagination, setPagination] = useState({
    totalResults: 0,
    total_records: 0,
    totalPages: 1,
    total_pages: 1,
    currentPage: 1,
    current_page: 1,
    limit: 20,
    has_next_page: false,
    has_prev_page: false,
  });

  // Filters State
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'needsAction'
  const [starFilter, setStarFilter] = useState('all'); // 'all' | '1' | '2' | '3' | '4' | '5'
  const [dateRange, setDateRange] = useState('all'); // 'all' | 'today' | '7days' | '30days' | 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest' | 'oldest'
  const [currentPage, setCurrentPage] = useState(1);

  // UI State
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [starringId, setStarringId] = useState(null);

  const handleLogout = useCallback(async () => {
    await managerLogout();
    if (onLogout) {
      onLogout();
    } else {
      window.location.pathname = '/manager';
    }
  }, [onLogout]);

  // Load Manager profile & authorized branches on mount
  useEffect(() => {
    getManagerProfile()
      .then((res) => {
        if (res.manager) setManager(res.manager);
      })
      .catch(() => {
        handleLogout();
      });

    fetchBranches()
      .then((res) => {
        if (res.data) {
          setBranches(res.data);
        }
      })
      .catch((err) => console.warn('Could not load branches:', err));
  }, [handleLogout]);

  // Fetch Feedback Data from Backend API
  const loadData = useCallback(async (isBackground = false) => {
    if (!isBackground) {
      setIsLoading(true);
      setErrorMsg('');
    }

    try {
      const isNeedActionOnly = activeTab === 'needsAction';
      const result = await fetchManagerFeedback({
        rating: isNeedActionOnly ? 'all' : starFilter,
        needsAction: isNeedActionOnly ? 'true' : 'all',
        search: searchKeyword,
        dateRange,
        startDate: dateRange === 'custom' ? startDate : null,
        endDate: dateRange === 'custom' ? endDate : null,
        sort: sortOrder,
        page: currentPage,
        limit: 20,
        branchId: selectedBranchId,
      });

      if (result.success) {
        setFeedbackList(result.data || result.feedback || []);
        if (result.summary) setSummary(result.summary);
        if (result.pagination) setPagination(result.pagination);
      } else if (!isBackground) {
        setErrorMsg(result.message || "We couldn't load the feedback right now. Please try again.");
      }
    } catch (err) {
      if (err.message.includes('expired') || err.message.includes('Unauthorized') || err.message.includes('suspended') || err.message.includes('ACCOUNT_SUSPENDED') || err.message.includes('BUSINESS_SUSPENDED')) {
        alert(err.message || 'Access revoked: Account or business has been suspended.');
        handleLogout();
        return;
      }
      if (!isBackground) {
        setErrorMsg("We couldn't load the feedback right now. Please try again.");
      }
    } finally {
      if (!isBackground) {
        setIsLoading(false);
      }
    }
  }, [activeTab, starFilter, searchKeyword, dateRange, startDate, endDate, sortOrder, currentPage, selectedBranchId, handleLogout]);

  useEffect(() => {
    loadData(false);
    // Auto-poll every 4 seconds so submitted feedback lands immediately on the dashboard
    const pollInterval = setInterval(() => {
      loadData(true);
    }, 4000);
    return () => clearInterval(pollInterval);
  }, [loadData]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearchKeyword(searchInput.trim());
    setCurrentPage(1);
  };

  // Delete a feedback record
  const handleDelete = useCallback(async (id) => {
    if (!window.confirm(`Are you sure you want to delete feedback #${id}? This action cannot be undone.`)) return;
    setDeletingId(id);
    try {
      await deleteFeedback(id);
      setFeedbackList((prev) => prev.filter((item) => item.id !== id));
      if (selectedItem && selectedItem.id === id) setSelectedItem(null);
    } catch (err) {
      alert(`Failed to delete: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  }, [selectedItem]);

  // Toggle star/favorite on a feedback record
  const handleToggleStar = useCallback(async (id, currentStarred) => {
    setStarringId(id);
    try {
      const res = await toggleStarFeedback(id, !currentStarred);
      setFeedbackList((prev) =>
        prev.map((item) => (item.id === id ? { ...item, starred: res.data?.starred ?? !currentStarred } : item))
      );
    } catch (err) {
      alert(`Failed to update star: ${err.message}`);
    } finally {
      setStarringId(null);
    }
  }, []);

  const handleClearSearch = () => {
    setSearchInput('');
    setSearchKeyword('');
    setCurrentPage(1);
  };

  const handleResetAllFilters = () => {
    setActiveTab('all');
    setStarFilter('all');
    setDateRange('all');
    setStartDate('');
    setEndDate('');
    setSearchInput('');
    setSearchKeyword('');
    setSortOrder('newest');
    setCurrentPage(1);
  };

  const handleStarCardClick = (star) => {
    setActiveTab('all');
    setStarFilter(String(star));
    setCurrentPage(1);
  };

  const handleNeedActionCardClick = () => {
    setActiveTab('needsAction');
    setStarFilter('all');
    setCurrentPage(1);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return { date: 'N/A', time: '', day: '' };
    try {
      const d = new Date(dateStr);
      return {
        date: d.toLocaleDateString('en-IN', {
          timeZone: 'Asia/Kolkata',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
        time: d.toLocaleTimeString('en-US', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }).toUpperCase(),
        day: d.toLocaleDateString('en-IN', {
          timeZone: 'Asia/Kolkata',
          weekday: 'long',
        }),
      };
    } catch {
      return { date: dateStr, time: '', day: '' };
    }
  };

  const getPillColor = (val) => {
    if (val === 'Good') return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    if (val === 'Average') return 'bg-amber-50 text-amber-800 border-amber-200';
    if (val === 'Bad') return 'bg-rose-50 text-rose-800 border-rose-200 font-bold';
    return 'bg-stone-50 text-stone-600 border-stone-200';
  };

  const isAnyFilterActive =
    activeTab !== 'all' ||
    starFilter !== 'all' ||
    dateRange !== 'all' ||
    searchKeyword.length > 0 ||
    sortOrder !== 'newest';

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col font-sans text-stone-900">
      {/* Top Header */}
      <header className="bg-white border-b border-amber-200/70 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-800 to-amber-600 text-white flex items-center justify-center shadow-sm">
              <Shield className="w-5 h-5 text-amber-100" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold font-serif text-stone-900 leading-tight">
                Saravana Bhavan
              </h1>
              <p className="text-[11px] font-semibold text-amber-800 uppercase tracking-widest">
                Manager Dashboard
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">


            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5 justify-end">
                {manager?.name || 'Hotel Manager'}
                <span className="px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                  Manager
                </span>
              </span>
              <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1 justify-end">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Sync Active
              </span>
            </div>

            {/* Manual Refresh Button */}
            <button
              type="button"
              onClick={() => loadData(false)}
              title="Refresh Feedback"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-xl transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline">Refresh</span>
            </button>

            {/* Direct Link to Customer Feedback Form */}
            <a
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-colors cursor-pointer"
            >
              <Utensils className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Customer Form</span>
            </a>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-1 space-y-6">
        {/* KPI Summary Cards */}
        <section className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {/* Total Feedback */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('all');
              setStarFilter('all');
              setCurrentPage(1);
            }}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              activeTab === 'all' && starFilter === 'all'
                ? 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-500/20 shadow-sm'
                : 'bg-white border-stone-200 hover:border-amber-300'
            }`}
          >
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block">
              Total Feedback
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold font-serif text-stone-900">
                {summary.total}
              </span>
              <span className="text-xs text-stone-500">
                (avg {summary.average_rating}★)
              </span>
            </div>
          </button>

          {/* Star Breakdown (5 to 1) */}
          {[5, 4, 3, 2, 1].map((star) => {
            const isSelected = activeTab === 'all' && starFilter === String(star);
            return (
              <button
                key={star}
                type="button"
                onClick={() => handleStarCardClick(star)}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-500/20 shadow-sm'
                    : 'bg-white border-stone-200 hover:border-amber-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                    {star} Star
                  </span>
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                </div>
                <div className="mt-1 text-2xl sm:text-3xl font-extrabold font-serif text-stone-900">
                  {summary.stars?.[star] || 0}
                </div>
              </button>
            );
          })}

          {/* Need Action KPI Card */}
          <button
            type="button"
            onClick={handleNeedActionCardClick}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer col-span-2 sm:col-span-4 lg:col-span-1 ${
              activeTab === 'needsAction'
                ? 'bg-rose-100/90 border-rose-400 ring-2 ring-rose-500/20 shadow-sm'
                : 'bg-rose-50/60 border-rose-200 hover:border-rose-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800">
                Need Action
              </span>
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            </div>
            <div className="mt-1 text-2xl sm:text-3xl font-extrabold font-serif text-rose-950">
              {summary.needs_action_count}
            </div>
          </button>
        </section>

        {/* Tab Navigation & Toolbar */}
        <section className="bg-white rounded-3xl p-4 sm:p-5 border border-amber-200/60 shadow-xs space-y-4">
          {/* Main Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('all');
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-amber-800 text-white shadow-sm'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                All Feedback ({summary.total})
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('needsAction');
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'needsAction'
                    ? 'bg-rose-700 text-white shadow-sm'
                    : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Need Action</span>
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                  {summary.needs_action_count}
                </span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {isAnyFilterActive && (
                <button
                  type="button"
                  onClick={handleResetAllFilters}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-stone-600 hover:text-stone-900 px-3 py-1.5 rounded-lg border border-stone-200 hover:bg-stone-100 transition-colors cursor-pointer"
                >
                  <FilterX className="w-3.5 h-3.5 text-stone-500" />
                  <span>Reset Filters</span>
                </button>
              )}

              <button
                onClick={loadData}
                disabled={isLoading}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-amber-800 px-3 py-1.5 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Filter Controls Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Star Rating Pills (Only active on 'All' tab) */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                Filter by Star Rating
              </label>
              <div className="flex items-center gap-1 overflow-x-auto pb-1">
                {['all', '5', '4', '3', '2', '1'].map((val) => (
                  <button
                    key={val}
                    type="button"
                    disabled={activeTab === 'needsAction'}
                    onClick={() => {
                      setStarFilter(val);
                      setCurrentPage(1);
                    }}
                    className={`px-2.5 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer whitespace-nowrap ${
                      activeTab === 'needsAction'
                        ? 'opacity-40 cursor-not-allowed bg-stone-100 border-stone-200 text-stone-400'
                        : starFilter === val
                        ? 'bg-amber-600 border-amber-700 text-white shadow-2xs'
                        : 'bg-white border-stone-200 text-stone-700 hover:border-amber-400'
                    }`}
                  >
                    {val === 'all' ? 'All' : `${val}★`}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Range Selector */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                Date Range
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-stone-400">
                  <Calendar className="w-3.5 h-3.5" />
                </div>
                <select
                  value={dateRange}
                  onChange={(e) => {
                    setDateRange(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-8 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today (Last 24 Hours)</option>
                  <option value="7days">Last 7 Days</option>
                  <option value="30days">Last 30 Days</option>
                  <option value="custom">Custom Date Range</option>
                </select>
              </div>
            </div>

            {/* Sort Order Selector */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                Sort Submissions
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-stone-400">
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </div>
                <select
                  value={sortOrder}
                  onChange={(e) => {
                    setSortOrder(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-8 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="newest">Newest Submissions First</option>
                  <option value="oldest">Oldest Submissions First</option>
                </select>
              </div>
            </div>

            {/* Comment Search Box */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                Search in Comments
              </label>
              <form onSubmit={handleSearchSubmit} className="relative flex">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search feedback comments..."
                  className="w-full pl-3 pr-8 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                {searchInput ? (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-stone-400 hover:text-stone-700 text-xs font-bold"
                  >
                    ×
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-stone-400 hover:text-amber-700"
                  >
                    <Search className="w-3.5 h-3.5" />
                  </button>
                )}
              </form>
            </div>
          </div>

          {/* Custom Date Pickers if 'custom' is selected */}
          {dateRange === 'custom' && (
            <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200/80 flex items-center gap-3 flex-wrap text-xs">
              <span className="font-bold text-amber-900">Custom Range:</span>
              <div className="flex items-center gap-2">
                <span className="text-stone-600">From:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 bg-white border border-stone-300 rounded-lg text-xs"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-stone-600">To:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 bg-white border border-stone-300 rounded-lg text-xs"
                />
              </div>
            </div>
          )}
        </section>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-sm flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-700 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button
              onClick={loadData}
              className="px-3 py-1 bg-amber-800 text-white rounded-lg text-xs font-bold hover:bg-amber-900"
            >
              Retry
            </button>
          </div>
        )}

        {/* Feedback List Section */}
        <section className="bg-white rounded-3xl border border-stone-200/80 shadow-xs overflow-hidden">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-stone-500">
              <Loader2 className="w-8 h-8 animate-spin text-amber-700 mb-3" />
              <p className="text-sm font-semibold">Loading feedback records...</p>
            </div>
          ) : feedbackList.length === 0 ? (
            /* Empty States */
            <div className="py-16 px-4 text-center max-w-md mx-auto">
              <div className="w-14 h-14 mx-auto rounded-full bg-stone-100 flex items-center justify-center text-stone-400 mb-3">
                {activeTab === 'needsAction' ? (
                  <CheckCircle2 className="w-7 h-7 text-emerald-500" />
                ) : (
                  <Inbox className="w-7 h-7 text-stone-400" />
                )}
              </div>
              <h3 className="text-base font-bold text-stone-900 mb-1 font-serif">
                {activeTab === 'needsAction'
                  ? 'Great! There are currently no feedback items requiring action.'
                  : isAnyFilterActive
                  ? 'No feedback found for the selected filters.'
                  : 'No feedback yet'}
              </h3>
              <p className="text-xs text-stone-500 leading-relaxed mb-4">
                {activeTab === 'needsAction'
                  ? 'All customer experiences are positive and meet Saravana Bhavan hospitality standards.'
                  : isAnyFilterActive
                  ? 'Try adjusting or resetting your filters to see more customer feedback records.'
                  : 'Customer submissions will appear here automatically once guests submit feedback.'}
              </p>
              {isAnyFilterActive && (
                <button
                  type="button"
                  onClick={handleResetAllFilters}
                  className="px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          ) : (
            /* Responsive Feedback Table / Card View */
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3.5 px-4">Date & Time</th>
                    <th className="py-3.5 px-4">Overall Rating</th>
                    <th className="py-3.5 px-4">Category Ratings</th>
                    <th className="py-3.5 px-4">Customer Comment</th>
                    <th className="py-3.5 px-4">Action Status</th>
                    <th className="py-3.5 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-stone-800">
                  {feedbackList.map((item) => {
                    const formatted = formatDate(item.created_at);
                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-amber-50/40 transition-colors cursor-pointer group"
                        onClick={() => setSelectedItem(item)}
                      >
                        {/* Date & Time and Dining Table Badge */}
                        <td className="py-3.5 px-4 whitespace-nowrap font-medium text-stone-600">
                          <div className="font-bold text-stone-900">{formatted.date}</div>
                          <div className="text-[11px] text-stone-700 font-semibold">{formatted.day}</div>
                          <div className="text-[10px] text-stone-500 mb-1">{formatted.time}</div>
                          {item.table_id && (
                            <span className="inline-block mt-1 px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200/80 text-[10px] font-bold">
                              {item.table_id}
                            </span>
                          )}
                        </td>

                        {/* Overall Rating */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <div className="flex text-amber-500">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star
                                  key={s}
                                  className={`w-3.5 h-3.5 ${
                                    s <= item.overall_rating
                                      ? 'fill-amber-400 text-amber-500'
                                      : 'fill-stone-200 text-stone-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="font-extrabold text-stone-900 ml-0.5">
                              {item.overall_rating}★
                            </span>
                          </div>
                        </td>

                        {/* All 6 Specific Categories Summary */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1 max-w-sm">
                            <span className={`px-1.5 py-0.5 rounded-md border text-[10px] ${getPillColor(item.food_rating)}`}>
                              Food: {item.food_rating}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded-md border text-[10px] ${getPillColor(item.service_rating)}`}>
                              Service: {item.service_rating}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded-md border text-[10px] ${getPillColor(item.cleanliness_rating)}`}>
                              Clean: {item.cleanliness_rating}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded-md border text-[10px] ${getPillColor(item.toilet_rating)}`}>
                              Toilet: {item.toilet_rating}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded-md border text-[10px] ${getPillColor(item.parking_rating)}`}>
                              Parking: {item.parking_rating}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded-md border text-[10px] ${getPillColor(item.staff_behaviour_rating)}`}>
                              Staff: {item.staff_behaviour_rating}
                            </span>
                          </div>
                        </td>

                        {/* Comment Preview */}
                        <td className="py-3.5 px-4 max-w-xs">
                          {item.comment ? (
                            <p className="line-clamp-2 text-stone-700 italic font-serif">
                              "{item.comment}"
                            </p>
                          ) : (
                            <span className="text-stone-400 italic">No comment</span>
                          )}
                        </td>

                        {/* Need Action Alert */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {item.needs_action ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md w-fit">
                                <AlertTriangle className="w-3 h-3" />
                                ⚠️ Need Action
                              </span>
                              <span className="text-[10px] text-rose-800 font-bold max-w-[200px] truncate" title={item.action_reason_text || item.action_reasons?.join(' + ')}>
                                {item.action_reason_text || item.action_reasons?.join(' + ')}
                              </span>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                              <CheckCircle2 className="w-3 h-3" />
                              Normal
                            </span>
                          )}
                        </td>

                        {/* Actions: Star, View, Delete */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Star/Favorite */}
                            <button
                              type="button"
                              title={item.starred ? 'Remove from favorites' : 'Add to favorites'}
                              disabled={starringId === item.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleStar(item.id, item.starred);
                              }}
                              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                item.starred
                                  ? 'bg-amber-100 border-amber-300 text-amber-700 hover:bg-amber-200'
                                  : 'bg-stone-50 border-stone-200 text-stone-400 hover:text-amber-600 hover:border-amber-300 hover:bg-amber-50'
                              } ${starringId === item.id ? 'opacity-50' : ''}`}
                            >
                              {item.starred ? (
                                <BookmarkCheck className="w-3.5 h-3.5" />
                              ) : (
                                <Bookmark className="w-3.5 h-3.5" />
                              )}
                            </button>
                            {/* View */}
                            <button
                              type="button"
                              title="View details"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedItem(item);
                              }}
                              className="p-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 hover:text-amber-950 transition-colors cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            {/* Delete */}
                            <button
                              type="button"
                              title="Delete feedback"
                              disabled={deletingId === item.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(item.id);
                              }}
                              className={`p-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-800 transition-colors cursor-pointer ${
                                deletingId === item.id ? 'opacity-50' : ''
                              }`}
                            >
                              {deletingId === item.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          {!isLoading && feedbackList.length > 0 && (
            <div className="bg-stone-50 px-4 py-3 border-t border-stone-200 flex items-center justify-between flex-wrap gap-3 text-xs">
              <span className="text-stone-600 font-medium">
                Showing{' '}
                <span className="font-bold text-stone-900">
                  {((pagination.currentPage || pagination.current_page || 1) - 1) * (pagination.limit || 20) + 1}
                </span>{' '}
                to{' '}
                <span className="font-bold text-stone-900">
                  {Math.min(
                    (pagination.currentPage || pagination.current_page || 1) * (pagination.limit || 20),
                    pagination.totalResults || pagination.total_records || 0
                  )}
                </span>{' '}
                of{' '}
                <span className="font-bold text-stone-900">
                  {pagination.totalResults || pagination.total_records || 0}
                </span>{' '}
                records
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!pagination.has_prev_page}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 bg-white border border-stone-300 rounded-lg font-semibold text-stone-700 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>

                <span className="font-bold text-stone-800 px-2">
                  Page {pagination.currentPage || pagination.current_page || 1} of{' '}
                  {pagination.totalPages || pagination.total_pages || 1}
                </span>

                <button
                  type="button"
                  disabled={!pagination.has_next_page}
                  onClick={() =>
                    setCurrentPage((p) =>
                      Math.min(pagination.totalPages || pagination.total_pages || 1, p + 1)
                    )
                  }
                  className="px-3 py-1.5 bg-white border border-stone-300 rounded-lg font-semibold text-stone-700 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Selected Feedback Detail Modal */}
      {selectedItem && (
        <FeedbackDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}
