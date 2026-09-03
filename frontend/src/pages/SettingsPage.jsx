import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Bluetooth, Printer, Check, Unplug } from "lucide-react";
import api from "../api/client";
import {
  connectBluetoothPrinter,
  disconnectBluetoothPrinter,
  getBluetoothPrinterStatus,
  printViaWebBluetooth,
  buildEscPosReceiptBinary,
  printViaRawBTBase64,
} from "../utils/receipt";

const defaultValues = {
  store_name: "",
  store_address: "",
  store_phone: "",
  receipt_footer: "",
  thermal_width_mm: "80",
  tax_default: "0",
  whatsapp_sender_note: "",
  enable_pay_cash: "1",
  enable_pay_transfer: "0",
  enable_pay_qris: "0",
  point_enabled: "1",
  point_per_amount: "10000",
};

export default function SettingsPage() {
  const form = useForm({ defaultValues });
  const [btStatus, setBtStatus] = useState(() => getBluetoothPrinterStatus());

  useEffect(() => {
    api.get("/api/settings").then(({ data }) => form.reset({ ...defaultValues, ...data }));
  }, [form]);

  async function onSubmit(v) {
    const t = toast.loading("Menyimpan...");
    try {
      await api.put("/api/settings", v);
      toast.success("Pengaturan disimpan", { id: t });
    } catch {
      toast.dismiss(t);
    }
  }

  async function handlePairBluetooth() {
    const t = toast.loading("Menghubungkan printer Bluetooth...");
    try {
      const dev = await connectBluetoothPrinter();
      setBtStatus(getBluetoothPrinterStatus());
      toast.success(`Terhubung ke ${dev.name || "Printer Bluetooth"}!`, { id: t });
    } catch (err) {
      toast.dismiss(t);
      toast.error(err.message || "Gagal menghubungkan printer");
    }
  }

  function handleUnpairBluetooth() {
    disconnectBluetoothPrinter();
    setBtStatus(getBluetoothPrinterStatus());
    toast.success("Printer Bluetooth dilepas");
  }

  async function handleTestPrint() {
    const t = toast.loading("Mencetak struk tes...");
    try {
      const binary = buildEscPosReceiptBinary({
        storeName: form.getValues("store_name") || "KING POS",
        storeAddress: form.getValues("store_address") || "Toko Kasir",
        invoiceNo: "TES-PRINTER",
        dateStr: new Date().toLocaleDateString("id-ID"),
        lines: [{ name: "Item Kertas Tes 58mm/80mm", qty: 1, sell_price: 10000, discount_amount: 0 }],
        subtotal: 10000,
        grandTotal: 10000,
        paidSum: 10000,
        changeAmount: 0,
        footer: "Printer Bluetooth Berhasil Terhubung!",
        widthMm: Number(form.getValues("thermal_width_mm")) || 58,
      });
      await printViaWebBluetooth(binary);
      toast.success("Struk tes berhasil dicetak!", { id: t });
    } catch (err) {
      toast.dismiss(t);
      toast.error(err.message || "Gagal mencetak struk tes. Coba gunakan tombol RawBT.");
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Pengaturan</h1>
        <p className="text-sm text-slate-500">Atur profil toko, struk cetak, dan konfigurasi printer thermal</p>
      </div>

      {/* Pengaturan Printer Bluetooth Thermal */}
      <div className="rounded-2xl border border-brand-200 bg-brand-50/60 p-5 shadow-soft dark:border-brand-900 dark:bg-slate-900 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-brand-900 dark:text-brand-300 text-sm">
            <Bluetooth className="h-5 w-5 text-brand-600 dark:text-brand-400" />
            <span>Pengaturan Printer Bluetooth Thermal</span>
          </div>
          {btStatus.hasSavedDevice ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              <Check className="h-3.5 w-3.5" /> Tersimpan
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
              Belum Diatur
            </span>
          )}
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          Hubungkan printer thermal Bluetooth Anda sekali di sini. Setelah terhubung, aplikasi akan mengingat printer tersebut dan Anda bisa langsung cetak struk dari POS tanpa perlu memilih perangkat lagi.
        </p>

        {btStatus.hasSavedDevice && (
          <div className="rounded-xl border border-brand-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950 flex items-center justify-between text-xs">
            <div>
              <p className="text-slate-500">Printer Terdaftar:</p>
              <p className="font-extrabold text-slate-900 dark:text-white text-sm mt-0.5">{btStatus.savedName}</p>
            </div>
            <button
              type="button"
              onClick={handleUnpairBluetooth}
              className="inline-flex items-center gap-1 text-red-600 hover:underline dark:text-red-400 font-semibold"
            >
              <Unplug className="h-3.5 w-3.5" /> Lepas Printer
            </button>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={handlePairBluetooth}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-xs font-bold text-white shadow-soft transition hover:bg-brand-700 active:scale-95"
          >
            <Bluetooth className="h-4 w-4" /> {btStatus.hasSavedDevice ? "Ganti / Re-connect Printer" : "Hubungkan Printer Bluetooth"}
          </button>
          {btStatus.hasSavedDevice && (
            <button
              type="button"
              onClick={handleTestPrint}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-800 shadow-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              <Printer className="h-4 w-4" /> Tes Cetak
            </button>
          )}
        </div>
      </div>

      <form className="space-y-4 rounded-2xl border bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900" onSubmit={form.handleSubmit(onSubmit)}>
        <div>
          <label className="text-xs text-slate-500">Nama toko</label>
          <input className="mt-1 w-full rounded-xl border px-3 py-2 dark:bg-slate-950" {...form.register("store_name")} />
        </div>
        <div>
          <label className="text-xs text-slate-500">Alamat (struk)</label>
          <textarea className="mt-1 w-full rounded-xl border px-3 py-2 dark:bg-slate-950" rows={2} {...form.register("store_address")} />
        </div>
        <div>
          <label className="text-xs text-slate-500">Telepon / WA toko</label>
          <input className="mt-1 w-full rounded-xl border px-3 py-2 dark:bg-slate-950" {...form.register("store_phone")} />
        </div>
        <div>
          <label className="text-xs text-slate-500">Footer struk</label>
          <input className="mt-1 w-full rounded-xl border px-3 py-2 dark:bg-slate-950" {...form.register("receipt_footer")} />
        </div>
        <div>
          <label className="text-xs text-slate-500">Lebar kertas termal (mm)</label>
          <input type="number" min={58} max={110} step={1} className="mt-1 w-full rounded-xl border px-3 py-2 dark:bg-slate-950" {...form.register("thermal_width_mm")} />
        </div>
        <div>
          <label className="text-xs text-slate-500">Pajak default (%)</label>
          <input className="mt-1 w-full rounded-xl border px-3 py-2 dark:bg-slate-950" {...form.register("tax_default")} />
        </div>
        <div className="rounded-xl border p-3 dark:border-slate-800 space-y-2">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Metode Pembayaran Kasir yang Aktif</label>
          <div className="flex items-center gap-4 text-sm pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="rounded text-brand-600 focus:ring-brand-500 h-4 w-4" checked={form.watch("enable_pay_cash") === "1"} onChange={(e) => form.setValue("enable_pay_cash", e.target.checked ? "1" : "0")} />
              <span>Tunai</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="rounded text-brand-600 focus:ring-brand-500 h-4 w-4" checked={form.watch("enable_pay_transfer") === "1"} onChange={(e) => form.setValue("enable_pay_transfer", e.target.checked ? "1" : "0")} />
              <span>Transfer Bank</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="rounded text-brand-600 focus:ring-brand-500 h-4 w-4" checked={form.watch("enable_pay_qris") === "1"} onChange={(e) => form.setValue("enable_pay_qris", e.target.checked ? "1" : "0")} />
              <span>QRIS</span>
            </label>
          </div>
        </div>
        <div className="rounded-xl border p-3 dark:border-slate-800 space-y-3 bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-amber-950 dark:text-amber-300">Sistem Point Membership</label>
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
              <input
                type="checkbox"
                className="rounded text-amber-600 focus:ring-amber-500 h-4 w-4"
                checked={form.watch("point_enabled") === "1"}
                onChange={(e) => form.setValue("point_enabled", e.target.checked ? "1" : "0")}
              />
              <span>Aktifkan Point</span>
            </label>
          </div>
          {form.watch("point_enabled") === "1" && (
            <div>
              <label className="text-xs text-slate-600 dark:text-slate-400">Setiap nominal belanja (Rp) dapat 1 point</label>
              <input
                type="number"
                min={100}
                step={100}
                placeholder="Contoh: 10000"
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm font-semibold dark:bg-slate-950"
                {...form.register("point_per_amount")}
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Contoh: jika diisi 10.000, transaksi Rp50.000 akan otomatis memberikan 5 point kepada pelanggan terdaftar.
              </p>
            </div>
          )}
        </div>
        <div>
          <label className="text-xs text-slate-500">Catatan WhatsApp</label>
          <textarea className="mt-1 w-full rounded-xl border px-3 py-2 dark:bg-slate-950" rows={3} {...form.register("whatsapp_sender_note")} />
        </div>
        <button type="submit" className="w-full rounded-xl bg-brand-600 py-3 font-semibold text-white">
          Simpan
        </button>
      </form>
    </div>
  );
}
