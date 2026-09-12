import React, { useState, useEffect } from "react";
import { request } from "@/utils/request";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { Users, Plus, Edit2, Trash2, Loader2, Phone } from "lucide-react";
import { SearchInput } from "@/components/common/SearchInput";
import { Pagination } from "@/components/common/Pagination";
import { TableSkeleton, EmptyState } from "@/components/common/LoadingSkeleton";
import { Modal } from "@/components/common/Modal";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import toast from "react-hot-toast";

export const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    password: "",
    role_id: 3,
    phone: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null, loading: false });

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, [currentPage, limit, search]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await request.get(API_ENDPOINTS.USERS.LIST, {
        page: currentPage,
        limit,
        search,
      });
      if (res.success) {
        setUsers(res.data);
        if (res.pagination) {
          setPagination({
            total: res.pagination.total,
            totalPages: res.pagination.totalPages,
          });
        }
      }
    } catch (err) {
      toast.error(err.message || "Gagal memuat pengguna");
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await request.get(API_ENDPOINTS.AUTH.ROLES);
      if (res.success) setRoles(res.data);
    } catch (err) {
      // silent
    }
  };

  const handleOpenModal = (u = null) => {
    if (u) {
      setEditData(u);
      setFormData({
        name: u.name,
        username: u.username,
        password: "",
        role_id: u.role_id,
        phone: u.phone || "",
      });
    } else {
      setEditData(null);
      setFormData({
        name: "",
        username: "",
        password: "",
        role_id: 3,
        phone: "",
      });
    }
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.username) {
      toast.error("Nama dan username wajib diisi");
      return;
    }
    if (!editData && !formData.password) {
      toast.error("Password wajib diisi untuk pengguna baru");
      return;
    }

    setSubmitting(true);
    try {
      if (editData) {
        await request.put(API_ENDPOINTS.USERS.UPDATE(editData.id), formData);
        toast.success("Data PIC/pengguna berhasil diperbarui");
      } else {
        await request.post(API_ENDPOINTS.USERS.CREATE, formData);
        toast.success("PIC baru berhasil ditambahkan");
      }
      setModalOpen(false);
      fetchUsers();
    } catch (err) {
      toast.error(err.message || "Gagal menyimpan data pengguna");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setDeleteConfirm((prev) => ({ ...prev, loading: true }));
    try {
      await request.del(API_ENDPOINTS.USERS.DELETE(deleteConfirm.id));
      toast.success("Pengguna berhasil dihapus");
      setDeleteConfirm({ isOpen: false, id: null, loading: false });
      fetchUsers();
    } catch (err) {
      toast.error(err.message || "Gagal menghapus pengguna");
      setDeleteConfirm((prev) => ({ ...prev, loading: false }));
    }
  };

  const getRoleBadge = (role) => {
    const map = {
      owner: "bg-purple-50 text-purple-700 border-purple-200",
      admin: "bg-blue-50 text-blue-700 border-blue-200",
      cutting: "bg-amber-50 text-amber-700 border-amber-200",
      sewing: "bg-emerald-50 text-emerald-700 border-emerald-200",
      finishing: "bg-cyan-50 text-cyan-700 border-cyan-200",
      qc: "bg-rose-50 text-rose-700 border-rose-200",
      packing: "bg-indigo-50 text-indigo-700 border-indigo-200",
    };
    return map[role] || "bg-slate-100 text-slate-700 border-slate-200";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <Users className="w-6 h-6 text-indigo-600" />
            <span>Master PIC & Pengguna Sistem</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manajemen petugas divisi Cutting, Sewing, Finishing, QC, dan Administrator
          </p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="flex items-center justify-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-xs transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah PIC Baru</span>
        </button>
      </div>

      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
        <SearchInput
          value={search}
          onChange={(val) => {
            setSearch(val);
            setCurrentPage(1);
          }}
          placeholder="Cari nama, username, peran PIC..."
        />
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <TableSkeleton rows={4} cols={5} />
          ) : users.length === 0 ? (
            <EmptyState
              title="Belum Ada Pengguna"
              description="Tambahkan akun petugas lantai produksi pertama Anda."
            />
          ) : (
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Nama Petugas</th>
                  <th className="py-3.5 px-4">Username</th>
                  <th className="py-3.5 px-4">Divisi / Peran</th>
                  <th className="py-3.5 px-4">No. HP</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{u.name}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-500 text-xs">@{u.username}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-lg text-xs font-bold border uppercase tracking-wider ${getRoleBadge(
                          u.role_name
                        )}`}
                      >
                        {u.role_display_name || u.role_name}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600 font-medium">
                      {u.phone ? (
                        <div className="flex items-center space-x-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{u.phone}</span>
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => handleOpenModal(u)}
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Ubah Pengguna"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {u.id !== 1 && u.id !== 2 && (
                          <button
                            onClick={() => setDeleteConfirm({ isOpen: true, id: u.id, loading: false })}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Hapus Pengguna"
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

        {!loading && users.length > 0 && (
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

      {/* User Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editData ? "Ubah Data PIC" : "Tambah PIC Baru"}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nama Lengkap <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Contoh: Budi Santoso"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Username <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s+/g, "") })}
                placeholder="budi_cutting"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {editData ? "Ganti Password (Opsional)" : "Password *"}
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={editData ? "Kosongkan jika tetap" : "password123"}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                required={!editData}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Divisi / Posisi <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.role_id}
                onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.display_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">No. HP</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="0812xxxx"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-slate-600 hover:text-slate-800 bg-slate-100 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs flex items-center space-x-2 transition-all disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{editData ? "Simpan Perubahan" : "Simpan PIC"}</span>
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null, loading: false })}
        onConfirm={handleDelete}
        loading={deleteConfirm.loading}
        title="Hapus Akun PIC"
        message="Apakah Anda yakin ingin menghapus akun petugas ini?"
      />
    </div>
  );
};
