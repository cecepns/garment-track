import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { request } from "@/utils/request";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { playSuccessSound, playErrorSound, warmAudio } from "@/utils/audio";
import {
  QrCode,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  LogOut,
  CheckCircle2,
  CheckCheck,
  Clock,
  Truck,
  Box,
  ShieldCheck,
  ChevronRight,
  Layers,
  Sparkles,
  AlertCircle,
  Search,
} from "lucide-react";
import { QRScannerModal } from "@/components/qr/QRScannerModal";
import { QuickReceiveModal } from "@/components/pic/QuickReceiveModal";
import { QuickDispatchModal } from "@/components/pic/QuickDispatchModal";
import { QCModal } from "@/components/orders/QCModal";
import toast from "react-hot-toast";

const ROLE_DISPLAY_TITLES = {
  cutting: "Stasiun Potong (Cutting)",
  sewing: "Stasiun Jahit (Sewing)",
  finishing: "Stasiun Finishing",
  qc: "Stasiun Quality Control (QC)",
  packing: "Stasiun Kemas & Kirim",
  admin: "Mode PIC (Admin)",
  owner: "Mode PIC (Owner)",
};

export const PICSPXDashboard = () => {
  const { user, logout } = useAuth();
  const currentRole = user?.role || "sewing";

  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals state
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerPurpose, setScannerPurpose] = useState("inbound"); // 'inbound' or 'outbound'

  const [selectedHandoverToReceive, setSelectedHandoverToReceive] = useState(null);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);

  const [selectedOrderToDispatch, setSelectedOrderToDispatch] = useState(null);
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);

  const [isQcModalOpen, setIsQcModalOpen] = useState(false);
  const [selectedOrderForQc, setSelectedOrderForQc] = useState(null);

  // Active view filter: 'all', 'inbound', 'outbound'
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      const res = await request.get(API_ENDPOINTS.PIC.SUMMARY);
      if (res.success && res.data) {
        setSummaryData(res.data);
      }
    } catch (err) {
      console.error("Failed to load PIC summary:", err);
      toast.error("Gagal memuat data stasiun");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchSummary();
  };

  // Terima Langsung 1-Klik tanpa perlu scan ulang kamera (Sesuai Revisi Klien)
  const handleDirectReceive = async (handover) => {
    warmAudio();
    try {
      const res = await request.put(API_ENDPOINTS.HANDOVERS.RECEIVE(handover.id), {
        qty_received: handover.qty_sent,
        discrepancy_reason: "",
      });
      if (res.success) {
        playSuccessSound();
        toast.success(`Berhasil menerima ${handover.qty_sent} pcs (${handover.order_number})!`);
        fetchSummary();
      }
    } catch (err) {
      playErrorSound();
      toast.error(err.message || "Gagal menerima barang");
    }
  };

  // Terima Semua Antrean Barang Masuk 1-Klik
  const handleReceiveAll = async () => {
    warmAudio();
    if (!window.confirm(`Konfirmasi menerima seluruh ${incomingList.length} antrean barang masuk sekarang?`)) {
      return;
    }
    try {
      const res = await request.post(API_ENDPOINTS.HANDOVERS.RECEIVE_ALL, {});
      if (res.success) {
        playSuccessSound();
        toast.success(res.message || "Semua barang masuk berhasil diterima!");
        fetchSummary();
      }
    } catch (err) {
      playErrorSound();
      toast.error(err.message || "Gagal menerima semua antrean");
    }
  };

  // When QR code is scanned for Drop-off / Dispatch:
  // Cek duplikasi, putar suara sesuai kondisi (scan.mp3 vs failed.mp3)
  const handleScanSuccess = async (code) => {
    warmAudio();
    setIsScannerOpen(false);
    const cleanCode = code.trim().toUpperCase();

    // 1. Cek apakah kode cocok dengan serah terima masuk (Inbound)
    const matchedIncoming = summaryData?.incomingHandovers?.find(
      (h) => h.handover_code.toUpperCase() === cleanCode || h.order_number.toUpperCase() === cleanCode
    );

    if (matchedIncoming) {
      playSuccessSound();
      setSelectedHandoverToReceive(matchedIncoming);
      setIsReceiveModalOpen(true);
      return;
    }

    // 2. CEGAH DOUBLE SCAN: Cek apakah pesanan ini SUDAH PERNAH DIKIRIM dan sedang berstatus in_transit
    const alreadyInTransit = summaryData?.recentOutbounds?.find(
      (h) => h.order_number.toUpperCase() === cleanCode && h.status === "in_transit"
    );

    if (alreadyInTransit) {
      playErrorSound();
      toast.error(
        `Barcode ${cleanCode} SUDAH DISCAN & DIKIRIM sebelumnya! Saat ini berstatus DI PERJALANAN (menunggu diterima divisi ${alreadyInTransit.to_stage.toUpperCase()}). Tidak dapat discan ganda!`,
        { duration: 5500, icon: "⚠️" }
      );
      return;
    }

    // 3. Cek apakah kode cocok dengan tugas aktif di stasiun ini
    const matchedOrder = summaryData?.activeTasks?.find(
      (o) => o.order_number.toUpperCase() === cleanCode
    );

    if (matchedOrder) {
      playSuccessSound();
      if (currentRole === "qc") {
        setSelectedOrderForQc(matchedOrder);
        setIsQcModalOpen(true);
      } else {
        setSelectedOrderToDispatch(matchedOrder);
        setIsDispatchModalOpen(true);
      }
      return;
    }

    // 4. Fallback: Query server untuk detail pesanan
    try {
      const res = await request.get(API_ENDPOINTS.ORDERS.SCAN(cleanCode));
      if (res.success && res.data) {
        const scannedOrder = res.data;

        // Validasi jika server menyatakan ada serah terima pending
        if (scannedOrder.has_pending_handover && scannedOrder.pending_handover) {
          playErrorSound();
          toast.error(
            `Pesanan ${scannedOrder.order_number} SUDAH DISCAN sebelumnya (${scannedOrder.pending_handover.handover_code}) ke stasiun ${scannedOrder.pending_handover.to_stage.toUpperCase()} dan berstatus DI PERJALANAN! Tidak bisa discan ganda.`,
            { duration: 5500, icon: "⚠️" }
          );
          return;
        }

        if (scannedOrder.status === "completed" || scannedOrder.current_stage === "delivered") {
          playErrorSound();
          toast.error(`Pesanan ${scannedOrder.order_number} sudah selesai / terkirim ke klien!`);
          return;
        }

        playSuccessSound();
        if (scannerPurpose === "outbound" || currentRole === scannedOrder.current_stage) {
          if (currentRole === "qc") {
            setSelectedOrderForQc(scannedOrder);
            setIsQcModalOpen(true);
          } else {
            setSelectedOrderToDispatch(scannedOrder);
            setIsDispatchModalOpen(true);
          }
        } else {
          toast.success(`Pesanan ditemukan: ${scannedOrder.order_number}`);
          setSelectedOrderToDispatch(scannedOrder);
          setIsDispatchModalOpen(true);
        }
      }
    } catch (err) {
      playErrorSound();
      toast.error(`Barcode "${code}" tidak ditemukan pada daftar tugas`);
    }
  };

  const inboundCount = summaryData?.inboundCount || 0;
  const outboundCount = summaryData?.outboundCount || 0;
  const incomingList = summaryData?.incomingHandovers || [];
  const activeTaskList = summaryData?.activeTasks || [];
  const recentOutbounds = summaryData?.recentOutbounds || [];

  return (
    <div className="-mx-4 -mt-4 sm:-mx-6 sm:-mt-6 min-h-screen bg-slate-100 flex flex-col pb-28">
      {/* 1. TOP HEADER (SPX Express Orange-Red Theme) */}
      <div className="bg-gradient-to-b from-[#EE4D2D] to-[#E24A22] text-white pt-5 pb-8 px-5 sm:px-6 shadow-md">
        {/* User bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center text-white shadow-inner font-black text-lg">
              {user?.name?.charAt(0) || "P"}
            </div>
            <div>
              <h2 className="font-extrabold text-base sm:text-lg tracking-tight leading-tight">
                {user?.name || "PIC Lapangan"}
              </h2>
              <span className="inline-block mt-0.5 px-2.5 py-0.5 rounded-full bg-black/20 text-white/90 text-xs font-semibold">
                {ROLE_DISPLAY_TITLES[currentRole] || currentRole}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              title="Perbarui Data"
              className="p-2.5 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 text-white transition-all"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => {
                if (window.confirm("Apakah Anda yakin ingin keluar?")) {
                  logout();
                }
              }}
              title="Keluar Akun"
              className="p-2.5 rounded-full bg-white/15 hover:bg-rose-600 active:scale-95 text-white transition-all"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Big Dual KPI Counters (SPX Express Menuju Inbound & Menuju Outbound) */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          {/* Menuju Inbound */}
          <button
            onClick={() => setActiveTab("inbound")}
            className={`p-3.5 rounded-2xl text-left transition-all ${
              activeTab === "inbound"
                ? "bg-white text-[#EE4D2D] shadow-lg scale-102"
                : "bg-white/15 hover:bg-white/20 text-white"
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold tracking-wide mb-1 opacity-90">
              <span>Menuju Inbound</span>
              <ChevronRight className="w-4 h-4" />
            </div>
            <div className="text-3xl sm:text-4xl font-black">{inboundCount}</div>
            <span className="text-[11px] font-medium opacity-80 block mt-0.5">
              {currentRole === "cutting" ? "SPK Baru" : "Barang Masuk"}
            </span>
          </button>

          {/* Menuju Outbound */}
          <button
            onClick={() => setActiveTab("outbound")}
            className={`p-3.5 rounded-2xl text-left transition-all ${
              activeTab === "outbound"
                ? "bg-white text-[#EE4D2D] shadow-lg scale-102"
                : "bg-white/15 hover:bg-white/20 text-white"
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold tracking-wide mb-1 opacity-90">
              <span>Menuju Outbound</span>
              <ChevronRight className="w-4 h-4" />
            </div>
            <div className="text-3xl sm:text-4xl font-black">{outboundCount}</div>
            <span className="text-[11px] font-medium opacity-80 block mt-0.5">
              Siap Kirim Selesai
            </span>
          </button>
        </div>
      </div>

      {/* 2. OVERLAPPING WHITE CARD MENU CONTAINER */}
      <div className="-mt-4 flex-1 px-4 sm:px-6">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-5 sm:p-6 space-y-7">
          {/* A. INBOUND SECTION */}
          {(activeTab === "all" || activeTab === "inbound") && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center space-x-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <h3 className="text-base sm:text-lg font-black text-slate-800 tracking-tight">
                    Inbound (Barang Masuk)
                  </h3>
                </div>
                {inboundCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black">
                    {inboundCount} Antrean
                  </span>
                )}
              </div>

              {/* Inbound Quick Actions (Cukup scan dropoff, inbound konfirmasi 1-klik tanpa repot scan kamera) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* 1. Terima Semua Antrean 1-Klik */}
                <button
                  onClick={handleReceiveAll}
                  disabled={incomingList.length === 0}
                  className={`p-4 sm:p-5 rounded-2xl border-2 transition-all flex flex-col items-center text-center group ${
                    incomingList.length > 0
                      ? "bg-emerald-50 hover:bg-emerald-100/80 border-emerald-300 text-emerald-900 active:scale-97 cursor-pointer shadow-xs"
                      : "bg-slate-50 border-slate-200 text-slate-400 opacity-60 cursor-not-allowed"
                  }`}
                >
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-md mb-2.5 transition-transform ${
                      incomingList.length > 0
                        ? "bg-emerald-600 text-white group-hover:scale-105"
                        : "bg-slate-300 text-slate-500"
                    }`}
                  >
                    <CheckCheck className="w-8 h-8" />
                  </div>
                  <span className="text-base font-black text-slate-900 leading-tight">
                    Terima Semua
                  </span>
                  <span className="text-xs text-slate-500 font-semibold mt-1">
                    {incomingList.length > 0
                      ? `Konfirmasi Cepat (${incomingList.length} Antrean)`
                      : "Tidak Ada Antrean Masuk"}
                  </span>
                </button>

                {/* 2. Daftar Masuk */}
                <button
                  onClick={() => {
                    if (incomingList.length > 0) {
                      setSelectedHandoverToReceive(incomingList[0]);
                      setIsReceiveModalOpen(true);
                    } else {
                      toast("Belum ada barang masuk yang menunggu diterima", { icon: "ℹ️" });
                    }
                  }}
                  className="p-4 sm:p-5 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border-2 border-slate-200 text-slate-800 active:scale-97 transition-all flex flex-col items-center text-center group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-slate-700 text-white flex items-center justify-center shadow-md mb-2.5 group-hover:scale-105 transition-transform">
                    <Box className="w-7 h-7" />
                  </div>
                  <span className="text-base font-black text-slate-900 leading-tight">
                    Daftar Masuk
                  </span>
                  <span className="text-xs text-slate-500 font-semibold mt-1">
                    {incomingList.length} Menunggu Konfirmasi
                  </span>
                </button>
              </div>

              {/* List of Incoming Handovers if any */}
              {incomingList.length > 0 && (
                <div className="space-y-2.5 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                      Perlu Anda Terima Sekarang:
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Cukup klik "Terima", tidak perlu scan lagi
                    </span>
                  </div>
                  {incomingList.map((h) => (
                    <div
                      key={h.id}
                      className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-sm font-black text-slate-900">
                            {h.order_number}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-amber-200 text-amber-900 text-[10px] font-bold uppercase">
                            Dari: {h.from_stage}
                          </span>
                          {h.serial_number && (
                            <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-800 text-[10px] font-bold">
                              Seri: {h.serial_number}
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-semibold text-slate-700 mt-0.5">
                          {h.product_name}
                        </p>
                        <div className="flex items-center space-x-3 text-xs mt-1">
                          <span className="font-black text-amber-800">
                            Jumlah: {h.qty_sent} PCS
                          </span>
                          {h.tailor_name && (
                            <span className="text-slate-500 font-medium">
                              Penjahit: <strong className="text-slate-700">{h.tailor_name}</strong>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedHandoverToReceive(h);
                            setIsReceiveModalOpen(true);
                          }}
                          className="py-2.5 px-3 text-slate-500 hover:text-amber-800 font-bold text-xs hover:underline"
                        >
                          Ada Selisih?
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDirectReceive(h)}
                          className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs rounded-xl shadow-xs flex items-center space-x-1 transition-all"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Terima {h.qty_sent} pcs</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* B. OUTBOUND SECTION */}
          {(activeTab === "all" || activeTab === "outbound") && (
            <div className="space-y-3.5 pt-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center space-x-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                  <h3 className="text-base sm:text-lg font-black text-slate-800 tracking-tight">
                    Outbound (Kirim / Selesai)
                  </h3>
                </div>
                {outboundCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800 text-xs font-black">
                    {outboundCount} Siap Kirim
                  </span>
                )}
              </div>

              {/* Outbound Touch Buttons */}
              <div className="grid grid-cols-2 gap-3.5">
                {/* 1. Scan Kirim */}
                <button
                  onClick={() => {
                    setScannerPurpose("outbound");
                    setIsScannerOpen(true);
                  }}
                  className="p-4 sm:p-5 rounded-2xl bg-orange-50 hover:bg-orange-100/80 border-2 border-orange-200 text-orange-900 active:scale-97 transition-all flex flex-col items-center text-center group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-[#EE4D2D] text-white flex items-center justify-center shadow-md mb-2.5 group-hover:scale-105 transition-transform">
                    <Truck className="w-8 h-8" />
                  </div>
                  <span className="text-base font-black text-slate-900 leading-tight">
                    Scan Kirim
                  </span>
                  <span className="text-xs text-slate-500 font-semibold mt-1">
                    Serah Terima Lanjut
                  </span>
                </button>

                {/* 2. Cek Status Beres / Riwayat */}
                <button
                  onClick={() => setActiveTab("outbound")}
                  className="p-4 sm:p-5 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border-2 border-slate-200 text-slate-800 active:scale-97 transition-all flex flex-col items-center text-center group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md mb-2.5 group-hover:scale-105 transition-transform">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <span className="text-base font-black text-slate-900 leading-tight">
                    Sudah Beres?
                  </span>
                  <span className="text-xs text-slate-500 font-semibold mt-1">
                    Cek Status Penerimaan
                  </span>
                </button>
              </div>

              {/* Khusus PIC QC: Tombol Inspeksi QC */}
              {currentRole === "qc" && (
                <div className="pt-2">
                  <button
                    onClick={() => {
                      if (activeTaskList.length > 0) {
                        setSelectedOrderForQc(activeTaskList[0]);
                        setIsQcModalOpen(true);
                      } else {
                        setIsScannerOpen(true);
                      }
                    }}
                    className="w-full p-4 rounded-2xl bg-rose-50 hover:bg-rose-100 border-2 border-rose-200 text-rose-900 flex items-center justify-center space-x-3 active:scale-98 transition-all"
                  >
                    <ShieldCheck className="w-6 h-6 text-rose-600" />
                    <span className="text-base font-black">Input Inspeksi QC (Good/Reject/Rework)</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* C. STATUS PROSES: UDAH BERES ATAU BELUM (Client Core Requirement) */}
          <div className="pt-4 border-t border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm sm:text-base font-black text-slate-900 tracking-tight flex items-center space-x-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                <span>Status Tugas: Sudah Beres atau Belum?</span>
              </h4>
              <button
                onClick={() => setActiveTab(activeTab === "all" ? "outbound" : "all")}
                className="text-xs font-bold text-indigo-600 hover:underline"
              >
                {activeTab === "all" ? "Lihat Semua" : "Tampilkan Semuanya"}
              </button>
            </div>

            {/* Riwayat Outbound (Mengecek apakah sudah diterima divisi berikutnya atau masih in-transit) */}
            {recentOutbounds.length > 0 ? (
              <div className="space-y-3">
                {recentOutbounds.map((item) => {
                  const isReceived = item.status === "received";
                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-2xl border-2 transition-all ${
                        isReceived
                          ? "bg-emerald-50/50 border-emerald-200"
                          : "bg-amber-50/60 border-amber-200"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-base font-black text-slate-900">
                              {item.order_number}
                            </span>
                            <span className="text-xs text-slate-500 font-medium">
                              ({item.qty_sent} pcs)
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-slate-700 mt-0.5">
                            {item.product_name}
                          </p>
                          <span className="text-xs text-slate-500 font-medium mt-1 block">
                            Tujuan: <span className="font-bold text-slate-800 capitalize">{item.to_stage}</span>
                          </span>
                        </div>

                        {/* Clear Status Badge for Elderly Worker */}
                        <div className="text-right">
                          {isReceived ? (
                            <div className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-black shadow-2xs">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>SUDAH BERES</span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-amber-500 text-white text-xs font-black shadow-2xs">
                              <Clock className="w-3.5 h-3.5 animate-pulse" />
                              <span>DI PERJALANAN</span>
                            </div>
                          )}
                          <span className="text-[10px] text-slate-400 block mt-1">
                            {isReceived
                              ? `Diterima ${item.to_user_name || "Divisi Tujuan"}`
                              : "Menunggu Diterima"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* If no handovers sent yet, show active orders that worker can dispatch */
              <div className="space-y-3">
                {activeTaskList.map((order) => (
                  <div
                    key={order.id}
                    className="p-4 rounded-2xl bg-slate-50 border-2 border-slate-200 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-sm font-black text-slate-900">
                          {order.order_number}
                        </span>
                        {order.serial_number && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-800 text-[10px] font-bold">
                            Seri: {order.serial_number}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-slate-700 mt-0.5">
                        {order.product_name}
                      </p>
                      <div className="flex items-center space-x-3 text-xs mt-1">
                        <span className="font-bold text-orange-600">
                          Target: {order.target_qty} PCS (Sedang Dikerjakan)
                        </span>
                        {order.tailor_name && (
                          <span className="text-slate-500 font-medium">
                            Penjahit: <strong className="text-slate-700">{order.tailor_name}</strong>
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        warmAudio();
                        if (currentRole === "qc") {
                          setSelectedOrderForQc(order);
                          setIsQcModalOpen(true);
                        } else {
                          setSelectedOrderToDispatch(order);
                          setIsDispatchModalOpen(true);
                        }
                      }}
                      className="py-2.5 px-4 bg-orange-600 hover:bg-orange-700 active:scale-95 text-white font-black text-xs rounded-xl shadow-xs"
                    >
                      {currentRole === "qc" ? "Cek QC" : "Kirim"}
                    </button>
                  </div>
                ))}

                {activeTaskList.length === 0 && (
                  <div className="p-6 text-center rounded-2xl bg-slate-50 border border-slate-200 text-slate-400">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-700">Semua Tugas Sudah Beres!</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Belum ada tugas baru. Istirahat atau tunggu pengiriman dari divisi sebelumnya.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. MODALS */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
      />

      <QuickReceiveModal
        isOpen={isReceiveModalOpen}
        onClose={() => {
          setIsReceiveModalOpen(false);
          setSelectedHandoverToReceive(null);
        }}
        onSuccess={fetchSummary}
        handover={selectedHandoverToReceive}
      />

      <QuickDispatchModal
        isOpen={isDispatchModalOpen}
        onClose={() => {
          setIsDispatchModalOpen(false);
          setSelectedOrderToDispatch(null);
        }}
        onSuccess={fetchSummary}
        currentRole={currentRole}
        order={selectedOrderToDispatch}
      />

      <QCModal
        isOpen={isQcModalOpen}
        onClose={() => {
          setIsQcModalOpen(false);
          setSelectedOrderForQc(null);
        }}
        onSuccess={fetchSummary}
        initialOrder={selectedOrderForQc}
      />
    </div>
  );
};
