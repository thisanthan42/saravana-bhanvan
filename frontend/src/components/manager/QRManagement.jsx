import React, { useState, useEffect, useRef } from 'react';
import {
  fetchManagerQRs,
  generateManagerQR,
  toggleQRStatus,
  fetchBranches,
  managerLogout,
  managerStorage,
} from '../../services/managerService';
import QRCode from 'qrcode';
import {
  QrCode,
  Plus,
  Printer,
  Download,
  Copy,
  Check,
  Shield,
  LogOut,
  Sparkles,
  Utensils,
  Table as TableIcon,
  X,
  Loader2,
  RefreshCw,
  ExternalLink,
  Power,
  Layers,
} from 'lucide-react';

export default function QRManagement({ onNavigateToDashboard, onLogout }) {
  const manager = managerStorage.getManager();
  const [qrList, setQrList] = useState([]);
  const [branches, setBranches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterActive, setFilterActive] = useState('all');
  const [filterBranchId, setFilterBranchId] = useState('all');
  const [copiedToken, setCopiedToken] = useState(null);

  // Modals state
  const [showGenModal, setShowGenModal] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState('1');
  const [tableNumberInput, setTableNumberInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState('');

  // Standee Print Modal & Public Domain Config
  const [standeeQR, setStandeeQR] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [customDomain, setCustomDomain] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return '';
  });
  const [showDomainConfig, setShowDomainConfig] = useState(false);
  const printRef = useRef(null);

  // Load QRs and Branches
  const loadQRs = async () => {
    setIsLoading(true);
    try {
      const [qrsRes, branchRes] = await Promise.all([
        fetchManagerQRs({ branchId: filterBranchId, active: filterActive }),
        fetchBranches().catch(() => ({ data: [] })),
      ]);

      if (qrsRes?.success) {
        setQrList(qrsRes.data || []);
      }
      if (branchRes?.success && branchRes.data) {
        setBranches(branchRes.data);
        if (branchRes.data.length === 1) {
          setSelectedBranchId(String(branchRes.data[0].id));
          setFilterBranchId(String(branchRes.data[0].id));
        }
      }
    } catch (err) {
      console.error('Failed to load QRs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadQRs();
  }, [filterActive, filterBranchId]);

  // Handle Token Copy
  const handleCopy = (url, id) => {
    navigator.clipboard.writeText(url);
    setCopiedToken(id);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  // Toggle Active/Inactive
  const handleToggle = async (qr) => {
    try {
      const res = await toggleQRStatus(qr.id, !qr.active);
      if (res?.success) {
        setQrList((prev) =>
          prev.map((item) => (item.id === qr.id ? { ...item, active: !item.active } : item))
        );
      }
    } catch (err) {
      alert(err.message || 'Failed to update QR status');
    }
  };

  // Generate New QR
  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!tableNumberInput.trim()) {
      setGenError('Please enter a table number.');
      return;
    }

    setIsGenerating(true);
    setGenError('');

    try {
      const res = await generateManagerQR({
        branchId: Number(selectedBranchId) || 1,
        tableNumber: tableNumberInput.trim(),
      });

      if (res?.success) {
        setShowGenModal(false);
        setTableNumberInput('');
        await loadQRs();
        // Automatically open standee view for newly created QR
        openStandee(res.data);
      } else {
        setGenError(res?.message || 'Failed to generate QR code.');
      }
    } catch (err) {
      setGenError(err.message || 'Failed to generate QR code.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Derive canonical public URL for any QR
  const getEffectiveQRUrl = (qr, overrideDomain = null) => {
    if (!qr) return '';
    const cleanToken = qr.public_token || '';
    const activeDomain = overrideDomain !== null ? overrideDomain : customDomain;

    if (activeDomain && activeDomain.trim()) {
      return `${activeDomain.trim().replace(/\/+$/, '')}/q/${cleanToken}`;
    }

    if (qr.public_url) {
      let url = qr.public_url.replace(/\/\?token=/, '/q/');
      // If backend gave localhost but the manager is on a LAN IP or live domain, adapt to current origin
      if (url.includes('localhost') && typeof window !== 'undefined' && !window.location.hostname.includes('localhost')) {
        return `${window.location.origin}/q/${cleanToken}`;
      }
      return url;
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    return `${origin}/q/${cleanToken}`;
  };

  // Open Standee Preview & Render QR Canvas
  const openStandee = async (qr, overrideDomain = null) => {
    setStandeeQR(qr);
    try {
      const targetUrl = getEffectiveQRUrl(qr, overrideDomain);
      // High-contrast render with level H error correction and 4-module quiet zone
      const url = await QRCode.toDataURL(targetUrl, {
        width: 480,
        margin: 4,
        errorCorrectionLevel: 'H',
        color: {
          dark: '#1C1917',
          light: '#FFFFFF',
        },
      });
      setQrDataUrl(url);
    } catch (err) {
      console.error('Failed to generate QR code data URL:', err);
    }
  };

  // Download High-Resolution 1024x1024 PNG for physical printing
  const handleDownloadPNG = async () => {
    if (!standeeQR) return;
    try {
      const targetUrl = getEffectiveQRUrl(standeeQR);
      const highResDataUrl = await QRCode.toDataURL(targetUrl, {
        width: 1024,
        margin: 4,
        errorCorrectionLevel: 'H',
        color: {
          dark: '#1C1917',
          light: '#FFFFFF',
        },
      });
      const a = document.createElement('a');
      a.href = highResDataUrl;
      a.download = `Saravana_Bhavan_Table_${standeeQR.table_number}_QR_1024px.png`;
      a.click();
    } catch (err) {
      console.error('Failed to generate high-res PNG for download:', err);
    }
  };

  // Download Resolution-Independent Vector SVG for signage & professional print shops
  const handleDownloadSVG = async () => {
    if (!standeeQR) return;
    try {
      const targetUrl = getEffectiveQRUrl(standeeQR);
      const svgString = await QRCode.toString(targetUrl, {
        type: 'svg',
        margin: 4,
        errorCorrectionLevel: 'H',
        color: {
          dark: '#1C1917',
          light: '#FFFFFF',
        },
      });
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `Saravana_Bhavan_Table_${standeeQR.table_number}_QR_vector.svg`;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Failed to generate vector SVG for download:', err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col font-sans text-stone-900">
      {/* Print-Only CSS Stylesheet */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-standee, #printable-standee * {
            visibility: visible;
          }
          #printable-standee {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20px;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>

      {/* Top Header */}
      <header className="bg-white border-b border-amber-200/70 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-800 to-amber-600 text-white flex items-center justify-center shadow-sm">
              <QrCode className="w-5 h-5 text-amber-100" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold font-serif text-stone-900 leading-tight">
                Saravana Bhavan
              </h1>
              <p className="text-[11px] font-semibold text-amber-800 uppercase tracking-widest">
                QR Code Management
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Switch to Feedback Dashboard */}
            <button
              type="button"
              onClick={onNavigateToDashboard}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-colors cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Feedback Dashboard</span>
            </button>

            <button
              onClick={async () => {
                await managerLogout();
                onLogout();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-1 space-y-6">
        {/* Actions & Filters Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-amber-200/60 shadow-xs">
          <div>
            <h2 className="text-lg font-bold text-stone-900 font-serif">
              Table QR Code Directory
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Generate, print, and manage unique table QR codes with tamper-proof token security.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Filter by Branch */}
            {branches.length > 1 ? (
              <div className="flex items-center gap-1.5 bg-white border border-stone-200 rounded-xl px-2.5 py-1.5 text-xs shadow-2xs">
                <span className="font-semibold text-stone-500">Branch:</span>
                <select
                  value={filterBranchId}
                  onChange={(e) => setFilterBranchId(e.target.value)}
                  className="font-bold text-stone-800 bg-transparent focus:outline-none cursor-pointer"
                >
                  <option value="all">All Branches</option>
                  {branches.map((b) => (
                    <option key={b.id} value={String(b.id)}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : branches.length === 1 ? (
              <div className="inline-flex items-center gap-1 bg-stone-100 border border-stone-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-stone-700">
                <span>{branches[0].name}</span>
              </div>
            ) : null}

            {/* Filter by Status */}
            <div className="flex items-center bg-stone-100 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setFilterActive('all')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  filterActive === 'all' ? 'bg-white shadow-xs text-amber-900 font-bold' : 'text-stone-600'
                }`}
              >
                All ({qrList.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterActive('true')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  filterActive === 'true' ? 'bg-white shadow-xs text-emerald-800 font-bold' : 'text-stone-600'
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setFilterActive('false')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  filterActive === 'false' ? 'bg-white shadow-xs text-rose-800 font-bold' : 'text-stone-600'
                }`}
              >
                Inactive
              </button>
            </div>

            {/* Refresh */}
            <button
              type="button"
              onClick={loadQRs}
              className="p-2.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-600 transition-colors cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            {/* Generate New QR Button */}
            <button
              type="button"
              onClick={() => setShowGenModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-amber-700 to-amber-900 hover:from-amber-800 hover:to-amber-950 rounded-xl shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Generate Table QR</span>
            </button>
          </div>
        </div>

        {/* QR Code Cards Grid */}
        {isLoading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-amber-700 animate-spin" />
            <p className="text-sm font-semibold text-stone-600">Loading QR code directory...</p>
          </div>
        ) : qrList.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 shadow-xs space-y-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <QrCode className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-stone-800">No QR codes found</h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              Click the "Generate Table QR" button above to create your first dining table QR code.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {qrList.map((qr) => (
              <div
                key={qr.id}
                className={`bg-white rounded-3xl p-5 border transition-all shadow-xs flex flex-col justify-between ${
                  qr.active ? 'border-amber-200/80 hover:shadow-md' : 'border-stone-200 opacity-75 bg-stone-50/50'
                }`}
              >
                <div>
                  {/* Top Bar: Table Number & Active Badge */}
                  <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-xs">
                        <TableIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-stone-900">
                          Table {qr.table_number}
                        </h3>
                        <p className="text-[11px] text-stone-500 font-medium">
                          {qr.branch_name || 'Saravana Bhavan'}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        qr.active
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          qr.active ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                        }`}
                      />
                      {qr.active ? 'Active' : 'Deactivated'}
                    </span>
                  </div>

                  {/* Token & URL Details */}
                  <div className="mt-3.5 space-y-2 text-xs">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                        Opaque Public Token
                      </span>
                      <code className="font-mono text-[11px] text-amber-900 bg-amber-50/80 px-2 py-0.5 rounded border border-amber-200/60 block truncate mt-0.5">
                        {qr.public_token}
                      </code>
                    </div>

                    <div className="flex items-center justify-between text-stone-500 text-[11px] pt-1">
                      <span>Total Customer Scans:</span>
                      <span className="font-bold text-stone-800">{qr.scan_count || 0} scans</span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-5 pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {/* Copy Link */}
                    <button
                      type="button"
                      onClick={() => handleCopy(getEffectiveQRUrl(qr), qr.id)}
                      className="p-2 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-600 transition-colors cursor-pointer"
                      title="Copy Public Feedback URL"
                    >
                      {copiedToken === qr.id ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>

                    {/* Toggle Status */}
                    <button
                      type="button"
                      onClick={() => handleToggle(qr)}
                      className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                        qr.active
                          ? 'border-rose-200 text-rose-700 hover:bg-rose-50'
                          : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                      }`}
                      title={qr.active ? 'Deactivate QR' : 'Reactivate QR'}
                    >
                      <Power className="w-4 h-4" />
                    </button>
                  </div>

                  {/* View / Print Standee */}
                  <button
                    type="button"
                    onClick={() => openStandee(qr)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 rounded-xl transition-all cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>View & Print</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* MODAL 1: Generate New QR Code */}
      {showGenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-fade-in">
          <div
            className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-stone-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-stone-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold font-serif text-stone-900">
                  Generate Table QR Code
                </h3>
                <p className="text-xs text-stone-500">
                  Creates an unpredictable, tamper-proof QR code.
                </p>
              </div>
              <button
                onClick={() => setShowGenModal(false)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleGenerate} className="p-5 space-y-4">
              {genError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                  {genError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                  Branch
                </label>
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                >
                  {branches.length > 0 ? (
                    branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))
                  ) : (
                    <option value="1">Chennai Central (SB-CENTRAL)</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                  Table Number <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 14, 15, or Counter 1"
                  value={tableNumberInput}
                  onChange={(e) => setTableNumberInput(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
                <p className="text-[11px] text-stone-500 mt-1">
                  The table number will be bound on the server and will NOT be shown to customers.
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowGenModal(false)}
                  className="px-4 py-2 text-xs font-bold text-stone-600 hover:bg-stone-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="px-5 py-2 text-xs font-bold text-white bg-amber-800 hover:bg-amber-900 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Generate QR</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Branded Table Standee & Print View */}
      {standeeQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-fade-in">
          <div
            className="bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[95vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50">
              <span className="text-xs font-bold text-stone-700">
                Table {standeeQR.table_number} Standee Card
              </span>
              <button
                onClick={() => setStandeeQR(null)}
                className="w-7 h-7 rounded-full bg-white hover:bg-stone-200 flex items-center justify-center text-stone-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Standee Printable Card */}
            <div className="p-6 overflow-y-auto flex flex-col items-center">
              <div
                id="printable-standee"
                ref={printRef}
                className="w-full max-w-[320px] bg-white rounded-3xl p-6 border-2 border-amber-300 text-center shadow-lg relative overflow-hidden space-y-4"
              >
                {/* Brand Header */}
                <div className="space-y-1">
                  <div className="w-10 h-10 mx-auto rounded-xl bg-gradient-to-br from-amber-700 to-amber-900 text-white flex items-center justify-center shadow-sm">
                    <Utensils className="w-5 h-5 text-amber-100" />
                  </div>
                  <h2 className="text-lg font-bold font-serif text-stone-900 pt-1">
                    Saravana Bhavan
                  </h2>
                  <p className="text-[10px] uppercase tracking-widest text-amber-800 font-semibold">
                    Hotel & Restaurant
                  </p>
                </div>

                {/* Table Indicator for physical card placement */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold">
                  <TableIcon className="w-3.5 h-3.5 text-amber-700" />
                  <span>Table {standeeQR.table_number}</span>
                </div>

                {/* Rendered QR Code Image */}
                <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 flex items-center justify-center shadow-inner">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt={`Table ${standeeQR.table_number} QR`}
                      className="w-48 h-48 object-contain rounded-xl"
                    />
                  ) : (
                    <div className="w-48 h-48 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-amber-700" />
                    </div>
                  )}
                </div>

                {/* Hospitality Call to Action */}
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-stone-900 font-serif">
                    Scan to Share Your Feedback
                  </h4>
                  <p className="text-[11px] text-stone-600 italic">
                    “Your experience matters to us.”
                  </p>
                </div>
              </div>

              {/* Encoded URL Inspector & Public Host Override */}
              <div className="w-full max-w-[320px] mt-3 p-3 bg-stone-50 rounded-2xl border border-stone-200 text-left space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-stone-600">Encoded QR URL:</span>
                  <button
                    type="button"
                    onClick={() => setShowDomainConfig((prev) => !prev)}
                    className="text-amber-800 font-bold hover:underline cursor-pointer"
                  >
                    {showDomainConfig ? 'Done' : 'Change Domain / LAN IP'}
                  </button>
                </div>

                {showDomainConfig && (
                  <div className="pt-1 pb-1">
                    <label className="text-[10px] text-stone-500 font-semibold block mb-0.5">
                      Public Host (e.g. https://your-domain.com or http://192.168.1.50:3000):
                    </label>
                    <input
                      type="text"
                      value={customDomain}
                      onChange={(e) => {
                        setCustomDomain(e.target.value);
                        openStandee(standeeQR, e.target.value);
                      }}
                      placeholder="https://your-domain.com"
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                )}

                <div className="flex items-center gap-1">
                  <code className="text-[10px] font-mono text-amber-900 bg-white px-2 py-1 rounded border border-amber-200/80 flex-1 truncate">
                    {getEffectiveQRUrl(standeeQR)}
                  </code>
                  <button
                    type="button"
                    onClick={() => handleCopy(getEffectiveQRUrl(standeeQR), 'standee_url')}
                    className="px-2 py-1 bg-white border border-stone-200 hover:bg-stone-100 rounded text-[10px] font-bold text-stone-700"
                    title="Copy URL"
                  >
                    {copiedToken === 'standee_url' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-stone-100 bg-stone-50 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleDownloadPNG}
                className="flex-1 min-w-[100px] inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-stone-700 bg-white border border-stone-300 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer"
                title="Download 1024x1024 High Resolution PNG"
              >
                <Download className="w-3.5 h-3.5 text-amber-700" />
                <span>Save PNG (1024px)</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadSVG}
                className="flex-1 min-w-[100px] inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-stone-700 bg-white border border-stone-300 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer"
                title="Download Vector SVG for Signage"
              >
                <Download className="w-3.5 h-3.5 text-amber-700" />
                <span>Save SVG (Vector)</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-amber-800 hover:bg-amber-900 rounded-xl transition-colors shadow-sm cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Standee</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
