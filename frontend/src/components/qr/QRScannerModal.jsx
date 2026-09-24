import React, { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/common/Modal";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, Upload, AlertCircle, RefreshCw, Info, CheckCircle2 } from "lucide-react";
import { playErrorSound, warmAudio } from "@/utils/audio";
import toast from "react-hot-toast";

export const QRScannerModal = ({ isOpen, onClose, onScanSuccess }) => {
  const [manualInput, setManualInput] = useState("");
  const [cameraError, setCameraError] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cameras, setCameras] = useState([]);
  const [activeCameraIndex, setActiveCameraIndex] = useState(0);
  const [isBlackScreenWarning, setIsBlackScreenWarning] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  const scannerRef = useRef(null);
  const isLockedRef = useRef(false);
  const qrRegionId = "qr-reader-region";

  const isIOS = typeof window !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone =
    typeof window !== "undefined" &&
    (window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone);

  useEffect(() => {
    let timeoutId = null;

    if (isOpen) {
      isLockedRef.current = false;
      setCameraError(null);
      setManualInput("");
      setIsBlackScreenWarning(false);

      // Berikan jeda 350ms agar animasi modal selesai dan ukuran container sudah pasti di DOM
      timeoutId = setTimeout(() => {
        initAndStartCamera();
      }, 350);

      return () => {
        if (timeoutId) clearTimeout(timeoutId);
        stopScanner();
      };
    } else {
      stopScanner();
    }
  }, [isOpen]);

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (err) {
        // silent cleanup
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const initAndStartCamera = async (targetCameraId = null) => {
    try {
      setCameraError(null);
      setIsBlackScreenWarning(false);

      if (scannerRef.current) {
        await stopScanner();
      }

      const html5QrCode = new Html5Qrcode(qrRegionId);
      scannerRef.current = html5QrCode;

      // 1. Dapatkan daftar kamera fisik (terutama berguna untuk multi-lensa iPhone)
      let deviceList = cameras;
      if (!deviceList || deviceList.length === 0) {
        try {
          deviceList = await Html5Qrcode.getCameras();
          if (deviceList && deviceList.length > 0) {
            setCameras(deviceList);
          }
        } catch (camErr) {
          console.warn("Could not enumerate camera devices:", camErr);
        }
      }

      // 2. Tentukan target kamera (prioritaskan kamera belakang / environment)
      let cameraConfig = targetCameraId;
      if (!cameraConfig) {
        if (deviceList && deviceList.length > 0) {
          const backCam =
            deviceList.find((d) => /back|rear|belakang|environment/i.test(d.label)) ||
            deviceList[deviceList.length - 1];
          cameraConfig = backCam.id;
        } else {
          cameraConfig = { facingMode: "environment" };
        }
      }

      // 3. Jalankan start pemindaian
      await html5QrCode.start(
        cameraConfig,
        {
          fps: 10,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const edge = Math.floor(minEdge * 0.72);
            return { width: Math.max(edge, 180), height: Math.max(edge, 180) };
          },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          if (isLockedRef.current) return;
          isLockedRef.current = true;
          warmAudio();
          stopScanner();
          onScanSuccess(decodedText);
        },
        () => {}
      );

      setIsScanning(true);

      // 4. FIX KRUSIAL UNTUK IOS WEBKIT / PWA STANDALONE:
      // iOS membutuhkan attribute playsinline & muted secara eksplisit agar stream video tidak freeze/black
      setTimeout(() => {
        const videoEl = document.querySelector(`#${qrRegionId} video`);
        if (videoEl) {
          videoEl.setAttribute("playsinline", "true");
          videoEl.setAttribute("webkit-playsinline", "true");
          videoEl.setAttribute("autoplay", "true");
          videoEl.muted = true;
          videoEl.style.width = "100%";
          videoEl.style.height = "100%";
          videoEl.style.objectFit = "cover";
          videoEl.play().catch((playErr) => console.warn("Video play notice:", playErr));

          // Deteksi apakah video mengalami black frame (readyState < 2 atau videoWidth 0) setelah 1.5 detik
          setTimeout(() => {
            if (videoEl.videoWidth === 0 || videoEl.paused) {
              console.warn("Detected possible iOS PWA video rendering restriction");
              setIsBlackScreenWarning(true);
            }
          }, 1500);
        }
      }, 150);
    } catch (err) {
      console.warn("Camera start failed:", err);
      setCameraError(
        "Tidak dapat memulai live video kamera. Silakan gunakan tombol 'Ambil Foto QR' di bawah atau periksa izin kamera."
      );
      setIsScanning(false);
    }
  };

  // Fungsi beralih lensa (berguna di iPhone multi-kamera jika lensa default 0.5x ultra-wide hitam)
  const handleSwitchCamera = async () => {
    if (cameras.length > 1) {
      const nextIdx = (activeCameraIndex + 1) % cameras.length;
      setActiveCameraIndex(nextIdx);
      const nextCam = cameras[nextIdx];
      toast.loading(`Beralih lensa: ${nextCam.label || `Kamera ${nextIdx + 1}`}`, { duration: 1500 });
      await initAndStartCamera(nextCam.id);
    } else {
      toast.loading("Memuat ulang kamera...", { duration: 1200 });
      await initAndStartCamera();
    }
  };

  // Fungsi scan gambar/foto baik dari kamera native iOS maupun galeri
  const handleFileScan = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    warmAudio();
    setIsProcessingFile(true);
    const toastId = toast.loading("Memindai barcode dari foto...");
    try {
      const fileScanner = new Html5Qrcode("qr-file-region");
      const decoded = await fileScanner.scanFile(file, true);
      toast.dismiss(toastId);
      await stopScanner();
      onScanSuccess(decoded);
    } catch (err) {
      toast.dismiss(toastId);
      playErrorSound();
      toast.error("QR Code tidak terbaca. Pastikan foto tegak, fokus, dan pencahayaan cukup.");
    } finally {
      setIsProcessingFile(false);
      e.target.value = "";
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    const code = manualInput.trim();
    if (!code) {
      toast.error("Masukkan kode pesanan / barcode");
      return;
    }
    warmAudio();
    stopScanner();
    onScanSuccess(code);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Scan Barcode / QR Produksi" maxWidth="max-w-md">
      <div className="space-y-4">
        {/* Camera Viewport */}
        <div className="relative overflow-hidden rounded-2xl bg-black border border-slate-200 min-h-[280px] flex items-center justify-center">
          <div id={qrRegionId} className="w-full h-full min-h-[280px]" />
          <div id="qr-file-region" className="hidden" />

          {/* Status Badge Live Kamera */}
          {isScanning && !cameraError && (
            <div className="absolute top-3 left-3 px-2.5 py-1 bg-black/70 backdrop-blur-xs rounded-lg border border-white/20 flex items-center space-x-1.5 z-10">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-[10px] text-white font-bold">Kamera Aktif</span>
            </div>
          )}

          {/* Tombol Ganti / Refresh Lensa Kamera */}
          {isScanning && (
            <button
              onClick={handleSwitchCamera}
              className="absolute top-3 right-3 px-2.5 py-1 bg-black/70 hover:bg-black/90 active:scale-95 text-white backdrop-blur-xs rounded-lg border border-white/20 flex items-center space-x-1.5 z-10 text-[10px] font-bold transition-all cursor-pointer"
              title="Ganti Lensa Kamera"
            >
              <RefreshCw className="w-3 h-3" />
              <span>{cameras.length > 1 ? "Ganti Lensa" : "Refresh"}</span>
            </button>
          )}

          {/* Error Layar Kamera */}
          {cameraError && (
            <div className="absolute inset-0 p-6 flex flex-col items-center justify-center text-center bg-white/95 z-20">
              <AlertCircle className="w-10 h-10 text-amber-500 mb-2" />
              <p className="text-xs text-slate-700 leading-relaxed mb-4">{cameraError}</p>
              <button
                onClick={() => initAndStartCamera()}
                className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-colors"
              >
                Coba Lagi
              </button>
            </div>
          )}

          {/* Hint Overlay jika layar terdeteksi hitam di iOS PWA */}
          {isBlackScreenWarning && isScanning && !cameraError && (
            <div className="absolute bottom-3 inset-x-3 p-2.5 bg-slate-900/90 backdrop-blur-md rounded-xl border border-amber-500/40 text-left z-10 animate-in fade-in duration-300">
              <div className="flex items-start space-x-2">
                <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-[11px] text-white font-medium leading-snug">
                    Layar live video hitam di iPhone? Ini pembatasan sistem iOS PWA.
                  </p>
                  <p className="text-[10px] text-amber-300 font-bold mt-0.5">
                    Gunakan tombol "Ambil Foto QR" di bawah agar langsung terbaca.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons: Native Camera Capture & Gallery Upload */}
        <div className="grid grid-cols-2 gap-2">
          {/* Tombol Kamera Langsung Native (Solusi 100% Berhasil di Semua iOS/Android) */}
          <label className="flex items-center justify-center space-x-1.5 py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-all">
            <Camera className="w-4 h-4" />
            <span>Ambil Foto QR</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              disabled={isProcessingFile}
              className="hidden"
              onChange={handleFileScan}
            />
          </label>

          {/* Tombol Upload dari Galeri */}
          <label className="flex items-center justify-center space-x-1.5 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 active:scale-98 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-all">
            <Upload className="w-4 h-4" />
            <span>Pilih Galeri</span>
            <input
              type="file"
              accept="image/*"
              disabled={isProcessingFile}
              className="hidden"
              onChange={handleFileScan}
            />
          </label>
        </div>

        {/* Informasi Bantuan Khusus iOS PWA */}
        {isIOS && isStandalone && (
          <div className="px-3 py-2 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center space-x-2 text-[11px] text-amber-900">
            <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>
              Di iPhone PWA, jika video preview hitam, ketuk <b>"Ambil Foto QR"</b> untuk memindai via kamera bawaan HP.
            </span>
          </div>
        )}

        {/* Manual Input Fallback */}
        <div className="pt-3 border-t border-slate-100">
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Atau Ketik No. SPK / Kode Barcode:
          </label>
          <form onSubmit={handleManualSubmit} className="flex space-x-2">
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="Contoh: ORD-2026-0001"
              className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold shadow-xs transition-colors cursor-pointer"
            >
              Cek
            </button>
          </form>
        </div>
      </div>
    </Modal>
  );
};
