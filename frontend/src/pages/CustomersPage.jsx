import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2, Award, QrCode, Eye, Printer, User, ShoppingCart, Calendar, ArrowUpRight, ArrowDownRight, History } from "lucide-react";
import JsBarcode from "jsbarcode";
import api from "../api/client";
import { PAGE_SIZE } from "../constants/pagination";
import { formatDateID, formatDateTimeID, formatIDR } from "../utils/format";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { Modal } from "../components/Modal";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { TableSkeleton } from "../components/Skeleton";
import { PAGE_TABLE, PAGE_TABLE_WRAP, PageStack } from "../components/TableCard";
import { PaginationBar } from "../components/PaginationBar";
import { EmptyTableRow } from "../components/EmptyState";

export default function CustomersPage() {
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const dq = useDebouncedValue(q, 350);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [delId, setDelId] = useState(null);

  // Detail & Points Modal State
  const [detailCustomer, setDetailCustomer] = useState(null);
  const [detailStats, setDetailStats] = useState(null);
  const [pointsLog, setPointsLog] = useState([]);
  const [pointsLogTotal, setPointsLogTotal] = useState(0);
  const [pointsLogPage, setPointsLogPage] = useState(1);
  const [loadingPointsLog, setLoadingPointsLog] = useState(false);
  const [pointAdjustType, setPointAdjustType] = useState("add"); // "add" | "deduct"
  const [pointAdjustAmt, setPointAdjustAmt] = useState("");
  const [pointAdjustNotes, setPointAdjustNotes] = useState("");
  const [submittingPoint, setSubmittingPoint] = useState(false);

  // Print Member Card Modal State
  const [printMember, setPrintMember] = useState(null);

  const form = useForm({
    defaultValues: {
      name: "",
      whatsapp: "",
      address: "",
      category: "umum",
      notes: "",
      member_barcode: "",
    },
  });

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get("/api/customers", { params: { q: dq, page, limit: PAGE_SIZE } });
      setList(data.data || []);
      setTotal(data.total || 0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [dq, page]);

  async function onSubmit(v) {
    const t = toast.loading("Menyimpan...");
    try {
      if (v.id) await api.put(`/api/customers/${v.id}`, v);
      else await api.post("/api/customers", v);
      toast.success("Disimpan", { id: t });
      setOpen(false);
      load();
    } catch {
      toast.dismiss(t);
    }
  }

  // Load customer detail & point history
  async function openCustomerDetail(c) {
    setDetailCustomer(c);
    setPointsLogPage(1);
    setPointAdjustAmt("");
    setPointAdjustNotes("");
    try {
      const { data: stats } = await api.get(`/api/customers/${c.id}/stats`);
      setDetailStats(stats);
      loadPointsLog(c.id, 1);
    } catch {
      setDetailStats(c);
    }
  }

  async function loadPointsLog(customerId, p = 1) {
    setLoadingPointsLog(true);
    try {
      const { data } = await api.get(`/api/customers/${customerId}/points-log`, {
        params: { page: p, limit: 10 },
      });
      setPointsLog(data.data || []);
      setPointsLogTotal(data.total || 0);
      setPointsLogPage(data.page || p);
    } catch {
      setPointsLog([]);
    } finally {
      setLoadingPointsLog(false);
    }
  }

  async function handleAdjustPoints(e) {
    e.preventDefault();
    if (!detailCustomer) return;
    const pts = parseInt(pointAdjustAmt, 10);
    if (!pts || pts <= 0) {
      toast.error("Masukkan jumlah point yang valid");
      return;
    }
    const finalPoints = pointAdjustType === "deduct" ? -pts : pts;
    setSubmittingPoint(true);
    const t = toast.loading("Menyesuaikan point...");
    try {
      const { data } = await api.post(`/api/customers/${detailCustomer.id}/points`, {
        points: finalPoints,
        notes: pointAdjustNotes || (pointAdjustType === "deduct" ? "Pengurangan point manual" : "Penambahan point manual"),
      });
      toast.success(`Point berhasil diubah! Total sekarang: ${data.total_points}`, { id: t });
      setDetailCustomer((prev) => ({ ...prev, total_points: data.total_points }));
      setPointAdjustAmt("");
      setPointAdjustNotes("");
      loadPointsLog(detailCustomer.id, 1);
      load(); // refresh list
    } catch (err) {
      toast.dismiss(t);
      toast.error(err.response?.data?.error || "Gagal mengubah point");
    } finally {
      setSubmittingPoint(false);
    }
  }

  // Generate barcode SVG for print member card
  useEffect(() => {
    if (printMember) {
      const code = printMember.member_barcode || `MBR-${printMember.id}`;
      setTimeout(() => {
        try {
          JsBarcode("#member-barcode-svg", code, {
            format: "CODE128",
            width: 2,
            height: 60,
            displayValue: true,
            fontSize: 14,
            margin: 10,
          });
        } catch {
          /* ignore */
        }
      }, 100);
    }
  }, [printMember]);

  function handlePrintMemberCard() {
    if (!printMember) return;
    const code = printMember.member_barcode || `MBR-${printMember.id}`;
    const svgEl = document.getElementById("member-barcode-svg");
    const svgHtml = svgEl ? svgEl.outerHTML : "";

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Kartu Member - ${printMember.name || "Pelanggan"}</title>
  <style>
    @page {
      margin: 0;
      size: auto;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: #ffffff;
      color: #0f172a;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      padding: 24px;
    }
    .card {
      width: 320px;
      border: 2px dashed #94a3b8;
      border-radius: 16px;
      padding: 24px 20px;
      text-align: center;
      background: #ffffff;
      page-break-inside: avoid;
    }
    .badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 1.5px;
      color: #059669;
      text-transform: uppercase;
      margin-bottom: 6px;
    }
    .name {
      font-size: 20px;
      font-weight: 900;
      color: #0f172a;
      margin-bottom: 2px;
      word-break: break-word;
    }
    .phone {
      font-size: 12px;
      color: #64748b;
      margin-bottom: 12px;
    }
    .barcode-wrap {
      display: flex;
      justify-content: center;
      align-items: center;
      margin: 10px 0;
      padding: 4px;
      background: #ffffff;
    }
    .barcode-wrap svg {
      max-width: 100%;
      height: auto;
    }
    .footer-note {
      margin-top: 14px;
      font-size: 10px;
      color: #94a3b8;
      border-top: 1px dashed #e2e8f0;
      padding-top: 8px;
    }
    @media print {
      body {
        min-height: auto;
        padding: 10mm;
      }
      .card {
        border: 2px dashed #64748b;
      }
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">KARTU MEMBER PELANGGAN</div>
    <div class="name">${printMember.name || "Pelanggan"}</div>
    <div class="phone">${printMember.whatsapp ? "WA: " + printMember.whatsapp : "-"}</div>
    <div class="barcode-wrap">
      ${svgHtml}
    </div>
    <div class="footer-note">Scan barcode ini saat bertransaksi di kasir</div>
  </div>
</body>
</html>`;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch {
        /* ignore */
      } finally {
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 1500);
      }
    }, 250);
  }

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <PageStack>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pelanggan & Member</h1>
          <p className="text-sm text-slate-500">Kelola data pelanggan, member card barcode, dan loyalty points</p>
        </div>
        <button
          type="button"
          onClick={() => {
            form.reset({ name: "", whatsapp: "", address: "", category: "umum", notes: "", member_barcode: "" });
            setOpen(true);
          }}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 px-5 py-2.5 font-semibold text-white shadow-soft sm:w-auto"
        >
          <Plus className="h-5 w-5" /> Tambah pelanggan baru
        </button>
      </div>

      <input
        className="w-full md:max-w-md rounded-2xl border px-4 py-3 dark:border-slate-700 dark:bg-slate-900"
        placeholder="Cari nama / WA / barcode..."
        value={q}
        onChange={(e) => {
          setPage(1);
          setQ(e.target.value);
        }}
      />

      <div className={PAGE_TABLE_WRAP}>
        {loading ? (
          <div className="p-4">
            <TableSkeleton rows={5} cols={7} />
          </div>
        ) : (
          <table className={PAGE_TABLE}>
            <thead className="bg-slate-50 dark:bg-slate-800/80">
              <tr>
                <th className="px-4 py-3 text-left">Nama</th>
                <th className="px-4 py-3 text-left">Barcode Member</th>
                <th className="px-4 py-3 text-left">WhatsApp</th>
                <th className="px-4 py-3 text-center">Point</th>
                <th className="px-4 py-3 text-center">Kunjungan</th>
                <th className="px-4 py-3 text-right">Total Belanja</th>
                <th className="px-4 py-3 text-right">Piutang</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {list.length === 0 ? (
                <EmptyTableRow
                  colSpan={8}
                  title="Belum ada pelanggan"
                  description="Data pelanggan toko akan muncul di sini"
                />
              ) : (
                list.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900 dark:text-white">{c.name}</div>
                      <div className="text-xs text-slate-400 capitalize">{c.category || "umum"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
                        {c.member_barcode || `MBR-${c.id}`}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">{c.whatsapp || "-"}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2.5 py-1 rounded-full text-xs">
                        <Award className="h-3.5 w-3.5" />
                        {c.total_points || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-semibold text-slate-700 dark:text-slate-300">
                      {c.total_visits || 0}x
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium">{formatIDR(c.total_purchase)}</td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-amber-600">{formatIDR(c.balance_receivable)}</td>
                    <td className="px-4 py-3 text-right space-x-1">
                      <button
                        type="button"
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-brand-600 rounded-lg"
                        title="Lihat Detail & Point"
                        onClick={() => openCustomerDetail(c)}
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg"
                        title="Cetak Barcode Member"
                        onClick={() => setPrintMember(c)}
                      >
                        <Printer className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg"
                        title="Edit Data"
                        onClick={() => { form.reset(c); setOpen(true); }}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg"
                        title="Hapus"
                        onClick={() => setDelId(c.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end border-t border-slate-100 pt-3 dark:border-slate-800">
        <PaginationBar page={page} pages={pages} setPage={setPage} />
      </div>

      {/* Modal Form Create / Edit */}
      <Modal open={open} title={form.watch("id") ? "Edit pelanggan" : "Pelanggan baru"} onClose={() => setOpen(false)} wide>
        <form className="grid gap-3 md:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
          <input type="hidden" {...form.register("id")} />
          <div className="md:col-span-2">
            <label className="text-xs text-slate-500">Nama Pelanggan *</label>
            <input className="mt-1 w-full rounded-xl border px-3 py-2 dark:bg-slate-950" {...form.register("name", { required: true })} />
          </div>
          <div>
            <label className="text-xs text-slate-500">Barcode Member (Opsional)</label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2 font-mono text-sm dark:bg-slate-950"
              placeholder="Otomatis digenerate jika kosong"
              {...form.register("member_barcode")}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">WhatsApp / Telepon</label>
            <input className="mt-1 w-full rounded-xl border px-3 py-2 dark:bg-slate-950" {...form.register("whatsapp")} />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-slate-500">Kategori</label>
            <input className="mt-1 w-full rounded-xl border px-3 py-2 dark:bg-slate-950" placeholder="umum, grosir, reseller, dll" {...form.register("category")} />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-slate-500">Alamat</label>
            <textarea className="mt-1 w-full rounded-xl border px-3 py-2 dark:bg-slate-950" rows={2} {...form.register("address")} />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-slate-500">Catatan</label>
            <textarea className="mt-1 w-full rounded-xl border px-3 py-2 dark:bg-slate-950" rows={2} {...form.register("notes")} />
          </div>
          <div className="md:col-span-2 flex justify-end gap-2 pt-2">
            <button type="button" className="rounded-xl border px-4 py-2 text-sm font-semibold" onClick={() => setOpen(false)}>
              Batal
            </button>
            <button type="submit" className="rounded-xl bg-brand-600 px-6 py-2 text-sm font-bold text-white shadow-soft">
              Simpan
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Detail Pelanggan & Point Log */}
      <Modal
        open={!!detailCustomer}
        title={`Detail: ${detailCustomer?.name || ""}`}
        onClose={() => setDetailCustomer(null)}
        wide
      >
        {detailCustomer && (
          <div className="space-y-5">
            {/* Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3.5 dark:border-amber-900/50 dark:bg-amber-950/30">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-300">
                  <Award className="h-4 w-4" /> Total Point
                </div>
                <div className="mt-1 text-2xl font-black text-amber-900 dark:text-amber-200">
                  {detailCustomer.total_points || 0}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400">
                  <ShoppingCart className="h-4 w-4" /> Kunjungan
                </div>
                <div className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
                  {detailStats?.total_visits || detailCustomer.total_visits || 0}x
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400">
                  <Calendar className="h-4 w-4" /> Transaksi Selesai
                </div>
                <div className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
                  {detailStats?.total_transactions || 0}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400">
                  Total Belanja
                </div>
                <div className="mt-1 text-base font-black text-emerald-600 dark:text-emerald-400 truncate">
                  {formatIDR(detailStats?.total_spending || detailCustomer.total_purchase || 0)}
                </div>
              </div>
            </div>

            {/* Info ringkas pelanggan */}
            <div className="rounded-xl border p-3 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 text-xs grid grid-cols-2 sm:grid-cols-3 gap-2">
              <div>
                <span className="text-slate-400">Barcode Member:</span>
                <p className="font-mono font-bold mt-0.5">{detailCustomer.member_barcode || `MBR-${detailCustomer.id}`}</p>
              </div>
              <div>
                <span className="text-slate-400">WhatsApp:</span>
                <p className="font-semibold mt-0.5">{detailCustomer.whatsapp || "-"}</p>
              </div>
              <div>
                <span className="text-slate-400">Alamat:</span>
                <p className="font-semibold mt-0.5">{detailCustomer.address || "-"}</p>
              </div>
            </div>

            {/* Form Manual Adjustment Point */}
            <div className="rounded-2xl border border-brand-200 bg-brand-50/40 p-4 dark:border-brand-900 dark:bg-brand-950/20 space-y-3">
              <h4 className="text-xs font-bold text-brand-950 dark:text-brand-300 flex items-center gap-1.5">
                <Award className="h-4 w-4" /> Penyesuaian Point Manual
              </h4>
              <form onSubmit={handleAdjustPoints} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Aksi</label>
                    <select
                      className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-xs font-bold outline-none dark:bg-slate-950 dark:border-slate-800"
                      value={pointAdjustType}
                      onChange={(e) => setPointAdjustType(e.target.value)}
                    >
                      <option value="add">+ Tambah Point</option>
                      <option value="deduct">- Kurangi Point</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Jumlah Point</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="Contoh: 10"
                      className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-xs font-bold outline-none dark:bg-slate-950 dark:border-slate-800"
                      value={pointAdjustAmt}
                      onChange={(e) => setPointAdjustAmt(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Catatan / Alasan</label>
                    <input
                      type="text"
                      placeholder="Misal: Bonus event, redeem reward, dll"
                      className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-xs outline-none dark:bg-slate-950 dark:border-slate-800"
                      value={pointAdjustNotes}
                      onChange={(e) => setPointAdjustNotes(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submittingPoint}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white shadow-soft hover:bg-brand-700 disabled:opacity-50"
                  >
                    Simpan Penyesuaian Point
                  </button>
                </div>
              </form>
            </div>

            {/* Riwayat Point Log */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <History className="h-4 w-4 text-slate-500" /> Riwayat Perolehan & Penyesuaian Point
              </h4>
              <div className="rounded-xl border overflow-hidden dark:border-slate-800">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80">
                    <tr>
                      <th className="px-3 py-2 text-left">Waktu</th>
                      <th className="px-3 py-2 text-left">Tipe</th>
                      <th className="px-3 py-2 text-left">Catatan</th>
                      <th className="px-3 py-2 text-right">Point</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {loadingPointsLog ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-4 text-center text-slate-400">Memuat log point...</td>
                      </tr>
                    ) : pointsLog.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-4 text-center text-slate-400">Belum ada riwayat point</td>
                      </tr>
                    ) : (
                      pointsLog.map((log) => (
                        <tr key={log.id}>
                          <td className="px-3 py-2 text-slate-500">{formatDateTimeID(log.created_at)}</td>
                          <td className="px-3 py-2">
                            <span className={`inline-flex px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              log.points > 0
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                            }`}>
                              {log.type === "earn" ? "Belanja POS" : log.type === "manual" ? "Manual" : log.type}
                            </span>
                          </td>
                          <td className="px-3 py-2">{log.notes || "-"}</td>
                          <td className={`px-3 py-2 text-right font-bold ${log.points > 0 ? "text-emerald-600" : "text-red-500"}`}>
                            {log.points > 0 ? `+${log.points}` : log.points}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Cetak Barcode Kartu Member */}
      <Modal
        open={!!printMember}
        title="Cetak Barcode Kartu Member"
        onClose={() => setPrintMember(null)}
      >
        {printMember && (
          <div className="space-y-4 text-center py-2">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Scan barcode ini di kasir POS untuk langsung memilih pelanggan dan mengumpulkan point secara otomatis.
            </p>

            <div id="printable-member-card" className="mx-auto max-w-xs rounded-2xl border-2 border-dashed border-slate-300 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="text-xs font-bold text-brand-600 dark:text-brand-400 uppercase tracking-widest">KARTU MEMBER PELANGGAN</div>
              <div className="mt-1 text-lg font-black text-slate-900 dark:text-white">{printMember.name}</div>
              <div className="text-xs text-slate-500">{printMember.whatsapp || "-"}</div>

              <div className="my-3 flex justify-center bg-white p-2 rounded-xl">
                <svg id="member-barcode-svg"></svg>
              </div>

              <div className="text-[11px] font-semibold text-slate-400 border-t border-dashed border-slate-200 dark:border-slate-800 pt-2">
                Scan barcode ini saat bertransaksi di kasir
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                className="w-1/2 rounded-xl border py-2.5 text-xs font-semibold"
                onClick={() => setPrintMember(null)}
              >
                Tutup
              </button>
              <button
                type="button"
                className="w-1/2 rounded-xl bg-brand-600 py-2.5 text-xs font-bold text-white hover:bg-brand-700 inline-flex items-center justify-center gap-1.5 shadow-soft"
                onClick={handlePrintMemberCard}
              >
                <Printer className="h-4 w-4" /> Cetak Barcode
              </button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!delId}
        title="Hapus pelanggan?"
        message="Pastikan tidak ada transaksi tertaut."
        danger
        onConfirm={async () => {
          await api.delete(`/api/customers/${delId}`);
          toast.success("Dihapus");
          load();
        }}
        onClose={() => setDelId(null)}
      />
    </PageStack>
  );
}
