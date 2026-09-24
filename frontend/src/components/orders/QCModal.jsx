import React, { useState, useEffect } from "react";
import { Modal } from "@/components/common/Modal";
import { request } from "@/utils/request";
import { API_ENDPOINTS } from "@/utils/endpoints";
import toast from "react-hot-toast";
import { Loader2, CheckCircle2, AlertOctagon, RotateCcw } from "lucide-react";
import { playSuccessSound, playErrorSound, warmAudio } from "@/utils/audio";

export const QCModal = ({ isOpen, onClose, onSuccess, initialOrder = null }) => {
  const [orders, setOrders] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    order_id: "",
    qty_checked: "",
    qty_passed: "",
    qty_reject: 0,
    qty_rework: 0,
    reject_reason: "",
    rework_target_stage: "sewing",
    notes: "",
  });

  useEffect(() => {
    if (isOpen) {
      fetchOrders();
      if (initialOrder) {
        setFormData({
          order_id: initialOrder.id,
          qty_checked: initialOrder.target_qty || "",
          qty_passed: initialOrder.target_qty || "",
          qty_reject: 0,
          qty_rework: 0,
          reject_reason: "",
          rework_target_stage: "sewing",
          notes: "",
        });
      } else {
        setFormData({
          order_id: "",
          qty_checked: "",
          qty_passed: "",
          qty_reject: 0,
          qty_rework: 0,
          reject_reason: "",
          rework_target_stage: "sewing",
          notes: "",
        });
      }
    }
  }, [isOpen, initialOrder]);

  const fetchOrders = async () => {
    try {
      const res = await request.get(API_ENDPOINTS.ORDERS.LIST, { limit: 100 });
      if (res.success) setOrders(res.data);
    } catch (err) {
      toast.error("Gagal memuat data pesanan");
    }
  };

  const handleCheckedChange = (checkedVal) => {
    const checked = parseInt(checkedVal || 0, 10);
    setFormData((prev) => {
      const reject = parseInt(prev.qty_reject || 0, 10);
      const rework = parseInt(prev.qty_rework || 0, 10);
      const passed = Math.max(0, checked - reject - rework);
      return { ...prev, qty_checked: checkedVal, qty_passed: passed };
    });
  };

  const handleRejectOrReworkChange = (field, val) => {
    const numVal = parseInt(val || 0, 10);
    setFormData((prev) => {
      const updated = { ...prev, [field]: numVal };
      const checked = parseInt(updated.qty_checked || 0, 10);
      const reject = parseInt(updated.qty_reject || 0, 10);
      const rework = parseInt(updated.qty_rework || 0, 10);
      updated.qty_passed = Math.max(0, checked - reject - rework);
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.order_id || formData.qty_checked === "") {
      toast.error("Pilih pesanan dan masukkan jumlah pcs yang diperiksa");
      return;
    }

    warmAudio();
    setSubmitting(true);
    try {
      await request.post(API_ENDPOINTS.QC.CREATE, formData);
      playSuccessSound();
      toast.success("Hasil inspeksi QC berhasil disimpan!");
      onSuccess();
      onClose();
    } catch (err) {
      playErrorSound();
      toast.error(err.message || "Gagal menyimpan hasil QC");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Inspeksi Kualitas (QC & Rework)" maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4 text-sm">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Pesanan SPK <span className="text-rose-500">*</span>
          </label>
          <select
            value={formData.order_id}
            onChange={(e) => setFormData({ ...formData, order_id: e.target.value })}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            required
          >
            <option value="">-- Pilih Pesanan --</option>
            {orders.map((o) => (
              <option key={o.id} value={o.id}>
                {o.order_number} - {o.product_name} ({o.target_qty} pcs)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Total Pcs Diperiksa (Sample / Batch) <span className="text-rose-500">*</span>
          </label>
          <input
            type="number"
            min="1"
            value={formData.qty_checked}
            onChange={(e) => handleCheckedChange(e.target.value)}
            placeholder="Jumlah pcs diperiksa"
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            required
          />
        </div>

        {/* 3 Outcome Pillars: Good, Reject, Rework: Clean Flat Light */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
          <div className="p-2.5 bg-white border border-emerald-200 rounded-xl text-center shadow-2xs">
            <div className="flex items-center justify-center space-x-1 text-emerald-700 text-xs font-bold mb-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Lolos (Good)</span>
            </div>
            <div className="text-lg font-black text-slate-900">{formData.qty_passed}</div>
            <span className="text-[10px] text-slate-500 font-medium">Siap Packing</span>
          </div>

          <div className="p-2.5 bg-white border border-rose-200 rounded-xl text-center shadow-2xs">
            <div className="flex items-center justify-center space-x-1 text-rose-700 text-xs font-bold mb-1">
              <AlertOctagon className="w-3.5 h-3.5" />
              <span>Reject</span>
            </div>
            <input
              type="number"
              min="0"
              value={formData.qty_reject}
              onChange={(e) => handleRejectOrReworkChange("qty_reject", e.target.value)}
              className="w-full text-center bg-rose-50/50 border border-rose-200 rounded-lg text-rose-700 font-black py-0.5 text-sm focus:outline-none"
            />
            <span className="text-[10px] text-slate-500 font-medium">Cacat Total</span>
          </div>

          <div className="p-2.5 bg-white border border-amber-200 rounded-xl text-center shadow-2xs">
            <div className="flex items-center justify-center space-x-1 text-amber-700 text-xs font-bold mb-1">
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Rework</span>
            </div>
            <input
              type="number"
              min="0"
              value={formData.qty_rework}
              onChange={(e) => handleRejectOrReworkChange("qty_rework", e.target.value)}
              className="w-full text-center bg-amber-50/50 border border-amber-200 rounded-lg text-amber-700 font-black py-0.5 text-sm focus:outline-none"
            />
            <span className="text-[10px] text-slate-500 font-medium">Jahit Ulang</span>
          </div>
        </div>

        {(formData.qty_reject > 0 || formData.qty_rework > 0) && (
          <div className="space-y-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Alasan Reject / Cacat
              </label>
              <input
                type="text"
                value={formData.reject_reason}
                onChange={(e) => setFormData({ ...formData, reject_reason: e.target.value })}
                placeholder="Contoh: Jahitan miring, kancing pecah, serat robek"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {formData.qty_rework > 0 && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kembalikan Rework Ke Divisi
                </label>
                <select
                  value={formData.rework_target_stage}
                  onChange={(e) => setFormData({ ...formData, rework_target_stage: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="sewing">SEWING (Penjahit Perbaikan)</option>
                  <option value="finishing">FINISHING (Buang Benang Ulang / Gosok)</option>
                  <option value="cutting">CUTTING (Potong Komponen Baru)</option>
                </select>
              </div>
            )}
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Catatan Tambahan QC</label>
          <textarea
            rows="2"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Keterangan hasil inspeksi..."
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-slate-600 hover:text-slate-800 bg-slate-100 rounded-xl transition-colors font-medium"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs flex items-center space-x-2 transition-all disabled:opacity-50"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Simpan QC</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
