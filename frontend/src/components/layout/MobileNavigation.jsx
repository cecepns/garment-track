import React from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, Layers, ArrowLeftRight, ShieldCheck, QrCode, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export const MobileNavigation = ({ onOpenScanner }) => {
  const { user } = useAuth();
  const isPicRole = ["cutting", "sewing", "finishing", "qc", "packing"].includes(user?.role);

  // Navigasi Ultra Simpel Khusus PIC Lansia (Hanya Tugas Saya & Scan Cepat)
  if (isPicRole) {
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 lg:hidden px-4 py-2 flex items-center justify-around shadow-lg">
        <NavLink
          to="/"
          className={({ isActive }) =>
            `flex flex-col items-center py-1 px-3 text-xs font-bold transition-colors ${isActive ? "text-[#EE4D2D]" : "text-slate-500 hover:text-slate-800"
            }`
          }
        >
          <LayoutDashboard className="w-6 h-6 mb-1" />
          <span>Tugas</span>
        </NavLink>

        {/* Center Prominent Scan Button */}
        <button
          onClick={onOpenScanner}
          className="relative -top-4 flex flex-col items-center group focus:outline-none"
        >
          <div className="w-14 h-14 p-3.5 rounded-full bg-[#EE4D2D] text-white shadow-lg border-4 border-slate-50 group-hover:scale-105 active:scale-95 transition-transform flex items-center justify-center">
            <QrCode className="w-7 h-7" />
          </div>
          <span className="text-[11px] font-black text-[#EE4D2D] mt-0.5">SCAN QR</span>
        </button>

        <NavLink
          to="/scan"
          className={({ isActive }) =>
            `flex flex-col items-center py-1 px-3 text-xs font-bold transition-colors ${isActive ? "text-[#EE4D2D]" : "text-slate-500 hover:text-slate-800"
            }`
          }
        >
          <CheckCircle2 className="w-6 h-6 mb-1" />
          <span>Cari SPK</span>
        </NavLink>
      </nav>
    );
  }

  // Navigasi Lengkap untuk Admin & Owner
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 lg:hidden px-2 py-1.5 flex items-center justify-around shadow-lg">
      <NavLink
        to="/"
        className={({ isActive }) =>
          `flex flex-col items-center py-1 px-2 text-[10px] font-semibold transition-colors ${isActive ? "text-indigo-600" : "text-slate-500 hover:text-slate-800"
          }`
        }
      >
        <LayoutDashboard className="w-5 h-5 mb-0.5" />
        <span>Beranda</span>
      </NavLink>

      <NavLink
        to="/orders"
        className={({ isActive }) =>
          `flex flex-col items-center py-1 px-2 text-[10px] font-semibold transition-colors ${isActive ? "text-indigo-600" : "text-slate-500 hover:text-slate-800"
          }`
        }
      >
        <Layers className="w-5 h-5 mb-0.5" />
        <span>Pesanan</span>
      </NavLink>

      {/* Center Prominent Scan Button */}
      <button
        onClick={onOpenScanner}
        className="relative -top-4 flex flex-col items-center group focus:outline-none"
      >
        <div className="w-13 h-13 p-3 rounded-full bg-indigo-600 text-white shadow-md border-4 border-slate-50 group-hover:scale-105 transition-transform flex items-center justify-center">
          <QrCode className="w-6 h-6" />
        </div>
        <span className="text-[10px] font-bold text-indigo-600 mt-0.5">SCAN QR</span>
      </button>

      <NavLink
        to="/handovers"
        className={({ isActive }) =>
          `flex flex-col items-center py-1 px-2 text-[10px] font-semibold transition-colors ${isActive ? "text-indigo-600" : "text-slate-500 hover:text-slate-800"
          }`
        }
      >
        <ArrowLeftRight className="w-5 h-5 mb-0.5" />
        <span>Transit</span>
      </NavLink>

      <NavLink
        to="/qc"
        className={({ isActive }) =>
          `flex flex-col items-center py-1 px-2 text-[10px] font-semibold transition-colors ${isActive ? "text-indigo-600" : "text-slate-500 hover:text-slate-800"
          }`
        }
      >
        <ShieldCheck className="w-5 h-5 mb-0.5" />
        <span>QC</span>
      </NavLink>
    </nav>
  );
};

