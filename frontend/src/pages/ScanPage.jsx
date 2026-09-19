import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { request } from "@/utils/request";
import { API_ENDPOINTS } from "@/utils/endpoints";
import {
  QrCode,
  ArrowRightLeft,
  ShieldCheck,
  Eye,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Loader2,
  Search,
} from "lucide-react";
import { HandoverModal } from "@/components/orders/HandoverModal";
import { QCModal } from "@/components/orders/QCModal";
import { playSuccessSound, playErrorSound } from "@/utils/audio";
import toast from "react-hot-toast";

export const ScanPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialCode = searchParams.get("code") || "";

  const [inputCode, setInputCode] = useState(initialCode);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const [isHandoverOpen, setIsHandoverOpen] = useState(false);
  const [isQcOpen, setIsQcOpen] = useState(false);

  useEffect(() => {
    if (initialCode) {
      handleLookup(initialCode);
    }
  }, [initialCode]);

  const handleLookup = async (codeToLookup) => {
    const code = (codeToLookup || inputCode).trim();
    if (!code) {
      toast.error("Masukkan atau scan kode barcode");
      return;
    }

    setLoading(true);
    setNotFound(false);
    setOrder(null);
    try {
      const res = await request.get(API_ENDPOINTS.ORDERS.SCAN(code));
      if (res.success && res.data) {
        playSuccessSound();
        setOrder(res.data);
      }
    } catch (err) {
      playErrorSound();
      setNotFound(true);
      toast.error(err.message || "Pesanan tidak ditemukan");
    } finally {
      setLoading(false);
    }
  };

  const getStageBadge = (stage) => {
    const badges = {
      cutting: "bg-amber-50 text-amber-700 border-amber-200",
      sewing: "bg-emerald-50 text-emerald-700 border-emerald-200",
      finishing: "bg-cyan-50 text-cyan-700 border-cyan-200",
      qc: "bg-rose-50 text-rose-700 border-rose-200",
      packing: "bg-indigo-50 text-indigo-700 border-indigo-200",
      delivered: "bg-purple-50 text-purple-700 border-purple-200",
    };
    return badges[stage] || "bg-slate-100 text-slate-700 border-slate-200";
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 mb-3 shadow-2xs">
          <QrCode className="w-7 h-7" />
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          Scan & Pencarian Cepat SPK
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Pindai barcode atau ketik nomor SPK untuk memproses serah terima dan inspeksi di lantai pabrik
        </p>
      </div>

      {/* Input Code Form */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleLookup();
          }}
          className="flex gap-2"
        >
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              placeholder="Ketik atau scan barcode (e.g. ORD-2026-0001)"
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm font-mono placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm shadow-xs flex items-center space-x-2 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Cari</span>}
          </button>
        </form>
      </div>

      {/* Lookup Result Card: Clean White Card */}
      {order && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-mono text-xl sm:text-2xl font-black text-slate-900">
                {order.order_number}
              </span>
              <p className="text-xs text-slate-500 mt-0.5">Klien: {order.customer_name}</p>
            </div>
            <span
              className={`px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wider border ${getStageBadge(
                order.current_stage
              )}`}
            >
              {order.current_stage}
            </span>
          </div>

          {order.pending_handover && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>
                Pesanan ini sudah discan/dikirim ({order.pending_handover.handover_code}) ke stasiun {order.pending_handover.to_stage.toUpperCase()} dan saat ini berstatus DI PERJALANAN (Menunggu Konfirmasi).
              </span>
            </div>
          )}

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-xs text-slate-400 font-semibold">Produk:</span>
              <p className="font-bold text-slate-900 mt-0.5">{order.product_name}</p>
            </div>
            <div>
              <span className="text-xs text-slate-400 font-semibold">Target Qty:</span>
              <p className="font-bold text-slate-900 mt-0.5">{order.target_qty} PCS</p>
            </div>
            <div>
              <span className="text-xs text-slate-400 font-semibold">Kode Seri:</span>
              <p className="font-bold text-indigo-700 mt-0.5">{order.serial_number || "-"}</p>
            </div>
            <div>
              <span className="text-xs text-slate-400 font-semibold">Calon Penjahit:</span>
              <p className="font-bold text-slate-900 mt-0.5">{order.tailor_name || "-"}</p>
            </div>
            <div>
              <span className="text-xs text-slate-400 font-semibold">Status Pesanan:</span>
              <p className="font-bold text-emerald-600 capitalize mt-0.5">{order.status}</p>
            </div>
            <div>
              <span className="text-xs text-slate-400 font-semibold">Batas Waktu:</span>
              <p className="font-bold text-slate-800 mt-0.5">
                {order.deadline ? new Date(order.deadline).toLocaleDateString("id-ID") : "-"}
              </p>
            </div>
          </div>

          {/* Quick Action Buttons for Shop Floor */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
            <button
              onClick={() => setIsHandoverOpen(true)}
              className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center space-x-2 transition-all active:scale-95"
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>Kirim Handover</span>
            </button>

            <button
              onClick={() => setIsQcOpen(true)}
              className="py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center space-x-2 transition-all active:scale-95"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Input QC</span>
            </button>

            <button
              onClick={() => navigate(`/orders/${order.id}`)}
              className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all"
            >
              <Eye className="w-4 h-4 text-slate-500" />
              <span>Lihat Timeline</span>
            </button>
          </div>
        </div>
      )}

      {notFound && (
        <div className="p-8 rounded-2xl bg-white border border-slate-200 text-center shadow-2xs">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
          <h4 className="text-base font-bold text-slate-900">Pesanan Tidak Ditemukan</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Barcode atau nomor SPK "{inputCode}" tidak cocok dengan data apapun. Periksa kembali ejaan
            atau nomor cetak tag.
          </p>
        </div>
      )}

      {/* Modals */}
      <HandoverModal
        isOpen={isHandoverOpen}
        onClose={() => setIsHandoverOpen(false)}
        onSuccess={() => handleLookup(order.order_number)}
        initialOrder={order}
      />
      <QCModal
        isOpen={isQcOpen}
        onClose={() => setIsQcOpen(false)}
        onSuccess={() => handleLookup(order.order_number)}
        initialOrder={order}
      />
    </div>
  );
};
