import React, { useState, useEffect } from "react";
import { Modal } from "@/components/common/Modal";
import { request } from "@/utils/request";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { playSuccessSound, playErrorSound } from "@/utils/audio";
import { Send, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";

const STAGE_TRANSITIONS = {
  cutting: "sewing",
  sewing: "finishing",
  finishing: "qc",
  qc: "packing",
  packing: "delivered",
};

const STAGE_LABELS = {
  cutting: "Cutting (Potong)",
  sewing: "Sewing (Jahit)",
  finishing: "Finishing (Gosok/Kancing)",
  qc: "QC (Inspeksi)",
  packing: "Packing (Kemas)",
  delivered: "Klien (Selesai Kirim)",
};

export const QuickDispatchModal = ({ isOpen, onClose, onSuccess, currentRole, order }) => {
  const [qtySent, setQtySent] = useState("");
  const [targetStage, setTargetStage] = useState("sewing");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (order) {
      const nextStage = STAGE_TRANSITIONS[currentRole] || STAGE_TRANSITIONS[order.current_stage] || "sewing";
      setTargetStage(nextStage);
      setQtySent(order.target_qty || "");
      setNotes("");
    }
  }, [order, currentRole]);

  if (!order) return null;

  const handleSendHandover = async (e) => {
    e.preventDefault();
    const qty = parseInt(qtySent, 10);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Jumlah kirim harus lebih dari 0");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        order_id: order.id,
        from_stage: currentRole === "admin" || currentRole === "owner" ? order.current_stage : currentRole,
        to_stage: targetStage,
        qty_sent: qty,
        notes: notes.trim() || `Kirim dari stasiun ${currentRole?.toUpperCase()}`,
      };

      const res = await request.post(API_ENDPOINTS.HANDOVERS.CREATE, payload);
      if (res.success) {
        playSuccessSound();
        toast.success(`Berhasil mengirim ${qty} pcs ke divisi ${targetStage.toUpperCase()}!`, {
          duration: 4000,
        });
        onSuccess?.();
        onClose();
      }
    } catch (err) {
      playErrorSound();
      toast.error(err.message || "Gagal mengirim serah terima");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Kirim Barang ke Proses Lanjut (Drop-off)" maxWidth="max-w-lg">
      <form onSubmit={handleSendHandover} className="space-y-5">
        {/* SPK Target Summary Banner */}
        <div className="p-4 sm:p-5 rounded-2xl bg-orange-50 border-2 border-orange-200">
          <div className="flex items-center justify-between text-xs font-bold text-orange-800 uppercase tracking-wider mb-2">
            <span>Surat Perintah Kerja (SPK)</span>
            <span className="px-2 py-0.5 rounded-md bg-orange-200 text-orange-900 font-mono">
              {order.order_number}
            </span>
          </div>

          <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {order.product_name}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-semibold text-slate-600 mt-1.5">
            <div>
              Target: <span className="font-bold text-slate-900">{order.target_qty} PCS</span>
            </div>
            {order.serial_number && (
              <div>
                Seri: <span className="font-bold text-slate-900">{order.serial_number}</span>
              </div>
            )}
            {order.tailor_name && (
              <div>
                Penjahit: <span className="font-bold text-slate-900">{order.tailor_name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Alur Perpindahan Visual */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
          <div className="text-center">
            <span className="text-[11px] font-bold text-slate-400 block uppercase">Dari Stasiun</span>
            <span className="text-base font-black text-slate-800 capitalize">
              {STAGE_LABELS[currentRole] || currentRole}
            </span>
          </div>
          <div className="p-2 rounded-full bg-orange-100 text-orange-600">
            <ArrowRight className="w-5 h-5" />
          </div>
          <div className="text-center">
            <span className="text-[11px] font-bold text-slate-400 block uppercase">Tujuan Pengiriman</span>
            <span className="text-base font-black text-orange-600 capitalize">
              {STAGE_LABELS[targetStage] || targetStage}
            </span>
          </div>
        </div>

        {/* Large Qty Input for Senior Workers */}
        <div>
          <label className="block text-sm font-black text-slate-800 mb-1.5">
            Jumlah Barang yang Dikirim (PCS):
          </label>
          <div className="relative">
            <input
              type="number"
              required
              min="1"
              value={qtySent}
              onChange={(e) => setQtySent(e.target.value)}
              className="w-full py-3.5 px-4 text-2xl font-black text-slate-900 bg-white border-2 border-slate-300 rounded-2xl focus:border-orange-500 focus:outline-none"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">
              PCS
            </span>
          </div>
        </div>

        {/* Quick Note */}
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">
            Catatan Tambahan (Opsional):
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Contoh: Jahit selesai kloter 1 rapih"
            className="w-full p-3 text-sm bg-white border border-slate-300 rounded-xl focus:border-orange-500 focus:outline-none"
          />
        </div>

        {/* Giant Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 px-6 bg-orange-600 hover:bg-orange-700 active:scale-98 text-white text-lg font-black rounded-2xl shadow-md flex items-center justify-center space-x-3 transition-all disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <>
              <Send className="w-5 h-5" />
              <span>KIRIM SELESAI ({qtySent || 0} PCS)</span>
            </>
          )}
        </button>
      </form>
    </Modal>
  );
};
