import React, { useRef } from "react";
import { Modal } from "@/components/common/Modal";
import { QRCodeSVG } from "qrcode.react";
import { Printer } from "lucide-react";

export const QRCodePrintModal = ({ isOpen, onClose, order }) => {
  const printRef = useRef(null);

  if (!order) return null;

  const handlePrint = () => {
    const printContent = printRef.current;
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>Cetak Tag Produksi - ${order.order_number}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; text-align: center; }
            .tag-box { border: 2px dashed #333; padding: 20px; max-width: 380px; margin: 0 auto; border-radius: 8px; }
            .title { font-size: 18px; font-weight: bold; margin-bottom: 4px; }
            .subtitle { font-size: 12px; color: #666; margin-bottom: 12px; }
            .qr-code { margin: 15px auto; }
            .order-number { font-size: 20px; font-weight: bold; letter-spacing: 1px; margin: 10px 0; }
            .meta-table { width: 100%; font-size: 12px; text-align: left; margin-top: 10px; border-collapse: collapse; }
            .meta-table td { padding: 4px 6px; border-bottom: 1px solid #eee; }
            .meta-table td.label { font-weight: bold; width: 40%; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <script>
            window.onload = function() {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cetak Tag Barcode Produksi" maxWidth="max-w-md">
      <div className="space-y-4">
        {/* Printable Tag Container */}
        <div
          ref={printRef}
          className="p-5 bg-white text-slate-900 rounded-xl border border-slate-200 shadow-xs text-center"
        >
          <div className="tag-box">
            <h4 className="title font-bold text-slate-900">TAG PRODUKSI GARMEN</h4>
            <p className="subtitle text-xs text-slate-500">Sistem Pelacakan Alur Ekspedisi Produksi</p>

            <div className="qr-code flex justify-center py-2">
              <QRCodeSVG
                value={order.order_number}
                size={180}
                level="H"
                includeMargin={true}
              />
            </div>

            <div className="order-number font-mono font-bold text-slate-900">{order.order_number}</div>

            <table className="meta-table w-full text-xs text-left">
              <tbody>
                <tr>
                  <td className="label font-bold text-slate-700 py-1">Pelanggan:</td>
                  <td className="text-slate-900 font-semibold">{order.customer_name || "N/A"}</td>
                </tr>
                <tr>
                  <td className="label font-bold text-slate-700 py-1">Kode Seri:</td>
                  <td className="text-slate-900 font-bold">{order.serial_number || "-"}</td>
                </tr>
                <tr>
                  <td className="label font-bold text-slate-700 py-1">No. Order / SPK:</td>
                  <td className="font-mono font-bold text-slate-900">{order.order_number}</td>
                </tr>
                <tr>
                  <td className="label font-bold text-slate-700 py-1">Penjahit:</td>
                  <td className="text-slate-900 font-bold">{order.tailor_name || "-"}</td>
                </tr>
                <tr>
                  <td className="label font-bold text-slate-700 py-1">Produk:</td>
                  <td className="text-slate-900">{order.product_name || "N/A"}</td>
                </tr>
                <tr>
                  <td className="label font-bold text-slate-700 py-1">Target Qty:</td>
                  <td>
                    <strong className="text-indigo-700 font-black">{order.target_qty} PCS</strong>
                  </td>
                </tr>
                <tr>
                  <td className="label font-bold text-slate-700 py-1">Batas Waktu:</td>
                  <td className="text-slate-900">{order.deadline || "Belum ditentukan"}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 bg-slate-100 rounded-xl transition-colors font-medium"
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs flex items-center space-x-2 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Tag / Label</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
