import React, { useState, useEffect } from "react";
import { Modal } from "@/components/common/Modal";
import { request } from "@/utils/request";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { CheckCircle2, AlertTriangle, ArrowDownLeft, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

export const QuickReceiveModal = ({ isOpen, onClose, onSuccess, handover }) => {
  const [qtyReceived, setQtyReceived] = useState("");
  const [hasDiscrepancy, setHasDiscrepancy] = useState(false);
  const [discrepancyReason, setDiscrepancyReason] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (handover) {
      setQtyReceived(handover.qty_sent || "");
      setHasDiscrepancy(false);
      setDiscrepancyReason("");
    }
  }, [handover]);

  if (!handover) return null;

  const handleConfirmReceive = async () => {
    const qty = parseInt(qtyReceived, 10);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Jumlah barang harus lebih dari 0");
      return;
    }

    if (hasDiscrepancy && !discrepancyReason.trim()) {
      toast.error("Tuliskan alasan jika jumlah barang berbeda");
      return;
    }

    setLoading(true);
    try {
      const res = await request.put(API_ENDPOINTS.HANDOVERS.RECEIVE(handover.id), {
        qty_received: qty,
        discrepancy_reason: hasDiscrepancy ? discrepancyReason : "",
      });

      if (res.success) {
        toast.success(`Berhasil menerima ${qty} pcs barang!`, { duration: 4000 });
        onSuccess?.();
        onClose();
      }
    } catch (err) {
      toast.error(err.message || "Gagal konfirmasi penerimaan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Konfirmasi Terima Barang" maxWidth="max-w-lg">
      <div className="space-y-5">
        {/* Info Card - Extra Large Fonts for Senior/Elderly Workers */}
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/80 border-2 border-amber-200">
          <div className="flex items-center space-x-2 text-amber-800 text-sm font-bold uppercase tracking-wider mb-2">
            <ArrowDownLeft className="w-5 h-5 text-amber-600" />
            <span>Barang Masuk dari {handover.from_stage?.toUpperCase()}</span>
          </div>

          <div className="space-y-2">
            <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {handover.order_number}
            </div>
            <div className="text-base font-semibold text-slate-700">
              {handover.product_name}
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Pengirim: <span className="font-bold text-slate-700">{handover.from_user_name || "PIC Pengirim"}</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-amber-200/80 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-600">Jumlah Dikirim:</span>
            <span className="text-2xl font-black text-amber-700">
              {handover.qty_sent} <span className="text-sm font-bold">PCS</span>
            </span>
          </div>
        </div>

        {/* Big 1-Click Action */}
        {!hasDiscrepancy ? (
          <div className="space-y-3">
            <button
              type="button"
              disabled={loading}
              onClick={handleConfirmReceive}
              className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-lg font-black rounded-2xl shadow-md flex items-center justify-center space-x-3 transition-all disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-6 h-6" />
                  <span>TERIMA {handover.qty_sent} PCS (SESUAI)</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setHasDiscrepancy(true)}
              className="w-full py-2.5 text-center text-sm font-bold text-slate-500 hover:text-amber-700 hover:underline transition-colors"
            >
              Jumlah tidak pas / Ada selisih fisik?
            </button>
          </div>
        ) : (
          <div className="space-y-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center space-x-2 text-amber-600 text-sm font-bold">
              <AlertTriangle className="w-4 h-4" />
              <span>Input Jumlah Fisik Sebenarnya</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Jumlah Barang Diterima Sebenarnya (PCS):
              </label>
              <input
                type="number"
                value={qtyReceived}
                onChange={(e) => setQtyReceived(e.target.value)}
                className="w-full p-3 text-xl font-bold bg-white border-2 border-slate-300 rounded-xl focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Alasan Selisih / Keterangan:
              </label>
              <input
                type="text"
                value={discrepancyReason}
                onChange={(e) => setDiscrepancyReason(e.target.value)}
                placeholder="Contoh: Kurang 5 pcs kancing lepas"
                className="w-full p-3 text-sm bg-white border border-slate-300 rounded-xl focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setHasDiscrepancy(false)}
                className="flex-1 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-sm"
              >
                Kembali
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleConfirmReceive}
                className="flex-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-sm flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Simpan Penerimaan</span>}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
