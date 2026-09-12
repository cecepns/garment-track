import React, { useState, useEffect } from "react";
import { request } from "@/utils/request";
import { API_ENDPOINTS } from "@/utils/endpoints";
import {
  ShieldCheck,
  Plus,
  RotateCcw,
  CheckCircle2,
  AlertOctagon,
  Clock,
  Shirt,
} from "lucide-react";
import { SearchInput } from "@/components/common/SearchInput";
import { Pagination } from "@/components/common/Pagination";
import { TableSkeleton, EmptyState } from "@/components/common/LoadingSkeleton";
import { QCModal } from "@/components/orders/QCModal";
import toast from "react-hot-toast";

export const QCPage = () => {
  const [activeTab, setActiveTab] = useState("inspections");
  const [inspections, setInspections] = useState([]);
  const [reworks, setReworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  const [isQCModalOpen, setIsQCModalOpen] = useState(false);

  useEffect(() => {
    if (activeTab === "inspections") {
      fetchInspections();
    } else {
      fetchReworks();
    }
  }, [activeTab, currentPage, limit, search]);

  const fetchInspections = async () => {
    setLoading(true);
    try {
      const res = await request.get(API_ENDPOINTS.QC.LIST, {
        page: currentPage,
        limit,
        search,
      });
      if (res.success) {
        setInspections(res.data);
        if (res.pagination) {
          setPagination({
            total: res.pagination.total,
            totalPages: res.pagination.totalPages,
          });
        }
      }
    } catch (err) {
      toast.error(err.message || "Gagal memuat data QC");
    } finally {
      setLoading(false);
    }
  };

  const fetchReworks = async () => {
    setLoading(true);
    try {
      const res = await request.get(API_ENDPOINTS.QC.REWORKS);
      if (res.success) {
        setReworks(res.data);
      }
    } catch (err) {
      toast.error("Gagal memuat data tiket rework");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <ShieldCheck className="w-6 h-6 text-rose-600" />
            <span>Quality Control & Tiket Rework</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Sortir kualitas pakaian jadi: Good (Lolos), Reject (Cacat), dan Rework (Jahit Ulang)
          </p>
        </div>

        <button
          onClick={() => setIsQCModalOpen(true)}
          className="flex items-center justify-center space-x-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold shadow-xs transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Input Hasil Inspeksi QC</span>
        </button>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-slate-200 space-x-4">
        <button
          onClick={() => {
            setActiveTab("inspections");
            setCurrentPage(1);
          }}
          className={`pb-3 text-sm font-bold transition-colors relative ${
            activeTab === "inspections" ? "text-rose-600" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <span>Daftar Inspeksi QC</span>
          {activeTab === "inspections" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-600 rounded-full" />
          )}
        </button>

        <button
          onClick={() => {
            setActiveTab("reworks");
            setCurrentPage(1);
          }}
          className={`pb-3 text-sm font-bold transition-colors relative flex items-center space-x-1.5 ${
            activeTab === "reworks" ? "text-amber-600" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <span>Tiket Rework Penjahit</span>
          {reworks.length > 0 && (
            <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full border border-amber-200">
              {reworks.length}
            </span>
          )}
          {activeTab === "reworks" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-600 rounded-full" />
          )}
        </button>
      </div>

      {activeTab === "inspections" ? (
        <>
          {/* Search Bar */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
            <SearchInput
              value={search}
              onChange={(val) => {
                setSearch(val);
                setCurrentPage(1);
              }}
              placeholder="Cari no. SPK, produk, alasan reject..."
            />
          </div>

          {/* Inspections Table */}
          <div className="rounded-2xl bg-white border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              {loading ? (
                <TableSkeleton rows={5} cols={6} />
              ) : inspections.length === 0 ? (
                <EmptyState
                  title="Belum Ada Rekaman QC"
                  description="Belum ada data inspeksi kualitas yang tercatat."
                />
              ) : (
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3.5 px-4">No. SPK & Produk</th>
                      <th className="py-3.5 px-4 text-center">Diperiksa</th>
                      <th className="py-3.5 px-4 text-center">Lolos (Good)</th>
                      <th className="py-3.5 px-4 text-center">Reject</th>
                      <th className="py-3.5 px-4 text-center">Rework</th>
                      <th className="py-3.5 px-4">Alasan Cacat</th>
                      <th className="py-3.5 px-4">Petugas QC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {inspections.map((qc) => (
                      <tr key={qc.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-mono font-bold text-slate-900">{qc.order_number}</div>
                          <div className="text-[11px] text-slate-400 font-medium">{qc.product_name}</div>
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-slate-900">
                          {qc.qty_checked} pcs
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-emerald-600">
                          {qc.qty_passed} pcs
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-rose-600">
                          {qc.qty_reject || 0} pcs
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-amber-600">
                          {qc.qty_rework || 0} pcs
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-600 font-medium">
                          {qc.reject_reason || "-"}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-500">
                          <div className="font-semibold text-slate-800">{qc.inspector_name}</div>
                          <div className="text-[10px]">
                            {new Date(qc.created_at).toLocaleDateString("id-ID")}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {!loading && inspections.length > 0 && (
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
        </>
      ) : (
        /* Reworks List View: Clean White Cards with amber borders */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reworks.length === 0 ? (
            <div className="col-span-full">
              <EmptyState
                title="Tidak Ada Tiket Rework"
                description="Semua pakaian lolos QC atau sudah selesai diperbaiki penjahit."
              />
            </div>
          ) : (
            reworks.map((rw) => (
              <div
                key={rw.id}
                className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-indigo-600">{rw.order_number}</span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200">
                      {rw.rework_status}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mt-2">{rw.product_name}</h4>
                  <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700">
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">Instruksi Perbaikan:</span>
                    <strong className="text-slate-900 mt-0.5 block">{rw.reject_reason || "Periksa ulang jahitan"}</strong>
                  </div>
                  <div className="mt-3 text-xs text-slate-600 flex items-center justify-between font-medium">
                    <span>
                      Jumlah Rework: <strong className="text-amber-600 text-sm font-bold">{rw.qty_rework} PCS</strong>
                    </span>
                    <span>Kembali ke: <strong className="uppercase text-slate-900">{rw.rework_target_stage}</strong></span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between font-medium">
                  <span>Dibuat: {new Date(rw.created_at).toLocaleDateString("id-ID")}</span>
                  <span className="text-emerald-600 font-bold flex items-center space-x-1">
                    <RotateCcw className="w-3 h-3" />
                    <span>Dalam Pengerjaan</span>
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* QC Modal */}
      <QCModal
        isOpen={isQCModalOpen}
        onClose={() => setIsQCModalOpen(false)}
        onSuccess={() => {
          fetchInspections();
          fetchReworks();
        }}
      />
    </div>
  );
};
