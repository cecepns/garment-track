import React, { useState, useEffect } from "react";
import { Modal } from "@/components/common/Modal";
import { request } from "@/utils/request";
import { API_ENDPOINTS } from "@/utils/endpoints";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";

export const OrderModal = ({ isOpen, onClose, onSuccess, editData = null }) => {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    customer_id: "",
    product_id: "",
    target_qty: "",
    serial_number: "",
    tailor_name: "",
    deadline: "",
    notes: "",
    current_stage: "cutting",
    status: "in_progress",
  });

  useEffect(() => {
    if (isOpen) {
      fetchMasters();
      if (editData) {
        setFormData({
          customer_id: editData.customer_id || "",
          product_id: editData.product_id || "",
          target_qty: editData.target_qty || "",
          serial_number: editData.serial_number || "",
          tailor_name: editData.tailor_name || "",
          deadline: editData.deadline ? editData.deadline.split("T")[0] : "",
          notes: editData.notes || "",
          current_stage: editData.current_stage || "cutting",
          status: editData.status || "in_progress",
        });
      } else {
        setFormData({
          customer_id: "",
          product_id: "",
          target_qty: "",
          serial_number: "",
          tailor_name: "",
          deadline: "",
          notes: "",
          current_stage: "cutting",
          status: "in_progress",
        });
      }
    }
  }, [isOpen, editData]);

  const fetchMasters = async () => {
    setLoading(true);
    try {
      const [custRes, prodRes] = await Promise.all([
        request.get(API_ENDPOINTS.CUSTOMERS.LIST, { limit: 100 }),
        request.get(API_ENDPOINTS.PRODUCTS.LIST, { limit: 100 }),
      ]);
      if (custRes.success) setCustomers(custRes.data);
      if (prodRes.success) setProducts(prodRes.data);
    } catch (err) {
      toast.error("Gagal memuat master data pelanggan & produk");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.customer_id || !formData.product_id || !formData.target_qty) {
      toast.error("Pelanggan, produk, dan target kuantitas wajib diisi!");
      return;
    }

    setSubmitting(true);
    try {
      if (editData) {
        await request.put(API_ENDPOINTS.ORDERS.UPDATE(editData.id), formData);
        toast.success("Pesanan berhasil diperbarui!");
      } else {
        await request.post(API_ENDPOINTS.ORDERS.CREATE, formData);
        toast.success("Pesanan baru berhasil dibuat!");
      }
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.message || "Gagal menyimpan pesanan");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editData ? "Ubah Pesanan SPK Produksi" : "Buat Pesanan SPK Baru"}
      maxWidth="max-w-lg"
    >
      {loading ? (
        <div className="py-12 flex justify-center text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Pelanggan / Klien <span className="text-rose-500">*</span>
            </label>
            <select
              value={formData.customer_id}
              onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              required
            >
              <option value="">-- Pilih Pelanggan --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Produk Pakaian <span className="text-rose-500">*</span>
            </label>
            <select
              value={formData.product_id}
              onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              required
            >
              <option value="">-- Pilih Produk --</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} [{p.category}]
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Target Kuantitas (PCS) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={formData.target_qty}
                onChange={(e) => setFormData({ ...formData, target_qty: e.target.value })}
                placeholder="Misal: 500"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Batas Waktu (Deadline)
              </label>
              <input
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Kode Seri Barang (SOP PDF)
              </label>
              <input
                type="text"
                value={formData.serial_number}
                onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                placeholder="Misal: BRD 3011 (M)"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Calon Penjahit (Nama Penjahit)
              </label>
              <input
                type="text"
                value={formData.tailor_name}
                onChange={(e) => setFormData({ ...formData, tailor_name: e.target.value })}
                placeholder="Misal: Saripin / Kang Asep"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {editData && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tahap Saat Ini</label>
                <select
                  value={formData.current_stage}
                  onChange={(e) => setFormData({ ...formData, current_stage: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="cutting">CUTTING</option>
                  <option value="sewing">SEWING</option>
                  <option value="finishing">FINISHING</option>
                  <option value="qc">QC</option>
                  <option value="packing">PACKING</option>
                  <option value="delivered">DELIVERED</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Status Order</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="in_progress">Dalam Proses</option>
                  <option value="completed">Selesai</option>
                  <option value="cancelled">Dibatalkan</option>
                </select>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Catatan Tambahan</label>
            <textarea
              rows="3"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Instruksi pola, warna kain, variasi benang..."
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
              <span>{editData ? "Simpan Perubahan" : "Terbitkan SPK"}</span>
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};
