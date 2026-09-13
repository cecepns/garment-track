import React, { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/common/Modal";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, Upload, AlertCircle, RefreshCw } from "lucide-react";
import { playScanSound } from "@/utils/audio";
import toast from "react-hot-toast";

export const QRScannerModal = ({ isOpen, onClose, onScanSuccess }) => {
  const [manualInput, setManualInput] = useState("");
  const [cameraError, setCameraError] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef(null);
  const qrRegionId = "qr-reader-region";

  useEffect(() => {
    let html5QrCode = null;

    if (isOpen) {
      setCameraError(null);
      setManualInput("");

      const timer = setTimeout(async () => {
        try {
          html5QrCode = new Html5Qrcode(qrRegionId);
          scannerRef.current = html5QrCode;

          await html5QrCode.start(
            { facingMode: "environment" },
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
            },
            (decodedText) => {
              playScanSound();
              toast.success(`Barcode terdeteksi: ${decodedText}`);
              stopScanner();
              onScanSuccess(decodedText);
            },
            () => {}
          );
          setIsScanning(true);
        } catch (err) {
          console.warn("Camera start failed:", err);
          setCameraError("Tidak dapat mengakses kamera. Pastikan izin kamera aktif atau gunakan input manual.");
          setIsScanning(false);
        }
      }, 300);

      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    } else {
      stopScanner();
    }
  }, [isOpen]);

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        // silent
      }
      scannerRef.current = null;
      setIsScanning(false);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualInput.trim()) {
      toast.error("Masukkan kode pesanan / barcode");
      return;
    }
    playScanSound();
    stopScanner();
    onScanSuccess(manualInput.trim());
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const html5QrCode = new Html5Qrcode("qr-file-region");
      const decoded = await html5QrCode.scanFile(file, true);
      playScanSound();
      toast.success(`Berhasil memindai file QR: ${decoded}`);
      stopScanner();
      onScanSuccess(decoded);
    } catch (err) {
      toast.error("Tidak dapat membaca QR code dari gambar tersebut");
    }
  };


  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Scan Barcode / QR Produksi" maxWidth="max-w-md">
      <div className="space-y-4">
        {/* Camera Viewport */}
        <div className="relative overflow-hidden rounded-2xl bg-black border border-slate-200 min-h-[280px] flex items-center justify-center">
          <div id={qrRegionId} className="w-full h-full" />
          <div id="qr-file-region" className="hidden" />

          {cameraError && (
            <div className="absolute inset-0 p-6 flex flex-col items-center justify-center text-center bg-white/95 z-20">
              <AlertCircle className="w-10 h-10 text-amber-500 mb-2" />
              <p className="text-xs text-slate-700 leading-relaxed mb-4">{cameraError}</p>
            </div>
          )}

          {isScanning && !cameraError && (
            <div className="absolute top-3 left-3 px-2.5 py-1 bg-black/60 backdrop-blur-xs rounded-md border border-white/20 flex items-center space-x-1.5 z-10">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-[10px] text-white font-bold">Kamera Aktif</span>
            </div>
          )}
        </div>

        {/* Upload QR Image File Option */}
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <label className="flex items-center space-x-2 cursor-pointer hover:text-indigo-600 transition-colors font-medium">
            <Upload className="w-4 h-4" />
            <span>Upload Foto Barcode/QR</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>
        </div>

        {/* Manual Input Fallback */}
        <div className="pt-3 border-t border-slate-100">
          <label className="block text-xs font-bold text-slate-700 mb-2">
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
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-xs transition-colors"
            >
              Cek
            </button>
          </form>
        </div>
      </div>
    </Modal>
  );
};
