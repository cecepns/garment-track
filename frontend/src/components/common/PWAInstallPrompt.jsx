import React, { useState, useEffect } from "react";
import { Download, X, Share2, PlusSquare } from "lucide-react";
import toast from "react-hot-toast";
import logoImg from "@/assets/logo.png";

export const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(
    () => (typeof window !== "undefined" ? window.deferredPrompt : null)
  );
  const [isMobile, setIsMobile] = useState(false);
  const [showPrompt, setShowPrompt] = useState(true);
  const [showGuide, setShowGuide] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // 1. Cek apakah tampilan mobile (< 768px atau mobile userAgent)
    const checkMobile = () => {
      const isMobileWidth = window.innerWidth < 768;
      const isMobileAgent = /iphone|ipad|ipod|android|mobile/i.test(
        window.navigator.userAgent || ""
      );
      setIsMobile(isMobileWidth || isMobileAgent);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    // 2. Cek apakah sudah berjalan standalone (PWA sudah terinstall)
    const checkStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone ||
      document.referrer.includes("android-app://");

    if (checkStandalone) {
      setIsStandalone(true);
      setShowPrompt(false);
      return;
    }

    // 3. Deteksi iOS Safari
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua);
    const isSafari = /safari/.test(ua) && !/chrome|crios|fxios/.test(ua);
    setIsIOS(isIosDevice && isSafari);

    // 4. Tangkap event prompt instalasi
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      window.deferredPrompt = e;
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    const handlePromptReady = () => {
      if (window.deferredPrompt) {
        setDeferredPrompt(window.deferredPrompt);
        setShowPrompt(true);
      }
    };

    const handleAppInstalled = () => {
      setShowPrompt(false);
      setShowGuide(false);
      setDeferredPrompt(null);
      window.deferredPrompt = null;
      toast.success("Aplikasi Ashirvada berhasil diinstal!", { icon: "🎉" });
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("pwa-prompt-ready", handlePromptReady);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("resize", checkMobile);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("pwa-prompt-ready", handlePromptReady);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    const promptEvent = deferredPrompt || window.deferredPrompt;
    if (promptEvent) {
      try {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice?.outcome === "accepted") {
          toast.success("Memasang aplikasi Ashirvada...");
          setShowPrompt(false);
        }
        window.deferredPrompt = null;
        setDeferredPrompt(null);
      } catch (err) {
        setShowGuide(true);
      }
    } else {
      // Browser belum memicu prompt otomatis atau di iOS Safari
      setShowGuide(true);
    }
  };

  // Hanya muncul di mobile, tidak dalam mode standalone, dan belum ditutup
  if (!isMobile || isStandalone || !showPrompt) return null;

  return (
    <>
      {/* Floating Card Sederhana & Minimalis Khusus Mobile */}
      <div className="md:hidden fixed bottom-4 left-3 right-3 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200 p-3 flex items-center justify-between gap-2.5">
          {/* Logo & Info Singkat */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center flex-shrink-0 shadow-xs">
              <img
                src={logoImg}
                alt="Ashirvada"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <h4 className="font-bold text-slate-900 text-xs truncate leading-tight">
                Ashirvada App
              </h4>
              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                Install ke layar utama
              </p>
            </div>
          </div>

          {/* Action Button: Install & Close */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={handleInstall}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-semibold text-xs px-3 py-2 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install</span>
            </button>
            <button
              onClick={() => setShowPrompt(false)}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
              title="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Panduan Singkat Jika Dibutuhkan (misal Safari iOS) */}
      {showGuide && (
        <div className="md:hidden fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-2xl border border-slate-200 space-y-4 animate-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 p-1 flex items-center justify-center shadow-xs">
                  <img src={logoImg} alt="Ashirvada" className="w-full h-full object-contain" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Install Ashirvada</h3>
              </div>
              <button
                onClick={() => setShowGuide(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-2">
                <p className="flex items-center gap-1.5 font-medium">
                  1. Ketuk tombol <Share2 className="w-3.5 h-3.5 inline text-slate-800" /> <span className="font-bold">Share</span> di Safari.
                </p>
                <p className="flex items-center gap-1.5 font-medium">
                  2. Pilih <PlusSquare className="w-3.5 h-3.5 inline text-slate-800" /> <span className="font-bold">"Tambah ke Layar Utama"</span>.
                </p>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-2">
                <p className="font-medium">
                  1. Ketuk ikon titik tiga <span className="font-bold">(⋮)</span> di kanan atas browser.
                </p>
                <p className="font-medium">
                  2. Pilih menu <span className="font-bold text-indigo-600">"Install Aplikasi"</span> atau <span className="font-bold text-indigo-600">"Tambahkan ke Layar Utama"</span>.
                </p>
              </div>
            )}

            <button
              onClick={() => setShowGuide(false)}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl cursor-pointer transition-colors"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </>
  );
};
