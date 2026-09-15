import React, { useState, useEffect } from "react";
import { Menu, LogOut, QrCode, Bell, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { request } from "@/utils/request";
import { API_ENDPOINTS } from "@/utils/endpoints";
import logoImg from "@/assets/logo.png";

export const Navbar = ({ onToggleSidebar, onOpenScanner }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [incomingCount, setIncomingCount] = useState(0);

  useEffect(() => {
    const fetchIncoming = async () => {
      try {
        const res = await request.get(API_ENDPOINTS.HANDOVERS.INCOMING);
        if (res.success && Array.isArray(res.data)) {
          setIncomingCount(res.data.length);
        }
      } catch (err) {
        // silent
      }
    };
    if (user) {
      fetchIncoming();
      const interval = setInterval(fetchIncoming, 20000);
      return () => clearInterval(interval);
    }
  }, [user]);

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
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 bg-white border-b border-slate-200 shadow-sm">
      {/* Left: Sidebar Toggle & Brand */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors focus:outline-none"
          title="Toggle Sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center shadow-xs">
            <img src={logoImg} alt="Ashirvada" className="w-full h-full object-contain" />
          </div>
          <span className="font-extrabold text-slate-900 tracking-tight text-base hidden sm:inline">
            Ashirvada <span className="text-indigo-600">Collection</span>
          </span>
        </div>
      </div>

      {/* Right: Quick Action QR, Notifications, Profile & Logout */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Quick QR Scanner Button */}
        <button
          onClick={onOpenScanner}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-600 hover:text-white transition-all text-xs font-semibold shadow-sm"
          title="Buka Kamera Scan QR Barcode"
        >
          <QrCode className="w-4 h-4" />
          <span className="hidden md:inline">Scan Barcode</span>
        </button>

        {/* Incoming Handover Notification Badge */}
        <button
          onClick={() => navigate("/handovers")}
          className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
          title="Serah Terima Masuk"
        >
          <Bell className="w-5 h-5" />
          {incomingCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
              {incomingCount}
            </span>
          )}
        </button>

        {/* User Info & Role Badge */}
        <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
          <div className="hidden sm:block text-right">
            <p className="text-xs font-bold text-slate-800 leading-tight">{user?.name}</p>
            <span
              className={`inline-block px-2 py-0.5 text-[10px] font-semibold rounded-md border mt-0.5 ${getRoleBadge(
                user?.role
              )}`}
            >
              {user?.role_display_name || user?.role}
            </span>
          </div>

          <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
            <User className="w-4 h-4" />
          </div>

          <button
            onClick={logout}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
            title="Keluar"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
