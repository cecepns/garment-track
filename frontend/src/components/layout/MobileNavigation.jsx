import React from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, Layers, ArrowLeftRight, ShieldCheck, QrCode } from "lucide-react";

export const MobileNavigation = ({ onOpenScanner }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 lg:hidden px-2 py-1.5 flex items-center justify-around shadow-lg">
      <NavLink
        to="/"
        className={({ isActive }) =>
          `flex flex-col items-center py-1 px-2 text-[10px] font-semibold transition-colors ${
            isActive ? "text-indigo-600" : "text-slate-500 hover:text-slate-800"
          }`
        }
      >
        <LayoutDashboard className="w-5 h-5 mb-0.5" />
        <span>Beranda</span>
      </NavLink>

      <NavLink
        to="/orders"
        className={({ isActive }) =>
          `flex flex-col items-center py-1 px-2 text-[10px] font-semibold transition-colors ${
            isActive ? "text-indigo-600" : "text-slate-500 hover:text-slate-800"
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
          `flex flex-col items-center py-1 px-2 text-[10px] font-semibold transition-colors ${
            isActive ? "text-indigo-600" : "text-slate-500 hover:text-slate-800"
          }`
        }
      >
        <ArrowLeftRight className="w-5 h-5 mb-0.5" />
        <span>Transit</span>
      </NavLink>

      <NavLink
        to="/qc"
        className={({ isActive }) =>
          `flex flex-col items-center py-1 px-2 text-[10px] font-semibold transition-colors ${
            isActive ? "text-indigo-600" : "text-slate-500 hover:text-slate-800"
          }`
        }
      >
        <ShieldCheck className="w-5 h-5 mb-0.5" />
        <span>QC</span>
      </NavLink>
    </nav>
  );
};
