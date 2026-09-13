import React, { useState, useEffect } from "react";
import { Download, Smartphone, X, Share2, PlusSquare, ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import toast from "react-hot-toast";

export const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  // Default TRUE agar popup langsung muncul seketika di layar!
  const [showPrompt, setShowPrompt] = useState(true);
  const [showManualGuide, setShowManualGuide] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // 1. Cek apakah aplikasi sudah berjalan dalam mode standalone (PWA sudah terinstall)
    const checkStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone ||
      document.referrer.includes("android-app://");

    if (checkStandalone) {
      setIsStandalone(true);
      setShowPrompt(false);
      return;
    }

    // 2. Deteksi perangkat iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    const isSafari = /safari/.test(userAgent) && !/chrome|crios|fxios/.test(userAgent);
    setIsIOS(isIosDevice && isSafari);

    // 3. Tangkap event install PWA dari browser jika didukung
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    const handleAppInstalled = () => {
      setShowPrompt(false);
      setShowManualGuide(false);
      setDeferredPrompt(null);
      toast.success("Aplikasi GarmentTrack berhasil diinstal ke HP/Layar Utama!", {
        duration: 5000,
        icon: "🎉",
      });
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === "accepted") {
          toast.success("Memasang aplikasi ke perangkat Anda...");
          setShowPrompt(false);
        }
        setDeferredPrompt(null);
      } catch (err) {
        console.warn("PWA install error:", err);
      }
    } else {
      // Jika browser belum / tidak mendukung prompt otomatis satu-klik (seperti Safari iOS atau browser tertentu)
      setShowManualGuide(true);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  if (isStandalone || !showPrompt) return null;

  return (
    <>
      {/* Floating Popup Utama */}
      <div className="fixed bottom-20 lg:bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:w-96 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border-2 border-orange-500/40 p-4 sm:p-5 relative overflow-hidden">
          {/* Accent top gradient bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-orange-500 via-[#EE4D2D] to-indigo-600" />

          {/* Close Button */}
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Tutup Popup"
          >
            <X className="w-4 h-4" />
          </button>

          {/* App Header & Icon */}
          <div className="flex items-center space-x-3.5 pr-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#EE4D2D] to-orange-500 text-white flex items-center justify-center font-black text-lg shadow-md flex-shrink-0">
              GT
            </div>

            <div>
              <div className="flex items-center space-x-1.5">
                <h4 className="font-black text-slate-900 text-base tracking-tight leading-none">
                  Garment<span className="text-[#EE4D2D]">Track</span> PWA
                </h4>
                <span className="px-1.5 py-0.5 rounded-md bg-orange-100 text-orange-800 text-[10px] font-black uppercase">
                  Mobile App
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Pasang di layar HP seperti aplikasi toko/playstore!
              </p>
            </div>
          </div>

          {/* Prominent Direct Install Button */}
          <div className="mt-4 pt-1 space-y-2">
            <button
              onClick={handleInstallClick}
              className="w-full py-3 px-4 bg-gradient-to-r from-[#EE4D2D] to-orange-600 hover:from-[#d63d1e] hover:to-orange-700 active:scale-98 text-white font-black text-sm rounded-xl shadow-lg shadow-orange-500/20 flex items-center justify-center space-x-2 transition-all cursor-pointer"
            >
              <Download className="w-5 h-5" />
              <span>INSTALL APLIKASI SEKARANG</span>
            </button>

            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] text-slate-400 font-semibold">
                ✓ Ringan • Tanpa Kuota Besar
              </span>
              <button
                onClick={handleDismiss}
                className="text-[11px] font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                Nanti Saja
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Manual Guide Modal (jika browser tidak mendukung auto-prompt window.deferredPrompt) */}
      {showManualGuide && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-orange-100 text-[#EE4D2D] flex items-center justify-center mx-auto mb-3 font-bold">
              <Smartphone className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-black text-slate-900 text-center tracking-tight">
              Cara Memasang ke Layar Utama
            </h3>

            {isIOS ? (
              <div className="mt-4 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-2.5">
                <div className="flex items-center space-x-2 font-bold text-amber-900">
                  <Share2 className="w-4 h-4 text-amber-700" />
                  <span>Petunjuk iPhone / iPad (Safari):</span>
                </div>
                <p className="leading-relaxed">
                  1. Ketuk ikon <span className="font-bold">Bagikan (Share / Kotak Panah)</span> di bilah bawah browser Safari.
                </p>
                <p className="leading-relaxed flex items-center space-x-1">
                  <span>2. Gulir ke bawah dan pilih</span>
                  <PlusSquare className="w-3.5 h-3.5 inline mx-1 text-slate-800" />
                  <span className="font-bold">"Tambahkan ke Layar Utama"</span>.
                </p>
              </div>
            ) : (
              <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-2.5">
                <div className="flex items-center space-x-2 font-bold text-slate-900">
                  <Download className="w-4 h-4 text-[#EE4D2D]" />
                  <span>Petunjuk Browser Android / Chrome:</span>
                </div>
                <p className="leading-relaxed">
                  1. Ketuk ikon titik tiga <span className="font-bold">(⋮)</span> di pojok kanan atas browser Anda.
                </p>
                <p className="leading-relaxed">
                  2. Pilih menu <span className="font-bold text-[#EE4D2D]">"Tambahkan ke Layar Utama"</span> atau <span className="font-bold text-[#EE4D2D]">"Install Aplikasi"</span>.
                </p>
              </div>
            )}

            <button
              onClick={() => setShowManualGuide(false)}
              className="mt-5 w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl cursor-pointer"
            >
              Mengerti, Terima Kasih
            </button>
          </div>
        </div>
      )}
    </>
  );
};
