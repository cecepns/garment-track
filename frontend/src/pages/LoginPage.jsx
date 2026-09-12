import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Lock, User, QrCode, ArrowRight, Loader2, Sparkles } from "lucide-react";

export const LoginPage = () => {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("password123");
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await login(username, password);
    if (success) {
      navigate("/");
    }
  };

  const demoAccounts = [
    { label: "Owner", user: "owner", desc: "Direktur / Monitoring" },
    { label: "Admin", user: "admin", desc: "Order & Master Data" },
    { label: "PIC Cutting", user: "pic_cutting", desc: "Potong Kain" },
    { label: "PIC Sewing", user: "pic_sewing", desc: "Penjahit Pakaian" },
    { label: "PIC Finishing", user: "pic_finishing", desc: "Buang Benang & Gosok" },
    { label: "PIC QC", user: "pic_qc", desc: "Inspeksi Kualitas" },
    { label: "PIC Packing", user: "pic_packing", desc: "Pengemasan & Kirim" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 px-4 relative">
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        {/* Brand Icon */}
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 shadow-sm text-white mb-3">
          <QrCode className="w-7 h-7" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Garment<span className="text-indigo-600">Track</span>
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Sistem Manajemen & Pelacakan Produksi Garment
        </p>
      </div>

      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white py-8 px-6 sm:px-10 border border-slate-200 rounded-2xl shadow-sm">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Username</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm shadow-sm transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>Masuk ke Sistem</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Account Selector */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Login Cepat Akun Demo (Role):</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {demoAccounts.map((demo) => (
                <button
                  key={demo.user}
                  type="button"
                  onClick={() => {
                    setUsername(demo.user);
                    setPassword("password123");
                  }}
                  className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${username === demo.user
                      ? "bg-indigo-50 border-indigo-300 text-indigo-900"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                >
                  <p className="text-xs font-bold truncate">{demo.label}</p>
                  <p className="text-[10px] text-slate-500 truncate">{demo.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
