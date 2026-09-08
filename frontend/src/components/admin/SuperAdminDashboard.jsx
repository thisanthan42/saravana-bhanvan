import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Building2,
  Users,
  GitFork,
  QrCode,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Plus,
  RefreshCw,
  LogOut,
  ExternalLink,
  Key,
  Layers,
  History,
  Lock,
  ChevronRight,
  Search,
  Check,
  Copy,
  SlidersHorizontal,
  Hotel
} from 'lucide-react';
import {
  fetchAdminStats,
  fetchBusinesses,
  createBusiness,
  toggleBusinessStatus,
  fetchAdminManagers,
  createAdminManager,
  toggleManagerStatus,
  updateManagerBranches,
  resetManagerPassword,
  fetchAdminBranches,
  createAdminBranch,
  toggleBranchStatus,
  fetchAuditLogs,
} from '../../services/adminService';
import { fetchManagerFeedback, fetchManagerQRs, toggleQRStatus, managerStorage } from '../../services/managerService';

export default function SuperAdminDashboard({ onNavigateToManager, onNavigateToQR, onLogout }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Core Data Stores
  const [stats, setStats] = useState({
    totalBusinesses: 0,
    activeBusinesses: 0,
    suspendedBusinesses: 0,
    totalManagers: 0,
    activeManagers: 0,
    suspendedManagers: 0,
    totalBranches: 0,
    totalQRCodes: 0,
    totalFeedback: 0,
  });
  const [businesses, setBusinesses] = useState([]);
  const [managers, setManagers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [qrCodes, setQrCodes] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  // Modals state
  const [showCreateBizModal, setShowCreateBizModal] = useState(false);
  const [showCreateMgrModal, setShowCreateMgrModal] = useState(false);
  const [showCreateBranchModal, setShowCreateBranchModal] = useState(false);
  const [resetPwdModal, setResetPwdModal] = useState({ open: false, manager: null, newPassword: '' });
  const [branchAssignModal, setBranchAssignModal] = useState({ open: false, manager: null, selectedBranchIds: [] });

  // Form states
  const [bizForm, setBizForm] = useState({ name: '', contactEmail: '', contactPhone: '', status: 'active' });
  const [mgrForm, setMgrForm] = useState({ name: '', email: '', password: '', role: 'manager', businessId: 1, branchIds: [] });
  const [branchForm, setBranchForm] = useState({ name: '', code: '', address: '', businessId: 1 });

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedToken, setCopiedToken] = useState(null);

  const showSuccess = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const loadAllData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [statsRes, bizRes, mgrRes, brRes, qrRes, fbRes, auditRes] = await Promise.all([
        fetchAdminStats().catch(() => ({ stats: {} })),
        fetchBusinesses().catch(() => ({ businesses: [] })),
        fetchAdminManagers().catch(() => ({ managers: [] })),
        fetchAdminBranches().catch(() => ({ branches: [] })),
        fetchManagerQRs().catch(() => ({ data: [] })),
        fetchManagerFeedback({ limit: 50 }).catch(() => ({ data: [] })),
        fetchAuditLogs(30).catch(() => ({ logs: [] })),
      ]);

      if (statsRes.stats) setStats(statsRes.stats);
      if (bizRes.businesses) setBusinesses(bizRes.businesses);
      if (mgrRes.managers) setManagers(mgrRes.managers);
      if (brRes.branches) setBranches(brRes.branches);
      if (qrRes.data) setQrCodes(qrRes.data);
      if (fbRes.data) setFeedbacks(fbRes.data);
      if (auditRes.logs) setAuditLogs(auditRes.logs);
    } catch (err) {
      setError(err.message || 'Failed to retrieve administrative data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Handle Business Creation
  const handleCreateBusiness = async (e) => {
    e.preventDefault();
    if (!bizForm.name.trim()) return;
    try {
      await createBusiness(bizForm);
      showSuccess(`Business '${bizForm.name}' created successfully.`);
      setShowCreateBizModal(false);
      setBizForm({ name: '', contactEmail: '', contactPhone: '', status: 'active' });
      loadAllData(true);
    } catch (err) {
      alert(err.message);
    }
  };

  // Toggle Business Status
  const handleToggleBusiness = async (biz) => {
    const nextStatus = biz.status === 'active' ? 'suspended' : 'active';
    const confirmMsg = nextStatus === 'suspended'
      ? `Suspend '${biz.name}'? Managers belonging to this business will immediately lose dashboard access.`
      : `Reactivate '${biz.name}'? Managers will regain normal dashboard access.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await toggleBusinessStatus(biz.id, nextStatus);
      showSuccess(`Business '${biz.name}' is now ${nextStatus}.`);
      loadAllData(true);
    } catch (err) {
      alert(err.message);
    }
  };

  // Handle Manager Creation
  const handleCreateManager = async (e) => {
    e.preventDefault();
    if (!mgrForm.name || !mgrForm.email || !mgrForm.password) return;
    try {
      await createAdminManager(mgrForm);
      showSuccess(`Manager '${mgrForm.name}' created successfully.`);
      setShowCreateMgrModal(false);
      setMgrForm({ name: '', email: '', password: '', role: 'manager', businessId: 1, branchIds: [] });
      loadAllData(true);
    } catch (err) {
      alert(err.message);
    }
  };

  // Toggle Manager Status
  const handleToggleManager = async (mgr) => {
    const nextStatus = mgr.status === 'active' ? 'suspended' : 'active';
    const confirmMsg = nextStatus === 'suspended'
      ? `Suspend manager '${mgr.email}'? Their live session will immediately be revoked.`
      : `Reactivate manager '${mgr.email}'?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await toggleManagerStatus(mgr.id, nextStatus);
      showSuccess(`Manager '${mgr.email}' account is now ${nextStatus}.`);
      loadAllData(true);
    } catch (err) {
      alert(err.message);
    }
  };

  // Handle Branch Assignment Update
  const handleSaveBranchAssignment = async () => {
    if (!branchAssignModal.manager) return;
    try {
      await updateManagerBranches(branchAssignModal.manager.id, branchAssignModal.selectedBranchIds);
      showSuccess(`Branch permissions updated for ${branchAssignModal.manager.email}`);
      setBranchAssignModal({ open: false, manager: null, selectedBranchIds: [] });
      loadAllData(true);
    } catch (err) {
      alert(err.message);
    }
  };

  // Handle Password Reset
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetPwdModal.manager || !resetPwdModal.newPassword) return;
    try {
      await resetManagerPassword(resetPwdModal.manager.id, resetPwdModal.newPassword);
      showSuccess(`Password for ${resetPwdModal.manager.email} reset successfully.`);
      setResetPwdModal({ open: false, manager: null, newPassword: '' });
    } catch (err) {
      alert(err.message);
    }
  };

  // Handle Branch Creation
  const handleCreateBranch = async (e) => {
    e.preventDefault();
    if (!branchForm.name || !branchForm.code) return;
    try {
      await createAdminBranch(branchForm);
      showSuccess(`Branch '${branchForm.name}' created successfully.`);
      setShowCreateBranchModal(false);
      setBranchForm({ name: '', code: '', address: '', businessId: 1 });
      loadAllData(true);
    } catch (err) {
      alert(err.message);
    }
  };

  // Toggle Branch Status
  const handleToggleBranch = async (branch) => {
    try {
      await toggleBranchStatus(branch.id, !branch.active);
      showSuccess(`Branch '${branch.name}' status updated.`);
      loadAllData(true);
    } catch (err) {
      alert(err.message);
    }
  };

  // Toggle QR Status
  const handleToggleQR = async (qr) => {
    try {
      await toggleQRStatus(qr.id, !qr.active);
      showSuccess(`QR Code '${qr.public_token}' status updated.`);
      loadAllData(true);
    } catch (err) {
      alert(err.message);
    }
  };

  const copyToClipboard = (token) => {
    const url = `${window.location.origin}/q/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16">
      {/* 1. TOP MASTER NAVIGATION BAR */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-amber-500/20 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 flex items-center justify-center text-white shadow-lg shadow-amber-500/25">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold tracking-tight text-white text-lg sm:text-xl">
                  Saravana Bhavan
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase">
                  Super Admin
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">Enterprise Platform Owner Control</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={() => onNavigateToManager && onNavigateToManager()}
              className="hidden sm:inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              title="Switch to daily Hotel Manager portal"
            >
              <Building2 className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
              Manager Portal
            </button>

            <button
              onClick={() => onNavigateToQR && onNavigateToQR()}
              className="hidden md:inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              title="Manage table QR codes"
            >
              <QrCode className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
              QR Standees
            </button>

            <button
              onClick={() => loadAllData(true)}
              disabled={refreshing}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Refresh all metrics"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-amber-400' : ''}`} />
            </button>

            <button
              onClick={() => onLogout && onLogout()}
              className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-950/50 hover:bg-red-900/50 text-red-300 border border-red-800/40 transition"
            >
              <LogOut className="w-3.5 h-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        {/* Status Banners */}
        {successMessage && (
          <div className="bg-emerald-950/80 border-t border-b border-emerald-500/30 px-4 py-2 text-center text-xs font-semibold text-emerald-300 flex items-center justify-center space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}
        {error && (
          <div className="bg-red-950/80 border-t border-b border-red-500/30 px-4 py-2 text-center text-xs font-semibold text-red-300 flex items-center justify-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span>{error}</span>
          </div>
        )}
      </header>

      {/* 2. MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* 8 LIVE SUMMARY CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 sm:gap-4 mb-8">
          <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl shadow">
            <div className="text-[11px] font-medium text-slate-400 uppercase">Businesses</div>
            <div className="text-xl font-bold text-white mt-1">{stats.totalBusinesses}</div>
            <div className="text-[10px] text-emerald-400 font-semibold mt-0.5">{stats.activeBusinesses} Active</div>
          </div>

          <div className={`border p-3.5 rounded-xl shadow ${stats.suspendedBusinesses > 0 ? 'bg-amber-950/30 border-amber-700/50' : 'bg-slate-900/90 border-slate-800'}`}>
            <div className="text-[11px] font-medium text-slate-400 uppercase">Suspended Biz</div>
            <div className={`text-xl font-bold mt-1 ${stats.suspendedBusinesses > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
              {stats.suspendedBusinesses}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">{stats.suspendedBusinesses > 0 ? 'Restricted' : 'None'}</div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl shadow">
            <div className="text-[11px] font-medium text-slate-400 uppercase">Managers</div>
            <div className="text-xl font-bold text-white mt-1">{stats.totalManagers}</div>
            <div className="text-[10px] text-emerald-400 font-semibold mt-0.5">{stats.activeManagers} Active</div>
          </div>

          <div className={`border p-3.5 rounded-xl shadow ${stats.suspendedManagers > 0 ? 'bg-red-950/30 border-red-700/50' : 'bg-slate-900/90 border-slate-800'}`}>
            <div className="text-[11px] font-medium text-slate-400 uppercase">Suspended Mgrs</div>
            <div className={`text-xl font-bold mt-1 ${stats.suspendedManagers > 0 ? 'text-red-400' : 'text-slate-300'}`}>
              {stats.suspendedManagers}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">{stats.suspendedManagers > 0 ? 'Access Revoked' : 'All Clear'}</div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl shadow">
            <div className="text-[11px] font-medium text-slate-400 uppercase">Branches</div>
            <div className="text-xl font-bold text-white mt-1">{stats.totalBranches}</div>
            <div className="text-[10px] text-amber-400 font-semibold mt-0.5">{stats.activeBranches} Active</div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl shadow">
            <div className="text-[11px] font-medium text-slate-400 uppercase">QR Codes</div>
            <div className="text-xl font-bold text-white mt-1">{stats.totalQRCodes}</div>
            <div className="text-[10px] text-emerald-400 font-semibold mt-0.5">Tables Bound</div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl shadow">
            <div className="text-[11px] font-medium text-slate-400 uppercase">Feedbacks</div>
            <div className="text-xl font-bold text-white mt-1">{stats.totalFeedback}</div>
            <div className="text-[10px] text-blue-400 font-semibold mt-0.5">Total Ingested</div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl shadow">
            <div className="text-[11px] font-medium text-slate-400 uppercase">Audit Events</div>
            <div className="text-xl font-bold text-white mt-1">{auditLogs.length}</div>
            <div className="text-[10px] text-purple-400 font-semibold mt-0.5">Security Logs</div>
          </div>
        </div>

        {/* 3. TAB NAVIGATION */}
        <div className="flex border-b border-slate-800 overflow-x-auto scrollbar-none mb-6 space-x-1 sm:space-x-2">
          {[
            { id: 'overview', label: 'Platform Overview', icon: Layers },
            { id: 'businesses', label: `Hotels (${businesses.length})`, icon: Hotel },
            { id: 'managers', label: `Managers (${managers.length})`, icon: Users },
            { id: 'branches', label: `Branches (${branches.length})`, icon: GitFork },
            { id: 'qr_master', label: `QR Registry (${qrCodes.length})`, icon: QrCode },
            { id: 'feedbacks', label: `All Reviews (${feedbacks.length})`, icon: MessageSquare },
            { id: 'audit', label: `Audit Trail (${auditLogs.length})`, icon: History },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-t-lg transition whitespace-nowrap border-b-2 ${
                  isActive
                    ? 'border-amber-500 text-amber-400 bg-slate-900/70'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                }`}
              >
                <Icon className={`w-4 h-4 mr-2 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-white flex items-center">
                    <ShieldCheck className="w-5 h-5 mr-2 text-amber-400" />
                    Platform Owner Governance & Controls
                  </h3>
                  <span className="px-2.5 py-1 bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 rounded-full text-xs font-bold">
                    System Fully Operational
                  </span>
                </div>
                <p className="text-slate-300 text-sm leading-relaxed mb-6">
                  As the platform owner, you have universal authority to provision hotel accounts, create and suspend manager logins, manage multi-branch hierarchies, issue cryptographically secure table QR standees, and review raw feedback feeds across all establishments.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    onClick={() => setShowCreateBizModal(true)}
                    className="p-3.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-left transition group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400 mb-2 group-hover:scale-105 transition">
                      <Plus className="w-4 h-4" />
                    </div>
                    <div className="text-xs font-bold text-white">Add New Hotel</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">Provision a new business entity</div>
                  </button>

                  <button
                    onClick={() => setShowCreateMgrModal(true)}
                    className="p-3.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-left transition group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 mb-2 group-hover:scale-105 transition">
                      <Users className="w-4 h-4" />
                    </div>
                    <div className="text-xs font-bold text-white">Add Branch Manager</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">Assign hotel credentials</div>
                  </button>

                  <button
                    onClick={() => setShowCreateBranchModal(true)}
                    className="p-3.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-left transition group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 mb-2 group-hover:scale-105 transition">
                      <GitFork className="w-4 h-4" />
                    </div>
                    <div className="text-xs font-bold text-white">Add New Branch</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">Expand to a new location</div>
                  </button>
                </div>
              </div>

              {/* Quick Status / Quick Actions */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <h3 className="text-base font-bold text-white flex items-center">
                  <Lock className="w-4 h-4 mr-2 text-amber-400" />
                  Anti-IDOR Security Status
                </h3>
                <div className="text-xs space-y-3">
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    <span className="text-slate-300">
                      <strong>Server-Side Scoping:</strong> Branch managers are strictly blocked from querying other branches.
                    </span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    <span className="text-slate-300">
                      <strong>Instant Revocation:</strong> Account suspension immediately terminates live JWT requests with HTTP 403.
                    </span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    <span className="text-slate-300">
                      <strong>Customer Privacy:</strong> Zero branch, table, or manager data leaked to public diners.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: HOTELS & BUSINESSES */}
        {activeTab === 'businesses' && (
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-white">Hotel & Business Accounts</h3>
                <p className="text-xs text-slate-400">Manage client hospitality accounts and global suspension status</p>
              </div>
              <button
                onClick={() => setShowCreateBizModal(true)}
                className="inline-flex items-center px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition shadow"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Add Business
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Business Name</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4 text-center">Branches</th>
                    <th className="py-3 px-4 text-center">Managers</th>
                    <th className="py-3 px-4 text-center">Reviews</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {businesses.map((biz) => (
                    <tr key={biz.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-4 font-bold text-white flex items-center space-x-2">
                        <Hotel className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>{biz.name}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        <div>{biz.contact_email || '—'}</div>
                        <div className="text-[10px] text-slate-500">{biz.contact_phone || ''}</div>
                      </td>
                      <td className="py-3.5 px-4 text-center font-semibold text-slate-200">{biz.branch_count || 0}</td>
                      <td className="py-3.5 px-4 text-center font-semibold text-slate-200">{biz.manager_count || 0}</td>
                      <td className="py-3.5 px-4 text-center font-semibold text-amber-400">{biz.feedback_count || 0}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            biz.status === 'active'
                              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                              : 'bg-red-950/60 text-red-400 border border-red-500/30'
                          }`}
                        >
                          {biz.status === 'active' ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleToggleBusiness(biz)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                            biz.status === 'active'
                              ? 'bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/40'
                              : 'bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/40'
                          }`}
                        >
                          {biz.status === 'active' ? 'Suspend Account' : 'Reactivate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: MANAGERS CONTROL */}
        {activeTab === 'managers' && (
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-white">Manager Governance & Roles</h3>
                <p className="text-xs text-slate-400">Control manager accounts, branch scoping, password resets, and account suspension</p>
              </div>
              <button
                onClick={() => setShowCreateMgrModal(true)}
                className="inline-flex items-center px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition shadow"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Add Manager
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Manager</th>
                    <th className="py-3 px-4">Business</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Assigned Branches</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {managers.map((mgr) => {
                    const isSuperAdmin = mgr.role === 'super_admin';
                    return (
                      <tr key={mgr.id} className="hover:bg-slate-800/30 transition">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white">{mgr.name}</div>
                          <div className="text-[11px] text-slate-400">{mgr.email}</div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-300">{mgr.business_name || 'Saravana Bhavan Hotel'}</td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              isSuperAdmin
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            }`}
                          >
                            {isSuperAdmin ? 'Super Admin' : 'Branch Mgr'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {isSuperAdmin ? (
                            <span className="text-amber-400 font-medium">Universal (All Branches)</span>
                          ) : mgr.branches && mgr.branches.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {mgr.branches.map((b) => (
                                <span key={b.id} className="px-2 py-0.5 bg-slate-800 text-slate-200 rounded text-[10px] border border-slate-700">
                                  {b.name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-red-400 italic">No branch assigned</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              mgr.status === 'active'
                                ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                                : 'bg-red-950/60 text-red-400 border border-red-500/30'
                            }`}
                          >
                            {mgr.status === 'active' ? 'Active' : 'Suspended'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          {!isSuperAdmin && (
                            <>
                              <button
                                onClick={() => setBranchAssignModal({
                                  open: true,
                                  manager: mgr,
                                  selectedBranchIds: (mgr.branches || []).map(b => b.id),
                                })}
                                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-medium"
                                title="Edit assigned branches"
                              >
                                Branches
                              </button>

                              <button
                                onClick={() => setResetPwdModal({ open: true, manager: mgr, newPassword: '' })}
                                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-medium"
                                title="Reset manager password"
                              >
                                Reset Pwd
                              </button>

                              <button
                                onClick={() => handleToggleManager(mgr)}
                                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                                  mgr.status === 'active'
                                    ? 'bg-red-950/50 hover:bg-red-900/60 text-red-300 border border-red-800/40'
                                    : 'bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/40'
                                }`}
                              >
                                {mgr.status === 'active' ? 'Suspend' : 'Activate'}
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: BRANCHES & TABLES */}
        {activeTab === 'branches' && (
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-white">Hotel Branches & Locations</h3>
                <p className="text-xs text-slate-400">All registered branches, physical table counts, and QR deployment counts</p>
              </div>
              <button
                onClick={() => setShowCreateBranchModal(true)}
                className="inline-flex items-center px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition shadow"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Add Branch
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {branches.map((br) => (
                <div key={br.id} className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-5 shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="text-base font-bold text-white">{br.name}</h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-700 text-amber-300">
                        {br.code}
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        br.active
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                          : 'bg-red-950/60 text-red-400 border border-red-500/30'
                      }`}
                    >
                      {br.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 mb-4">{br.address || 'Address not specified'}</p>

                  <div className="grid grid-cols-3 gap-2 border-t border-slate-700/60 pt-3 text-center text-xs">
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase">Tables</div>
                      <div className="font-bold text-white mt-0.5">{br.table_count || 0}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase">QRs</div>
                      <div className="font-bold text-white mt-0.5">{br.qr_count || 0}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase">Reviews</div>
                      <div className="font-bold text-amber-400 mt-0.5">{br.feedback_count || 0}</div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-700/60 flex justify-end">
                    <button
                      onClick={() => handleToggleBranch(br)}
                      className={`text-xs font-semibold px-2.5 py-1 rounded transition ${
                        br.active ? 'text-red-400 hover:bg-red-950/40' : 'text-emerald-400 hover:bg-emerald-950/40'
                      }`}
                    >
                      {br.active ? 'Deactivate Branch' : 'Activate Branch'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: MASTER QR CODE REGISTRY */}
        {activeTab === 'qr_master' && (
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-white">Master QR Code Registry</h3>
                <p className="text-xs text-slate-400">Cryptographically random QR tokens deployed across all dining tables</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Branch</th>
                    <th className="py-3 px-4">Table</th>
                    <th className="py-3 px-4">Public Token</th>
                    <th className="py-3 px-4 text-center">Scans</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {qrCodes.map((qr) => (
                    <tr key={qr.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-4 font-semibold text-white">{qr.branch_name || 'Branch ' + qr.branch_id}</td>
                      <td className="py-3.5 px-4 font-bold text-amber-400">Table {qr.table_number}</td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-300">{qr.public_token}</td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-200">{qr.scan_count || 0}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            qr.active
                              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                              : 'bg-red-950/60 text-red-400 border border-red-500/30'
                          }`}
                        >
                          {qr.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button
                          onClick={() => copyToClipboard(qr.public_token)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-medium inline-flex items-center"
                          title="Copy direct customer URL"
                        >
                          {copiedToken === qr.public_token ? <Check className="w-3 h-3 mr-1 text-emerald-400" /> : <Copy className="w-3 h-3 mr-1" />}
                          {copiedToken === qr.public_token ? 'Copied' : 'Copy'}
                        </button>
                        <a
                          href={`/q/${qr.public_token}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 text-[11px] font-medium inline-flex items-center"
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          Test
                        </a>
                        <button
                          onClick={() => handleToggleQR(qr)}
                          className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                            qr.active ? 'text-red-400 hover:bg-red-950/40' : 'text-emerald-400 hover:bg-emerald-950/40'
                          }`}
                        >
                          {qr.active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: UNIVERSAL FEEDBACK LOG */}
        {activeTab === 'feedbacks' && (
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-white">Universal Feedback Feed</h3>
                <p className="text-xs text-slate-400">All reviews ingested across every hotel branch with Need Action flags</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Rating</th>
                    <th className="py-3 px-4">Branch & Table</th>
                    <th className="py-3 px-4">Experience Categories</th>
                    <th className="py-3 px-4">Customer Comment</th>
                    <th className="py-3 px-4">Need Action</th>
                    <th className="py-3 px-4 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {feedbacks.map((f) => (
                    <tr key={f.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-4 font-bold text-amber-400 whitespace-nowrap">
                        {'★'.repeat(f.overall_rating)}{'☆'.repeat(5 - f.overall_rating)}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">{f.branch_name || 'Branch ' + f.branch_id}</div>
                        <div className="text-[11px] text-slate-400">Table {f.table_number || 'Walk-in'}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 text-[10px]">
                          <span className={`px-1.5 py-0.5 rounded ${f.food_rating === 'Bad' ? 'bg-red-950 text-red-400 border border-red-800' : 'bg-slate-800 text-slate-300'}`}>Food: {f.food_rating}</span>
                          <span className={`px-1.5 py-0.5 rounded ${f.service_rating === 'Bad' ? 'bg-red-950 text-red-400 border border-red-800' : 'bg-slate-800 text-slate-300'}`}>Service: {f.service_rating}</span>
                          <span className={`px-1.5 py-0.5 rounded ${f.toilet_rating === 'Bad' ? 'bg-red-950 text-red-400 border border-red-800' : 'bg-slate-800 text-slate-300'}`}>Toilet: {f.toilet_rating}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs truncate text-slate-300">
                        {f.comment || <span className="text-slate-600 italic">No comment</span>}
                      </td>
                      <td className="py-3.5 px-4">
                        {f.needs_action ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/60 text-amber-400 border border-amber-500/30">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Action Required
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[11px]">Normal</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-400 whitespace-nowrap text-[11px]">
                        {new Date(f.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 7: AUDIT TRAIL */}
        {activeTab === 'audit' && (
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-white">Platform Owner Audit Trail</h3>
                <p className="text-xs text-slate-400">Chronological history of security, administrative, and permission modifications</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Event Action</th>
                    <th className="py-3 px-4">Initiated By</th>
                    <th className="py-3 px-4">Target Entity</th>
                    <th className="py-3 px-4">Details</th>
                    <th className="py-3 px-4 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-amber-400 text-[11px] bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">{log.user_name || 'System'}</div>
                        <div className="text-[10px] text-slate-500">{log.user_email || ''}</div>
                      </td>
                      <td className="py-3.5 px-4 uppercase text-[11px] text-slate-300">
                        {log.entity_type} #{log.entity_id || '—'}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[10px] text-slate-400 max-w-sm truncate">
                        {typeof log.details === 'object' ? JSON.stringify(log.details) : String(log.details || '')}
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-400 whitespace-nowrap text-[11px]">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* MODAL 1: CREATE BUSINESS */}
      {showCreateBizModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center">
                <Hotel className="w-5 h-5 mr-2 text-amber-400" />
                Provision New Hotel Business
              </h3>
              <button onClick={() => setShowCreateBizModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateBusiness} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Business Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Anjappar Chettinad Restaurant"
                  value={bizForm.name}
                  onChange={(e) => setBizForm({ ...bizForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Contact Email</label>
                <input
                  type="email"
                  placeholder="admin@hotel.com"
                  value={bizForm.contactEmail}
                  onChange={(e) => setBizForm({ ...bizForm, contactEmail: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Contact Phone</label>
                <input
                  type="text"
                  placeholder="+91 98765 43210"
                  value={bizForm.contactPhone}
                  onChange={(e) => setBizForm({ ...bizForm, contactPhone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateBizModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 text-slate-950 rounded-lg hover:bg-amber-400 font-bold"
                >
                  Create Business
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE MANAGER */}
      {showCreateMgrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center">
                <Users className="w-5 h-5 mr-2 text-amber-400" />
                Add Manager Account
              </h3>
              <button onClick={() => setShowCreateMgrModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateManager} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={mgrForm.name}
                  onChange={(e) => setMgrForm({ ...mgrForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="ramesh@saravanabhavan.com"
                  value={mgrForm.email}
                  onChange={(e) => setMgrForm({ ...mgrForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Password * (Min 8 chars)</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={mgrForm.password}
                  onChange={(e) => setMgrForm({ ...mgrForm, password: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Assigned Business</label>
                <select
                  value={mgrForm.businessId}
                  onChange={(e) => setMgrForm({ ...mgrForm, businessId: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-amber-500"
                >
                  {businesses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Assign Initial Branches</label>
                <div className="space-y-1.5 max-h-32 overflow-y-auto bg-slate-800/60 p-2.5 rounded-lg border border-slate-700">
                  {branches.map((br) => (
                    <label key={br.id} className="flex items-center space-x-2 text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={mgrForm.branchIds.includes(br.id)}
                        onChange={(e) => {
                          const updated = e.target.checked
                            ? [...mgrForm.branchIds, br.id]
                            : mgrForm.branchIds.filter((id) => id !== br.id);
                          setMgrForm({ ...mgrForm, branchIds: updated });
                        }}
                        className="rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-0"
                      />
                      <span>{br.name} ({br.code})</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateMgrModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 text-slate-950 rounded-lg hover:bg-amber-400 font-bold"
                >
                  Create Manager
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: RESET PASSWORD */}
      {resetPwdModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2 flex items-center">
              <Key className="w-5 h-5 mr-2 text-amber-400" />
              Reset Password
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Set a new secure password for <strong>{resetPwdModal.manager?.email}</strong>.
            </p>
            <form onSubmit={handleResetPassword} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">New Password (min 8 chars)</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={resetPwdModal.newPassword}
                  onChange={(e) => setResetPwdModal({ ...resetPwdModal, newPassword: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetPwdModal({ open: false, manager: null, newPassword: '' })}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 text-slate-950 rounded-lg hover:bg-amber-400 font-bold"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: REASSIGN BRANCHES */}
      {branchAssignModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2 flex items-center">
              <GitFork className="w-5 h-5 mr-2 text-amber-400" />
              Edit Branch Permissions
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Select which branches <strong>{branchAssignModal.manager?.name}</strong> can access:
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto bg-slate-800/60 p-3 rounded-xl border border-slate-700 mb-4 text-xs">
              {branches.map((br) => (
                <label key={br.id} className="flex items-center space-x-2 text-slate-200 cursor-pointer p-1.5 hover:bg-slate-700/40 rounded">
                  <input
                    type="checkbox"
                    checked={branchAssignModal.selectedBranchIds.includes(br.id)}
                    onChange={(e) => {
                      const updated = e.target.checked
                        ? [...branchAssignModal.selectedBranchIds, br.id]
                        : branchAssignModal.selectedBranchIds.filter((id) => id !== br.id);
                      setBranchAssignModal({ ...branchAssignModal, selectedBranchIds: updated });
                    }}
                    className="rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-0"
                  />
                  <div className="font-semibold">{br.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono">({br.code})</div>
                </label>
              ))}
            </div>
            <div className="flex justify-end space-x-2 text-xs">
              <button
                type="button"
                onClick={() => setBranchAssignModal({ open: false, manager: null, selectedBranchIds: [] })}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveBranchAssignment}
                className="px-4 py-2 bg-amber-500 text-slate-950 rounded-lg hover:bg-amber-400 font-bold"
              >
                Save Permissions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: CREATE BRANCH */}
      {showCreateBranchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center">
                <GitFork className="w-5 h-5 mr-2 text-amber-400" />
                Add New Hotel Branch
              </h3>
              <button onClick={() => setShowCreateBranchModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateBranch} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Branch Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Madurai Meenakshi"
                  value={branchForm.name}
                  onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Unique Branch Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SB-MDU"
                  value={branchForm.code}
                  onChange={(e) => setBranchForm({ ...branchForm, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Address / Location</label>
                <input
                  type="text"
                  placeholder="West Tower St, Madurai"
                  value={branchForm.address}
                  onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Hotel Business</label>
                <select
                  value={branchForm.businessId}
                  onChange={(e) => setBranchForm({ ...branchForm, businessId: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-amber-500"
                >
                  {businesses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateBranchModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 text-slate-950 rounded-lg hover:bg-amber-400 font-bold"
                >
                  Create Branch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
