import React, { useState, useEffect } from "react";
import { request } from "@/utils/request";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  Layers,
  Clock,
  CheckCircle,
  Truck,
  ArrowRight,
  QrCode,
  ShieldAlert,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Spinner } from "@/components/common/LoadingSkeleton";
import { PICSPXDashboard } from "@/components/pic/PICSPXDashboard";

export const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [pipeline, setPipeline] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPicMode, setShowPicMode] = useState(false);

  const isPicRole = ["cutting", "sewing", "finishing", "qc", "packing"].includes(user?.role);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, pipeRes, logsRes] = await Promise.all([
        request.get(API_ENDPOINTS.DASHBOARD.STATS),
        request.get(API_ENDPOINTS.DASHBOARD.PIPELINE),
        request.get(API_ENDPOINTS.DASHBOARD.RECENT_ACTIVITIES),
      ]);
      if (statsRes.success) setStats(statsRes.data);
      if (pipeRes.success) setPipeline(pipeRes.data);
      if (logsRes.success) setRecentLogs(logsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isPicRole) {
      fetchDashboardData();
    }
  }, [isPicRole]);

  // Jika user adalah PIC murni atau sedang dalam mode pratinjau PIC
  if (isPicRole || showPicMode) {
    return (
      <div>
        {!isPicRole && (
          <div className="mb-3 p-3 bg-amber-100 border border-amber-300 rounded-xl flex items-center justify-between text-xs text-amber-900 font-bold">
            <span>Mode Pratinjau Tampilan PIC Lapangan (SPX Express)</span>
            <button
              onClick={() => setShowPicMode(false)}
              className="px-3 py-1 bg-amber-800 text-white rounded-lg hover:bg-amber-900 cursor-pointer transition-colors"
            >
              Kembali ke Dashboard Admin
            </button>
          </div>
        )}
        <PICSPXDashboard />
      </div>
    );
  }

  if (loading) return <Spinner size="lg" text="Memuat dashboard produksi..." />;

  const getStageBadgeColor = (stage) => {
    const colors = {
      cutting: "bg-amber-50 text-amber-700 border-amber-200",
      sewing: "bg-emerald-50 text-emerald-700 border-emerald-200",
      finishing: "bg-cyan-50 text-cyan-700 border-cyan-200",
      qc: "bg-rose-50 text-rose-700 border-rose-200",
      packing: "bg-indigo-50 text-indigo-700 border-indigo-200",
      delivered: "bg-purple-50 text-purple-700 border-purple-200",
    };
    return colors[stage] || "bg-slate-50 text-slate-700 border-slate-200";
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner: Clean White with subtle border, no gradients */}
      <div className="p-6 sm:p-7 rounded-2xl bg-white border border-slate-200 shadow-2xs">
        <div className="max-w-2xl">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Alur Produksi Realtime</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Halo, {user?.name}!
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 leading-relaxed">
            Monitor dan lacak seluruh tahapan potong, jahit, serah terima transit, hingga inspeksi QC
            dengan pemindaian barcode ekspedisi.
          </p>

          <div className="mt-5 flex flex-wrap gap-2.5">
            <button
              onClick={() => navigate("/scan")}
              className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-all active:scale-95"
            >
              <QrCode className="w-4 h-4" />
              <span>Buka Kamera Scan QR</span>
            </button>
            <button
              onClick={() => navigate("/handovers")}
              className="flex items-center space-x-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold transition-all"
            >
              <Truck className="w-4 h-4 text-emerald-600" />
              <span>Periksa Serah Terima Masuk</span>
            </button>
            <button
              onClick={() => setShowPicMode(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 rounded-xl text-xs sm:text-sm font-semibold transition-all"
            >
              <Truck className="w-4 h-4 text-[#EE4D2D]" />
              <span>Pratinjau Mode PIC (SPX)</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards: Clean White Cards with crisp borders & colored icon accents */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Order SPK</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{stats?.totalOrders || 0}</p>
          <p className="text-[11px] text-slate-400 mt-1">Seluruh batch produksi</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Dalam Produksi</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{stats?.inProgressOrders || 0}</p>
          <p className="text-[11px] text-amber-600 font-medium mt-1">Sedang dikerjakan di pos</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Sedang Transit</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Truck className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{stats?.activeHandovers || 0}</p>
          <p className="text-[11px] text-emerald-600 font-medium mt-1">Menunggu konfirmasi terima</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">QC Lolos vs Reject</span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {stats?.totalPassedQc || 0} <span className="text-xs text-slate-400 font-normal">/ {stats?.totalRejectQc || 0}</span>
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Rework: <span className="text-amber-600 font-bold">{stats?.totalReworkQc || 0} pcs</span>
          </p>
        </div>
      </div>

      {/* Production Pipeline: Clean White Card */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Pipeline Antrian Produksi</h2>
            <p className="text-xs text-slate-500">Sebaran kuantitas dan jumlah order pada tiap tahapan</p>
          </div>
          <button
            onClick={() => navigate("/orders")}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center space-x-1"
          >
            <span>Lihat Semua</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {pipeline.map((item) => (
            <div
              key={item.stage}
              className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${getStageBadgeColor(item.stage)}`}>
                  {item.label}
                </span>
              </div>
              <div className="mt-3">
                <div className="text-xl font-black text-slate-900">{item.totalQty} <span className="text-[11px] font-normal text-slate-500">pcs</span></div>
                <div className="text-[11px] text-slate-500 font-medium">{item.count} SPK aktif</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Production Activities: Clean White Card */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-900">Aktivitas & Log Perpindahan Terkini</h2>
          <span className="text-xs text-slate-400 font-medium">Live Audit Trail</span>
        </div>

        <div className="divide-y divide-slate-100">
          {recentLogs.map((log) => (
            <div key={log.id} className="py-3 sm:py-3.5 flex items-start space-x-3 text-sm">
              <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 text-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Truck className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                    <span className="font-mono text-indigo-600 mr-1.5">{log.order_number}</span>
                    {log.description}
                  </p>
                  <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">
                    {new Date(log.created_at).toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  PIC: <span className="text-slate-700 font-semibold">{log.actor_name}</span> | Tahap:{" "}
                  <span className="uppercase text-indigo-600 font-bold">{log.stage}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
