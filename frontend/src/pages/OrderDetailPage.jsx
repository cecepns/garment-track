import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { request } from "@/utils/request";
import { API_ENDPOINTS } from "@/utils/endpoints";
import {
  ArrowLeft,
  QrCode,
  ArrowRightLeft,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Truck,
  Building,
  User,
  AlertOctagon,
  Calendar,
} from "lucide-react";
import { Spinner } from "@/components/common/LoadingSkeleton";
import { QRCodePrintModal } from "@/components/qr/QRCodePrintModal";
import { HandoverModal } from "@/components/orders/HandoverModal";
import { QCModal } from "@/components/orders/QCModal";
import toast from "react-hot-toast";

export const OrderDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [isPrintQrOpen, setIsPrintQrOpen] = useState(false);
  const [isHandoverOpen, setIsHandoverOpen] = useState(false);
  const [isQcOpen, setIsQcOpen] = useState(false);

  useEffect(() => {
    fetchTrackingData();
  }, [id]);

  const fetchTrackingData = async () => {
    setLoading(true);
    try {
      const res = await request.get(API_ENDPOINTS.ORDERS.TRACKING(id));
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      toast.error(err.message || "Gagal memuat detail pelacakan");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Spinner size="lg" text="Memuat riwayat tracking alur ekspedisi..." />;
  if (!data || !data.order) {
    return (
      <div className="p-8 text-center text-slate-500">
        <p>Pesanan tidak ditemukan</p>
        <button
          onClick={() => navigate("/orders")}
          className="mt-4 px-4 py-2 bg-slate-800 text-white rounded-xl text-sm"
        >
          Kembali ke Daftar Pesanan
        </button>
      </div>
    );
  }

  const { order, timeline = [] } = data;

  const stagesList = ["cutting", "sewing", "finishing", "qc", "packing", "delivered"];
  const currentStageIdx = stagesList.indexOf(order.current_stage);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-xl sm:text-2xl font-black text-slate-900">
                {order.order_number}
              </span>
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                {order.current_stage}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Pelacakan Alur Produksi Realtime (Garment Express Tracking)
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsPrintQrOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-2xs"
          >
            <QrCode className="w-4 h-4 text-indigo-600" />
            <span>Cetak Tag QR</span>
          </button>

          {order.current_stage === "qc" && (
            <button
              onClick={() => setIsQcOpen(true)}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Input Hasil QC</span>
            </button>
          )}

          {order.current_stage !== "delivered" && (
            <button
              onClick={() => setIsHandoverOpen(true)}
              className="flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95"
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>Kirim Handover</span>
            </button>
          )}
        </div>
      </div>

      {/* Production Order Summary Card */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div>
          <span className="text-xs text-slate-400 font-semibold">Target Kuantitas</span>
          <p className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">{order.target_qty} PCS</p>
        </div>
        <div>
          <span className="text-xs text-slate-400 font-semibold">Kode Seri Barang</span>
          <p className="text-sm font-black text-indigo-700 mt-1.5">{order.serial_number || "-"}</p>
        </div>
        <div>
          <span className="text-xs text-slate-400 font-semibold">Calon Penjahit</span>
          <p className="text-sm font-bold text-slate-800 mt-1.5">{order.tailor_name || "-"}</p>
        </div>
        <div>
          <span className="text-xs text-slate-400 font-semibold">Status Pesanan</span>
          <p className="text-sm font-bold text-emerald-600 capitalize mt-1.5 flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>{order.status.replace("_", " ")}</span>
          </p>
        </div>
        <div>
          <span className="text-xs text-slate-400 font-semibold">Batas Waktu (Deadline)</span>
          <p className="text-sm font-bold text-slate-800 mt-1.5 flex items-center space-x-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>{order.deadline ? new Date(order.deadline).toLocaleDateString("id-ID") : "-"}</span>
          </p>
        </div>
        <div>
          <span className="text-xs text-slate-400 font-semibold">Total Reject</span>
          <p className="text-sm font-bold text-rose-600 mt-1.5 flex items-center space-x-1">
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>{order.reject_qty || 0} PCS</span>
          </p>
        </div>
      </div>

      {/* Visual Logistics Stepper (Expedition Model) */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs">
        <h3 className="text-xs font-bold text-slate-400 mb-6 uppercase tracking-wider">
          Alur Posisi Pesanan (Checkpoint Ekspedisi)
        </h3>

        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6 md:gap-0">
          {/* Progress bar line for desktop */}
          <div className="hidden md:block absolute top-5 left-8 right-8 h-1 bg-slate-200 -z-0">
            <div
              className="h-full bg-indigo-600 transition-all duration-500"
              style={{
                width: `${(Math.max(0, currentStageIdx) / (stagesList.length - 1)) * 100}%`,
              }}
            />
          </div>

          {stagesList.map((stg, idx) => {
            const isCompleted = idx < currentStageIdx || order.current_stage === "delivered";
            const isCurrent = idx === currentStageIdx && order.current_stage !== "delivered";

            return (
              <div
                key={stg}
                className="flex md:flex-col items-center space-x-4 md:space-x-0 text-left md:text-center z-10 w-full md:w-auto"
              >
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm transition-all shadow-xs ${
                    isCompleted
                      ? "bg-indigo-600 text-white"
                      : isCurrent
                      ? "bg-amber-500 text-white ring-4 ring-amber-100"
                      : "bg-white text-slate-400 border border-slate-300"
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                </div>

                <div className="mt-0 md:mt-2">
                  <p
                    className={`text-xs font-bold uppercase tracking-wider ${
                      isCurrent
                        ? "text-amber-600 font-extrabold"
                        : isCompleted
                        ? "text-slate-900"
                        : "text-slate-400"
                    }`}
                  >
                    {stg}
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium">
                    {isCurrent ? "Sedang Dikerjakan" : isCompleted ? "Selesai / Transit" : "Menunggu"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tracking Timeline Log (Ala Resi Ekspedisi) */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs">
        <h3 className="text-xs font-bold text-slate-400 mb-6 uppercase tracking-wider flex items-center space-x-2">
          <Truck className="w-4 h-4 text-indigo-600" />
          <span>Riwayat Perjalanan & Handover (Tracking Timeline)</span>
        </h3>

        {timeline.length === 0 ? (
          <p className="text-xs text-slate-500">Belum ada riwayat aktivitas yang tercatat.</p>
        ) : (
          <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {timeline.map((item, idx) => (
              <div key={item.id} className="relative">
                {/* Checkpoint Dot */}
                <div
                  className={`absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                    idx === timeline.length - 1 ? "bg-indigo-600 ring-4 ring-indigo-100" : "bg-slate-300"
                  }`}
                />

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <p className="text-sm font-bold text-slate-900">{item.description}</p>
                    <span className="text-xs text-slate-400 whitespace-nowrap flex items-center space-x-1 font-medium">
                      <Clock className="w-3 h-3" />
                      <span>
                        {new Date(item.created_at).toLocaleString("id-ID", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 mt-2 text-xs text-slate-600">
                    <span>
                      PIC / Petugas: <strong className="text-slate-900">{item.actor_name}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Divisi: <strong className="text-indigo-600 uppercase">{item.stage}</strong>
                    </span>
                    {item.qty_affected > 0 && (
                      <>
                        <span>•</span>
                        <span>
                          Jumlah: <strong className="text-slate-900">{item.qty_affected} pcs</strong>
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <QRCodePrintModal
        isOpen={isPrintQrOpen}
        onClose={() => setIsPrintQrOpen(false)}
        order={order}
      />
      <HandoverModal
        isOpen={isHandoverOpen}
        onClose={() => setIsHandoverOpen(false)}
        onSuccess={fetchTrackingData}
        initialOrder={order}
      />
      <QCModal
        isOpen={isQcOpen}
        onClose={() => setIsQcOpen(false)}
        onSuccess={fetchTrackingData}
        initialOrder={order}
      />
    </div>
  );
};
