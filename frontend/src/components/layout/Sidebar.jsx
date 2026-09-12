import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Layers,
  ArrowLeftRight,
  ShieldCheck,
  QrCode,
  Users,
  Shirt,
  Contact,
  FileBarChart2,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export const Sidebar = ({ isOpen, onClose, isCollapsed }) => {
  const { user } = useAuth();
  const role = user?.role || "admin";
  const isOwnerOrAdmin = role === "owner" || role === "admin";

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard, roles: ["all"] },
    { name: "Pesanan Produksi", href: "/orders", icon: Layers, roles: ["all"] },
    { name: "Serah Terima (Transit)", href: "/handovers", icon: ArrowLeftRight, roles: ["all"] },
    { name: "QC & Rework", href: "/qc", icon: ShieldCheck, roles: ["all"] },
    { name: "Scan Barcode / QR", href: "/scan", icon: QrCode, roles: ["all"] },
    ...(isOwnerOrAdmin
      ? [
          { header: "Master Data" },
          { name: "Produk Pakaian", href: "/products", icon: Shirt, roles: ["owner", "admin"] },
          { name: "Pelanggan / Klien", href: "/customers", icon: Contact, roles: ["owner", "admin"] },
          { name: "Pengguna & PIC", href: "/users", icon: Users, roles: ["owner", "admin"] },
          { header: "Laporan" },
          { name: "Laporan & Produktivitas", href: "/reports", icon: FileBarChart2, roles: ["owner", "admin"] },
        ]
      : []),
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden transition-opacity duration-300 ease-in-out"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 bg-white border-r border-slate-200 transition-all duration-300 ease-in-out flex flex-col ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } ${isCollapsed ? "lg:w-20" : "w-64"}`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-base shadow-sm flex-shrink-0">
              GT
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="font-extrabold text-slate-900 text-base tracking-tight leading-none">
                  Garment<span className="text-indigo-600">Track</span>
                </span>
                <span className="text-[11px] text-slate-500 font-medium tracking-wide mt-0.5">
                  Production System
                </span>
              </div>
            )}
          </div>

          {/* Close button on mobile */}
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navigation.map((item, idx) => {
            if (item.header) {
              if (isCollapsed) return null;
              return (
                <div
                  key={idx}
                  className="pt-4 pb-1.5 px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider"
                >
                  {item.header}
                </div>
              );
            }

            const Icon = item.icon;

            return (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={() => {
                  if (window.innerWidth < 1024) onClose();
                }}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all group ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  } ${isCollapsed ? "justify-center px-2" : ""}`
                }
                title={isCollapsed ? item.name : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && <span className="truncate">{item.name}</span>}
              </NavLink>
            );
          })}
        </div>

        {/* Bottom User Info preview */}
        {!isCollapsed && (
          <div className="p-3 border-t border-slate-200">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <div className="text-xs text-slate-500 truncate">
                Role: <span className="text-slate-800 font-semibold capitalize">{user?.role}</span>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
