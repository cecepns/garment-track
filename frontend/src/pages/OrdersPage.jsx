import React, { useState, useEffect } from "react";
import { request } from "@/utils/request";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  QrCode,
  ArrowRightLeft,
  Edit2,
  Trash2,
  Eye,
  Filter,
  Layers,
} from "lucide-react";
import { SearchInput } from "@/components/common/SearchInput";
import { Pagination } from "@/components/common/Pagination";
import { TableSkeleton, EmptyState } from "@/components/common/LoadingSkeleton";
import { OrderModal } from "@/components/orders/OrderModal";
import { HandoverModal } from "@/components/orders/HandoverModal";
import { QRCodePrintModal } from "@/components/qr/QRCodePrintModal";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import toast from "react-hot-toast";

export const OrdersPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  // Modals state
  const [isCreateEditOpen, setIsCreateEditOpen] = useState(false);
  const [editOrder, setEditOrder] = useState(null);
  const [isHandoverOpen, setIsHandoverOpen] = useState(false);
  const [selectedOrderForHandover, setSelectedOrderForHandover] = useState(null);
  const [isPrintQrOpen, setIsPrintQrOpen] = useState(false);
  const [selectedOrderForPrint, setSelectedOrderForPrint] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null, loading: false });

  useEffect(() => {
    fetchOrders();
  }, [currentPage, limit, search, stageFilter]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await request.get(API_ENDPOINTS.ORDERS.LIST, {
        page: currentPage,
        limit,
        search,
        stage: stageFilter,
      });
      if (res.success) {
        setOrders(res.data);
        if (res.pagination) {
          setPagination({
            total: res.pagination.total,
            totalPages: res.pagination.totalPages,
          });
        }
      }
    } catch (err) {
      toast.error(err.message || "Gagal mengambil data pesanan");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleteConfirm((prev) => ({ ...prev, loading: true }));
    try {
      await request.del(API_ENDPOINTS.ORDERS.DELETE(deleteConfirm.id));
      toast.success("Pesanan SPK berhasil dihapus");
      setDeleteConfirm({ isOpen: false, id: null, loading: false });
      fetchOrders();
    } catch (err) {
      toast.error(err.message || "Gagal menghapus pesanan");
      setDeleteConfirm((prev) => ({ ...prev, loading: false }));
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

  const isOwnerOrAdmin = user?.role === "owner" || user?.role === "admin";

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <Layers className="w-6 h-6 text-indigo-600" />
            <span>Pesanan & SPK Produksi</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Daftar seluruh work order yang berjalan dari potong hingga serah terima
          </p>
        </div>

        {isOwnerOrAdmin && (
          <button
            onClick={() => {
              setEditOrder(null);
              setIsCreateEditOpen(true);
            }}
            className="flex items-center justify-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-xs transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Pesanan SPK</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Realtime Debounced Search */}
        <SearchInput
          value={search}
          onChange={(val) => {
            setSearch(val);
            setCurrentPage(1);
          }}
          placeholder="Cari no. SPK, produk, pelanggan..."
        />

        {/* Stage Filter Buttons */}
        <div className="flex items-center space-x-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <span className="text-xs text-slate-400 flex items-center space-x-1 mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tahap:</span>
          </span>
          {["", "cutting", "sewing", "finishing", "qc", "packing", "delivered"].map((stg) => (
            <button
              key={stg}
              onClick={() => {
                setStageFilter(stg);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg capitalize whitespace-nowrap transition-all ${
                stageFilter === stg
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900"
              }`}
            >
              {stg === "" ? "Semua" : stg}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <TableSkeleton rows={5} cols={6} />
          ) : orders.length === 0 ? (
            <EmptyState
              title="Pesanan Tidak Ditemukan"
              description="Belum ada pesanan yang sesuai dengan filter atau kata kunci pencarian Anda."
              actionButton={
                isOwnerOrAdmin && (
                  <button
                    onClick={() => {
                      setEditOrder(null);
                      setIsCreateEditOpen(true);
                    }}
                    className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold"
                  >
                    Buat Pesanan Pertama
                  </button>
                )
              }
            />
          ) : (
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">No. SPK & Tag</th>
                  <th className="py-3.5 px-4">Produk</th>
                  <th className="py-3.5 px-4">Pelanggan</th>
                  <th className="py-3.5 px-4 text-center">Target Qty</th>
                  <th className="py-3.5 px-4">Tahap Saat Ini</th>
                  <th className="py-3.5 px-4">Batas Waktu</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setSelectedOrderForPrint(order);
                            setIsPrintQrOpen(true);
                          }}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 transition-colors"
                          title="Cetak Barcode / QR Tag"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>
                        <span
                          onClick={() => navigate(`/orders/${order.id}`)}
                          className="font-mono font-bold text-slate-900 hover:text-indigo-600 cursor-pointer"
                        >
                          {order.order_number}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{order.product_name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{order.product_code}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-slate-700 font-medium">{order.customer_name}</span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-900">
                      {order.target_qty} <span className="text-xs font-normal text-slate-500">pcs</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 text-xs font-bold rounded-lg border uppercase tracking-wider ${getStageBadge(
                          order.current_stage
                        )}`}
                      >
                        {order.current_stage}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500 font-medium">
                      {order.deadline ? new Date(order.deadline).toLocaleDateString("id-ID") : "-"}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        {/* Detail Tracking */}
                        <button
                          onClick={() => navigate(`/orders/${order.id}`)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Detail Tracking Ekspedisi"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Fast Handover Button */}
                        {order.current_stage !== "delivered" && (
                          <button
                            onClick={() => {
                              setSelectedOrderForHandover(order);
                              setIsHandoverOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Kirim Serah Terima (Handover)"
                          >
                            <ArrowRightLeft className="w-4 h-4" />
                          </button>
                        )}

                        {/* Edit Order */}
                        {isOwnerOrAdmin && (
                          <button
                            onClick={() => {
                              setEditOrder(order);
                              setIsCreateEditOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Ubah Pesanan"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}

                        {/* Delete Order */}
                        {isOwnerOrAdmin && (
                          <button
                            onClick={() =>
                              setDeleteConfirm({
                                isOpen: true,
                                id: order.id,
                                loading: false,
                              })
                            }
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Hapus Pesanan"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Backend Driven Pagination */}
        {!loading && orders.length > 0 && (
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

      {/* Create / Edit Modal */}
      <OrderModal
        isOpen={isCreateEditOpen}
        onClose={() => {
          setIsCreateEditOpen(false);
          setEditOrder(null);
        }}
        onSuccess={fetchOrders}
        editData={editOrder}
      />

      {/* Handover Modal */}
      <HandoverModal
        isOpen={isHandoverOpen}
        onClose={() => {
          setIsHandoverOpen(false);
          setSelectedOrderForHandover(null);
        }}
        onSuccess={fetchOrders}
        initialOrder={selectedOrderForHandover}
      />

      {/* Print QR Tag Modal */}
      <QRCodePrintModal
        isOpen={isPrintQrOpen}
        onClose={() => {
          setIsPrintQrOpen(false);
          setSelectedOrderForPrint(null);
        }}
        order={selectedOrderForPrint}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null, loading: false })}
        onConfirm={handleDelete}
        loading={deleteConfirm.loading}
        title="Hapus Pesanan SPK Produksi"
        message="Apakah Anda yakin ingin menghapus pesanan ini? Riwayat serah terima dan log produksi terkait akan ikut terhapus."
      />
    </div>
  );
};
