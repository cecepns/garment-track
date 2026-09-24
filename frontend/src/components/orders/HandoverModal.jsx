import React, { useState, useEffect } from "react";
import { Modal } from "@/components/common/Modal";
import { request } from "@/utils/request";
import { API_ENDPOINTS } from "@/utils/endpoints";
import toast from "react-hot-toast";
import { Loader2, ArrowRight } from "lucide-react";
import { playSuccessSound, playErrorSound, warmAudio } from "@/utils/audio";

export const HandoverModal = ({ isOpen, onClose, onSuccess, initialOrder = null }) => {
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    order_id: "",
    from_stage: "cutting",
    to_stage: "sewing",
    to_user_id: "",
    qty_sent: "",
    notes: "",
  });

  useEffect(() => {
    if (isOpen) {
      fetchData();
      if (initialOrder) {
        const nextStageMap = {
          cutting: "sewing",
          sewing: "finishing",
          finishing: "qc",
          qc: "packing",
          packing: "delivered",
        };
        setFormData({
          order_id: initialOrder.id,
          from_stage: initialOrder.current_stage || "cutting",
          to_stage: nextStageMap[initialOrder.current_stage] || "sewing",
          to_user_id: "",
          qty_sent: initialOrder.target_qty || "",
          notes: "",
        });
      } else {
        setFormData({
          order_id: "",
          from_stage: "cutting",
          to_stage: "sewing",
          to_user_id: "",
          qty_sent: "",
          notes: "",
        });
      }
    }
  }, [isOpen, initialOrder]);

  const fetchData = async () => {
    try {
      const [orderRes, userRes] = await Promise.all([
        request.get(API_ENDPOINTS.ORDERS.LIST, { limit: 100, status: "in_progress" }),
        request.get(API_ENDPOINTS.USERS.LIST, { limit: 100 }),
      ]);
      if (orderRes.success) setOrders(orderRes.data);
      if (userRes.success) setUsers(userRes.data);
    } catch (err) {
      toast.error("Gagal memuat data referensi serah terima");
    }
  };

  const handleOrderSelect = (orderId) => {
    const selected = orders.find((o) => o.id === parseInt(orderId, 10));
    if (selected) {
      const nextStageMap = {
        cutting: "sewing",
        sewing: "finishing",
        finishing: "qc",
        qc: "packing",
        packing: "delivered",
      };
      setFormData({
        ...formData,
        order_id: selected.id,
        from_stage: selected.current_stage,
        to_stage: nextStageMap[selected.current_stage] || "sewing",
        qty_sent: selected.target_qty,
      });
    } else {
      setFormData({ ...formData, order_id: orderId });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.order_id || !formData.qty_sent) {
      toast.error("Pilih pesanan dan masukkan jumlah kuantitas kirim");
      return;
    }

    warmAudio();
    setSubmitting(true);
    try {
      await request.post(API_ENDPOINTS.HANDOVERS.CREATE, formData);
      playSuccessSound();
      toast.success("Serah terima berhasil dikirim! Status sekarang: In Transit.");
      onSuccess();
      onClose();
    } catch (err) {
      playErrorSound();
      toast.error(err.message || "Gagal mengirim serah terima");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Kirim Serah Terima (Handover Transit)" maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4 text-sm">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Pilih Pesanan SPK Produksi <span className="text-rose-500">*</span>
          </label>
          <select
            value={formData.order_id}
            onChange={(e) => handleOrderSelect(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            required
          >
            <option value="">-- Pilih Pesanan Aktif --</option>
            {orders.map((o) => (
              <option key={o.id} value={o.id}>
                {o.order_number} - {o.product_name} ({o.target_qty} pcs) [Tahap: {o.current_stage.toUpperCase()}]
              </option>
            ))}
          </select>
        </div>

        {/* Visual Route Stages: Clean Light Flat */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
          <div className="flex-1">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Divisi Pengirim</span>
            <select
              value={formData.from_stage}
              onChange={(e) => setFormData({ ...formData, from_stage: e.target.value })}
              className="mt-1 w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-indigo-700 font-bold focus:outline-none"
            >
              <option value="cutting">CUTTING</option>
              <option value="sewing">SEWING</option>
              <option value="finishing">FINISHING</option>
              <option value="qc">QC</option>
              <option value="packing">PACKING</option>
            </select>
          </div>

          <div className="px-3 flex items-center justify-center text-slate-400">
            <ArrowRight className="w-5 h-5 text-indigo-600" />
          </div>

          <div className="flex-1">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Divisi Penerima</span>
            <select
              value={formData.to_stage}
              onChange={(e) => setFormData({ ...formData, to_stage: e.target.value })}
              className="mt-1 w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-emerald-700 font-bold focus:outline-none"
            >
              <option value="sewing">SEWING</option>
              <option value="finishing">FINISHING</option>
              <option value="qc">QC</option>
              <option value="packing">PACKING</option>
              <option value="delivered">DELIVERED (KLIEN)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Kuantitas Kirim (PCS) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              value={formData.qty_sent}
              onChange={(e) => setFormData({ ...formData, qty_sent: e.target.value })}
              placeholder="Jumlah pcs dipindahkan"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              required
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block font-medium">
              Mendukung pengiriman bertahap (partial qty).
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Ditujukan ke PIC Spesifik (Opsional)
            </label>
            <select
              value={formData.to_user_id}
              onChange={(e) => setFormData({ ...formData, to_user_id: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="">Semua PIC di Divisi Tujuan</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role_name})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Catatan Serah Terima</label>
          <textarea
            rows="2"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Keterangan bundel, nomor ikat, atau kondisi kain..."
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
            <span>Kirim Handover</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
