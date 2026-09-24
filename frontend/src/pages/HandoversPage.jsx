import React, { useState, useEffect } from "react";
import { request } from "@/utils/request";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { useAuth } from "@/context/AuthContext";
import {
  ArrowRightLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  Truck,
  Loader2,
} from "lucide-react";
import { SearchInput } from "@/components/common/SearchInput";
import { Pagination } from "@/components/common/Pagination";
import { TableSkeleton, EmptyState } from "@/components/common/LoadingSkeleton";
import { HandoverModal } from "@/components/orders/HandoverModal";
import { Modal } from "@/components/common/Modal";
import toast from "react-hot-toast";
import { playSuccessSound, playErrorSound, warmAudio } from "@/utils/audio";

export const HandoversPage = () => {
  const { user } = useAuth();
  const [handovers, setHandovers] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  // Modal states
  const [isSendHandoverOpen, setIsSendHandoverOpen] = useState(false);
  const [receiveModal, setReceiveModal] = useState({
    isOpen: false,
    handover: null,
    receivedQty: "",
    discrepancy: "",
    submitting: false,
  });

  useEffect(() => {
    fetchHandovers();
    fetchIncoming();
  }, [currentPage, limit, search, statusFilter]);

  const fetchHandovers = async () => {
    setLoading(true);
    try {
      const res = await request.get(API_ENDPOINTS.HANDOVERS.LIST, {
        page: currentPage,
        limit,
        search,
        status: statusFilter,
      });
      if (res.success) {
        setHandovers(res.data);
        if (res.pagination) {
          setPagination({
            total: res.pagination.total,
            totalPages: res.pagination.totalPages,
          });
        }
      }
    } catch (err) {
      toast.error(err.message || "Gagal memuat data serah terima");
    } finally {
      setLoading(false);
    }
  };

  const fetchIncoming = async () => {
    try {
      const res = await request.get(API_ENDPOINTS.HANDOVERS.INCOMING);
      if (res.success) {
        setIncoming(res.data);
      }
    } catch (err) {
      // silent
    }
  };

  const handleOpenReceive = (h) => {
    setReceiveModal({
      isOpen: true,
      handover: h,
      receivedQty: h.qty_sent,
      discrepancy: "",
      submitting: false,
    });
  };

  const handleConfirmReceive = async (e) => {
    e.preventDefault();
    if (!receiveModal.handover) return;

    warmAudio();
    setReceiveModal((prev) => ({ ...prev, submitting: true }));
    try {
      await request.put(API_ENDPOINTS.HANDOVERS.RECEIVE(receiveModal.handover.id), {
        qty_received: receiveModal.receivedQty,
        discrepancy_reason: receiveModal.discrepancy,
      });
      playSuccessSound();
      toast.success("Barang serah terima berhasil diverifikasi & diterima!");
      setReceiveModal({ isOpen: false, handover: null, receivedQty: "", discrepancy: "", submitting: false });
      fetchHandovers();
      fetchIncoming();
    } catch (err) {
      playErrorSound();
      toast.error(err.message || "Gagal mengonfirmasi penerimaan barang");
      setReceiveModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <ArrowRightLeft className="w-6 h-6 text-indigo-600" />
            <span>Serah Terima Antar Divisi (Transit)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Mekanisme double confirmation layaknya serah terima paket ekspedisi
          </p>
        </div>

        <button
          onClick={() => setIsSendHandoverOpen(true)}
          className="flex items-center justify-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-xs transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Kirim Handover Baru</span>
        </button>
      </div>

      {/* Incoming Handover Alert Section (Double Confirmation Queue): Clean Flat Light */}
      {incoming.length > 0 && (
        <div className="p-5 sm:p-6 rounded-2xl bg-emerald-50 border border-emerald-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-ping" />
              <h2 className="text-sm font-bold text-emerald-950 uppercase tracking-wider">
                Barang Masuk Menunggu Konfirmasi ({incoming.length})
              </h2>
            </div>
            <span className="text-xs text-emerald-700 font-bold">Wajib Verifikasi Fisik</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {incoming.map((h) => (
              <div
                key={h.id}
                className="p-4 rounded-xl bg-white border border-emerald-200 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-indigo-600">{h.handover_code}</span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {new Date(h.sent_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mt-1">{h.product_name}</h4>
                  <p className="text-xs text-slate-500">Order: {h.order_number}</p>

                  <div className="mt-3 flex items-center space-x-2 text-xs">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold uppercase">
                      {h.from_stage}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold uppercase">
                      {h.to_stage}
                    </span>
                  </div>

                  <div className="mt-2 text-xs text-slate-700 font-medium">
                    Kuantitas Kirim: <strong className="text-slate-900 text-sm font-bold">{h.qty_sent} PCS</strong>
                  </div>
                  <div className="text-[11px] text-slate-500">Pengirim: {h.from_user_name}</div>
                </div>

                <button
                  onClick={() => handleOpenReceive(h)}
                  className="mt-4 w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center space-x-1.5 transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Konfirmasi Terima Barang</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <SearchInput
          value={search}
          onChange={(val) => {
            setSearch(val);
            setCurrentPage(1);
          }}
          placeholder="Cari kode serah terima, no. SPK..."
        />

        <div className="flex items-center space-x-2">
          {["", "in_transit", "received"].map((st) => (
            <button
              key={st}
              onClick={() => {
                setStatusFilter(st);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg capitalize transition-all ${
                statusFilter === st
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900"
              }`}
            >
              {st === "" ? "Semua Status" : st === "in_transit" ? "In Transit" : "Diterima"}
            </button>
          ))}
        </div>
      </div>

      {/* Handovers Table */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <TableSkeleton rows={5} cols={6} />
          ) : handovers.length === 0 ? (
            <EmptyState
              title="Belum Ada Data Serah Terima"
              description="Tidak ada data serah terima yang cocok dengan filter."
            />
          ) : (
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Kode Transit</th>
                  <th className="py-3.5 px-4">No. SPK & Produk</th>
                  <th className="py-3.5 px-4">Rute Pos</th>
                  <th className="py-3.5 px-4 text-center">Qty Kirim / Terima</th>
                  <th className="py-3.5 px-4">Pengirim & Penerima</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {handovers.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{h.handover_code}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{h.order_number}</div>
                      <div className="text-[11px] text-slate-400 font-medium">{h.product_name}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-1.5 text-xs font-bold">
                        <span className="uppercase text-indigo-700">{h.from_stage}</span>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                        <span className="uppercase text-emerald-700">{h.to_stage}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="font-bold text-slate-900">{h.qty_sent}</span>
                      <span className="text-slate-400"> / </span>
                      <span className={h.qty_received > 0 ? "text-emerald-600 font-bold" : "text-slate-400"}>
                        {h.qty_received}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      <div>Dari: <span className="text-slate-900 font-semibold">{h.from_user_name}</span></div>
                      <div>Ke: <span className="text-slate-500">{h.to_user_name}</span></div>
                    </td>
                    <td className="py-3.5 px-4">
                      {h.status === "in_transit" ? (
                        <span className="px-2 py-0.5 text-xs font-bold rounded-lg bg-amber-50 text-amber-700 border border-amber-200 flex items-center space-x-1 w-max">
                          <Clock className="w-3 h-3" />
                          <span>In Transit</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center space-x-1 w-max">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Diterima</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {h.status === "in_transit" ? (
                        <button
                          onClick={() => handleOpenReceive(h)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors"
                        >
                          Terima
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">Selesai</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {!loading && handovers.length > 0 && (
          <div className="border-t border-slate-200 px-4">
            <Pagination
              currentPage={currentPage}
              totalPages={pagination.totalPages}
              limit={limit}
              totalItems={pagination.total}
              onPageChange={(page) => setCurrentPage(page)}
              onLimitChange={(newLimit) => {
                setLimit(newLimit);
                setCurrentPage(1);
              }}
            />
          </div>
        )}
      </div>

      {/* Handover Send Modal */}
      <HandoverModal
        isOpen={isSendHandoverOpen}
        onClose={() => setIsSendHandoverOpen(false)}
        onSuccess={() => {
          fetchHandovers();
          fetchIncoming();
        }}
      />

      {/* Double Confirmation Receive Modal */}
      <Modal
        isOpen={receiveModal.isOpen}
        onClose={() => setReceiveModal({ isOpen: false, handover: null, receivedQty: "", discrepancy: "", submitting: false })}
        title="Konfirmasi Penerimaan Barang (Double Check)"
        maxWidth="max-w-md"
      >
        {receiveModal.handover && (
          <form onSubmit={handleConfirmReceive} className="space-y-4 text-sm">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-xs text-slate-500 font-medium">Kode Serah Terima:</div>
              <div className="font-mono font-bold text-slate-900 text-sm">
                {receiveModal.handover.handover_code}
              </div>
              <div className="text-xs text-slate-700 mt-1">
                SPK: {receiveModal.handover.order_number} ({receiveModal.handover.product_name})
              </div>
              <div className="text-xs text-indigo-700 font-semibold mt-0.5">
                Pengirim: {receiveModal.handover.from_user_name} ({receiveModal.handover.from_stage.toUpperCase()})
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Kuantitas Kirim Asal:
              </label>
              <div className="font-black text-slate-900 text-base">
                {receiveModal.handover.qty_sent} PCS
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Kuantitas Fisik Diterima <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={receiveModal.receivedQty}
                onChange={(e) => setReceiveModal({ ...receiveModal, receivedQty: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                required
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Hitung fisik barang sebelum konfirmasi untuk menghindari selisih.
              </span>
            </div>

            {parseInt(receiveModal.receivedQty || 0, 10) !== receiveModal.handover.qty_sent && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-800">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Terdeteksi Selisih Kuantitas!</span>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Alasan Selisih Barang:
                  </label>
                  <textarea
                    rows="2"
                    value={receiveModal.discrepancy}
                    onChange={(e) => setReceiveModal({ ...receiveModal, discrepancy: e.target.value })}
                    placeholder="Contoh: Kurang 5 pcs kain rusak saat pengiriman"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none"
                    required
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReceiveModal({ isOpen: false, handover: null, receivedQty: "", discrepancy: "", submitting: false })}
                disabled={receiveModal.submitting}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 bg-slate-100 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={receiveModal.submitting}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm flex items-center space-x-2 transition-all disabled:opacity-50"
              >
                {receiveModal.submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Verifikasi & Terima</span>
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
