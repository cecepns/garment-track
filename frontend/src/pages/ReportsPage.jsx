import React, { useState, useEffect } from "react";
import { request } from "@/utils/request";
import { API_ENDPOINTS } from "@/utils/endpoints";
import {
  FileBarChart2,
  TrendingUp,
  Users,
  CheckCircle,
  AlertTriangle,
  Printer,
  Calendar,
} from "lucide-react";
import { Spinner } from "@/components/common/LoadingSkeleton";
import toast from "react-hot-toast";

export const ReportsPage = () => {
  const [summary, setSummary] = useState(null);
  const [productivity, setProductivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const [sumRes, prodRes] = await Promise.all([
        request.get(API_ENDPOINTS.REPORTS.SUMMARY),
        request.get(API_ENDPOINTS.REPORTS.PIC_PRODUCTIVITY),
      ]);
      if (sumRes.success) setSummary(sumRes.data);
      if (prodRes.success) setProductivity(prodRes.data);
    } catch (err) {
      toast.error("Gagal memuat data laporan");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <Spinner size="lg" text="Mengkalkulasi laporan produksi & produktivitas..." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <FileBarChart2 className="w-6 h-6 text-indigo-600" />
            <span>Laporan Produksi & Produktivitas PIC</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Analisis efisiensi serah terima per divisi, hasil output, dan performa petugas garmen
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="flex items-center justify-center space-x-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-bold border border-slate-200 shadow-2xs transition-all"
        >
          <Printer className="w-4 h-4 text-indigo-600" />
          <span>Cetak Laporan</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-400 font-semibold">Total Kebutuhan Output</span>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {summary?.totalPcsTarget || 0} <span className="text-xs font-normal text-slate-500">PCS</span>
          </p>
          <div className="text-[11px] text-slate-400 mt-1">Dari {summary?.totalOrders || 0} Surat Perintah Kerja</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-400 font-semibold">Selesai Dikirim ke Klien</span>
          <p className="text-2xl font-black text-emerald-600 mt-1">
            {summary?.totalPcsCompleted || 0} <span className="text-xs font-normal text-slate-500">PCS</span>
          </p>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">{summary?.completedOrders || 0} SPK Selesai 100%</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-400 font-semibold">Total Afkir / Reject</span>
          <p className="text-2xl font-black text-rose-600 mt-1">
            {summary?.totalPcsReject || 0} <span className="text-xs font-normal text-slate-500">PCS</span>
          </p>
          <div className="text-[11px] text-rose-600 font-medium mt-1">Cacat fisik kain & jahitan</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-400 font-semibold">Tingkat Keberhasilan (Yield Rate)</span>
          <p className="text-2xl font-black text-indigo-600 mt-1">
            {summary?.totalPcsTarget
              ? Math.round(((summary.totalPcsTarget - summary.totalPcsReject) / summary.totalPcsTarget) * 100)
              : 100}
            %
          </p>
          <div className="text-[11px] text-indigo-600 font-medium mt-1">Rasio lolos standar kualitas</div>
        </div>
      </div>

      {/* Stage Breakdown Summary */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs">
        <h3 className="text-base font-bold text-slate-900 mb-4">Volume Produksi Aktif Berjalan Per Tahap</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {summary?.stageSummary?.map((stg) => (
            <div key={stg.stage} className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider block">
                {stg.stage}
              </span>
              <p className="text-xl font-black text-slate-900 mt-1.5">{stg.qty} <span className="text-xs font-normal text-slate-500">pcs</span></p>
              <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">{stg.count} SPK</span>
            </div>
          ))}
        </div>
      </div>

      {/* PIC Productivity Table */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Produktivitas Petugas Lantai Pabrik (PIC)</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Volume kuantitas barang yang berhasil dikerjakan dan diserah-terimakan antar divisi
            </p>
          </div>
          <Users className="w-5 h-5 text-indigo-600" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider font-bold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-5">Nama PIC</th>
                <th className="py-3.5 px-5">Divisi</th>
                <th className="py-3.5 px-5 text-center">Total Kirim Handover</th>
                <th className="py-3.5 px-5 text-center">Total Terima Verifikasi</th>
                <th className="py-3.5 px-5 text-center">Frekuensi Serah Terima</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {productivity.map((pic) => (
                <tr key={pic.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-5 font-bold text-slate-900">{pic.name}</td>
                  <td className="py-3.5 px-5">
                    <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                      {pic.role_display_name}
                    </span>
                  </td>
                  <td className="py-3.5 px-5 text-center font-bold text-indigo-600">
                    {pic.totalSentPcs} pcs
                  </td>
                  <td className="py-3.5 px-5 text-center font-bold text-emerald-600">
                    {pic.totalReceivedPcs} pcs
                  </td>
                  <td className="py-3.5 px-5 text-center text-slate-700 font-semibold">
                    {pic.handoversCount} kali
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
