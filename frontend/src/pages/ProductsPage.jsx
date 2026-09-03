import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2, ScanBarcode, AlertTriangle, ImageOff, Camera, Copy } from "lucide-react";
import Select from "react-select";
import api from "../api/client";
import { fetchAllPages } from "../api/fetchAllPages";
import { PAGE_SIZE } from "../constants/pagination";
import { formatIDR } from "../utils/format";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { Modal } from "../components/Modal";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { TableSkeleton } from "../components/Skeleton";
import { PAGE_TABLE, PAGE_TABLE_WRAP, PageStack } from "../components/TableCard";
import { PaginationBar } from "../components/PaginationBar";
import { EmptyTableRow } from "../components/EmptyState";
import { useThemeStore } from "../store/themeStore";
import JsBarcode from "jsbarcode";
import { uploadSrc } from "../utils/uploadUrl";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

function selectStyles(isDark) {
  const border = isDark ? "#334155" : "#e2e8f0";
  const bg = isDark ? "#0f172a" : "#ffffff";
  const bgHover = isDark ? "#1e293b" : "#f1f5f9";
  const text = isDark ? "#f1f5f9" : "#0f172a";
  const brand = "#0d9488";
  return {
    control: (base, state) => ({
      ...base,
      borderRadius: "0.75rem",
      minHeight: 42,
      backgroundColor: bg,
      borderColor: state.isFocused ? brand : border,
      boxShadow: state.isFocused ? `0 0 0 1px ${brand}` : "none",
      "&:hover": { borderColor: brand },
    }),
    menuPortal: (base) => ({ ...base, zIndex: 10000 }),
    menu: (base) => ({
      ...base,
      borderRadius: "0.75rem",
      overflow: "hidden",
      backgroundColor: bg,
      border: `1px solid ${border}`,
      boxShadow: "0 10px 40px rgba(0,0,0,.12)",
    }),
    input: (base) => ({ ...base, color: text }),
    singleValue: (base) => ({ ...base, color: text }),
    multiValue: (base) => ({
      ...base,
      backgroundColor: isDark ? "#1e293b" : "#e2e8f0",
      borderRadius: "0.5rem",
    }),
    multiValueLabel: (base) => ({ ...base, color: text }),
    placeholder: (base) => ({ ...base, color: isDark ? "#64748b" : "#94a3b8" }),
    option: (base, state) => ({
      ...base,
      cursor: "pointer",
      color: text,
      backgroundColor: state.isSelected ? brand : state.isFocused ? bgHover : "transparent",
      "&:active": { backgroundColor: state.isSelected ? brand : bgHover },
    }),
  };
}

export default function ProductsPage() {
  const dark = useThemeStore((s) => s.dark);

  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const dq = useDebouncedValue(q, 350);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [delId, setDelId] = useState(null);
  const [removeImgId, setRemoveImgId] = useState(null);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [modalCameraScan, setModalCameraScan] = useState(false);
  const [cameraError, setCameraError] = useState("");

  const form = useForm({
    defaultValues: {
      name: "",
      sku: "",
      barcode: "",
      description: "",
      purchase_price: 0,
      sell_price: 0,
      stock: 0,
      min_stock: 0,
      unit: "PCS",
      location: "",
      brand: "",
      supplier_id: "",
      category_ids: [],
      is_active: true,
      image_path: "",
      tiers: [],
      variants: [],
      unit_conversions: [],
    },
  });

  const { fields: tierFields, append: appendTier, remove: removeTier } = useFieldArray({
    control: form.control,
    name: "tiers",
  });

  const { fields: variantFields, append: appendVariant, remove: removeVariant } = useFieldArray({
    control: form.control,
    name: "variants",
  });

  const { fields: unitFields, append: appendUnit, remove: removeUnit } = useFieldArray({
    control: form.control,
    name: "unit_conversions",
  });

  const categoryOptions = useMemo(
    () => categories.map((c) => ({ value: c.id, label: c.name })),
    [categories]
  );
  const resolvedSelectStyles = useMemo(() => selectStyles(dark), [dark]);

  const refreshCategories = useCallback(async () => {
    try {
      const c = await fetchAllPages("/api/categories");
      setCategories(c);
    } catch {
      toast.error("Gagal memuat kategori");
    }
  }, []);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get("/api/products", {
        params: { q: dq, page, limit: PAGE_SIZE, ...(lowStockOnly ? { low_stock: 1 } : {}) },
      });
      setList(data.data || []);
      setTotal(data.total || 0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [dq, page, lowStockOnly]);

  useEffect(() => {
    refreshCategories();
    (async () => {
      const s = await fetchAllPages("/api/suppliers");
      setSuppliers(s);
    })();
  }, [refreshCategories]);

  function handleBarcodeScanLookup(scannedCode) {
    const code = String(scannedCode || "").trim();
    if (!code) return;
    form.setValue("barcode", code);
  }

  // Camera QR/Barcode Reader effect for product modal
  useEffect(() => {
    if (!modalCameraScan) return;
    let scannerInstance = null;
    let isClosed = false;

    const startCamera = async () => {
      try {
        setCameraError("");
        const formatsToSupport = [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
        ];
        const scanner = new Html5Qrcode("product-form-camera-region", { formatsToSupport, verbose: false });
        scannerInstance = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 15,
            qrbox: { width: 280, height: 140 },
            disableFlip: true,
            experimentalFeatures: {
              useBarCodeDetectorIfSupported: true,
            },
          },
          (decodedText) => {
            if (isClosed) return;
            isClosed = true;

            // Audio & Vibration Feedback (safely checked)
            try {
              if (typeof window !== "undefined" && navigator?.vibrate) {
                navigator.vibrate(60);
              }
            } catch {}

            handleBarcodeScanLookup(decodedText);
            setModalCameraScan(false);
          },
          () => {}
        );

        if (isClosed) {
          try { await scanner.stop(); } catch {}
          try { await scanner.clear(); } catch {}
        }
      } catch (err) {
        if (!isClosed) {
          setCameraError("Gagal membuka kamera: " + (err?.message || String(err)));
        }
      }
    };

    const timer = setTimeout(startCamera, 200);

    return () => {
      isClosed = true;
      clearTimeout(timer);
      if (scannerInstance) {
        try {
          scannerInstance.stop().then(() => {
            try { scannerInstance.clear(); } catch {}
          }).catch(() => {
            try { scannerInstance.clear(); } catch {}
          });
        } catch {}
      }
    };
  }, [modalCameraScan]);

  function openCreate() {
    form.reset({
      id: "",
      name: "",
      sku: "",
      barcode: "",
      description: "",
      purchase_price: 0,
      sell_price: 0,
      wholesale_price: 0,
      wholesale_min_qty: 0,
      stock: 0,
      min_stock: 5,
      unit: "PCS",
      location: "",
      brand: "",
      supplier_id: "",
      category_ids: [],
      variants: [],
      tiers: [],
      unit_conversions: [],
      is_active: true,
      image_path: "",
    });
    setModal("edit");
  }

  function openEdit(p) {
    api.get(`/api/products/${p.id}`).then(({ data }) => {
      form.reset({
        ...data,
        wholesale_price: data.wholesale_price || 0,
        wholesale_min_qty: data.wholesale_min_qty || 0,
        variants: data.variants || [],
        tiers: data.tiers || [],
        unit_conversions: data.unit_conversions || [],
        unit: data.unit || "PCS",
        location: data.location || "",
        brand: data.brand || "",
        supplier_id: data.supplier_id || "",
        category_ids: data.category_ids || [],
      });
      setModal("edit");
    });
  }

  function openDuplicate(p) {
    api.get(`/api/products/${p.id}`).then(({ data }) => {
      form.reset({
        ...data,
        id: "",
        name: `${data.name || ""} (Salinan)`,
        sku: "",
        barcode: "",
        image_path: "",
        wholesale_price: data.wholesale_price || 0,
        wholesale_min_qty: data.wholesale_min_qty || 0,
        variants: (data.variants || []).map((v) => ({ ...v, id: "", sku: "", barcode: "" })),
        tiers: (data.tiers || []).map((t) => ({ ...t, id: "" })),
        unit_conversions: (data.unit_conversions || []).map((u) => ({ ...u, id: "" })),
        unit: data.unit || "PCS",
        location: data.location || "",
        brand: data.brand || "",
        supplier_id: data.supplier_id || "",
        category_ids: data.category_ids || [],
      });
      setModal("edit");
      toast.success("Data produk berhasil diduplikat. Silakan sesuaikan nama dan barcode.");
    });
  }

  async function onSubmit(values) {
    const stockNum = Number(values.stock);
    const payload = {
      ...values,
      supplier_id: values.supplier_id || null,
      category_ids: values.category_ids || [],
      purchase_price: Number(values.purchase_price),
      sell_price: Number(values.sell_price),
      wholesale_price: Number(values.wholesale_price || 0),
      wholesale_min_qty: Number(values.wholesale_min_qty || 0),
      variants: (values.variants || []).map(v => ({
        ...v,
        sell_price: Number(v.sell_price || 0),
        stock: Number(v.stock || 0)
      })),
      tiers: (values.tiers || []).map(t => ({
        ...t,
        min_qty: Number(t.min_qty || 0),
        price: Number(t.price || 0)
      })),
      unit_conversions: (values.unit_conversions || []).map(u => ({
        ...u,
        unit_name: String(u.unit_name || "").trim(),
        conversion_qty: Number(u.conversion_qty || 1),
        sell_price: Number(u.sell_price || 0),
      })).filter(u => u.unit_name),
      min_stock: Number(values.min_stock),
      unit: values.unit || "PCS",
      location: values.location || null,
      brand: values.brand || null,
    };
    if (values.id) {
      if (Number.isFinite(stockNum)) payload.stock = stockNum;
    } else {
      payload.stock = Number.isFinite(stockNum) ? stockNum : 0;
    }
    const t = toast.loading("Menyimpan...");
    try {
      if (values.id) {
        await api.put(`/api/products/${values.id}`, payload, { skipToast: true });
      } else {
        await api.post("/api/products", payload, { skipToast: true });
      }
      toast.success("Disimpan", { id: t });
      setModal(null);
      load();
    } catch (err) {
      const errMsg = err?.response?.data?.error || err?.message || "Gagal menyimpan produk";
      toast.error(errMsg, { id: t });
    }
  }

  async function uploadImage(id, file) {
    const fd = new FormData();
    fd.append("image", file);
    const { data } = await api.post(`/api/products/${id}/image`, fd, { headers: { "Content-Type": "multipart/form-data" } });
    toast.success("Gambar diunggah");
    load();
    if (String(form.watch("id")) === String(id) && data?.path) form.setValue("image_path", data.path);
  }

  async function confirmRemoveImage() {
    if (!removeImgId) return;
    const t = toast.loading("Menghapus gambar...");
    try {
      await api.delete(`/api/products/${removeImgId}/image`);
      toast.success("Gambar dihapus", { id: t });
      if (String(form.watch("id")) === String(removeImgId)) form.setValue("image_path", "");
      setRemoveImgId(null);
      load();
    } catch {
      toast.dismiss(t);
      setRemoveImgId(null);
    }
  }

  function printBarcode(product) {
    const code = product?.barcode || product?.sku || product;
    const name = typeof product === "object" && product?.name ? String(product.name) : "";
    if (!code) return toast.error("Tanpa kode barcode/SKU");
    const w = window.open("", "_blank", "width=320,height=260");
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    JsBarcode(svg, String(code), {
      format: "CODE128",
      width: 1.8,
      height: 48,
      displayValue: true,
      fontSize: 11,
      margin: 0,
      textMargin: 1,
    });
    const title = name
      ? `<div style="font-weight:600;font-size:13px;line-height:1.15;margin:0 0 4px 0">${name.replace(/</g, "&lt;")}</div>`
      : "";
    w.document.write(
      `<!DOCTYPE html><html><body style="margin:12px;text-align:center;font-family:sans-serif;display:flex;flex-direction:column;align-items:center;gap:4px">${title}<div style="line-height:0">${svg.outerHTML}</div></body></html>`
    );
    w.document.close();
    w.onload = () => {
      w.print();
      w.close();
    };
  }

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <PageStack>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Produk</h1>
          <p className="text-sm text-slate-500">Kelola data dan stok barang toko</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/app/categories"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            Data kategori
          </Link>
          <button
            type="button"
            onClick={() => {
              setPage(1);
              setLowStockOnly((v) => !v);
            }}
            className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold shadow-sm ${
              lowStockOnly
                ? "border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
                : "border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            }`}
          >
            <AlertTriangle className="h-5 w-5" /> Stok limit
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-600 px-5 py-2.5 font-semibold text-white shadow-soft"
          >
            <Plus className="h-5 w-5" /> Tambah
          </button>
        </div>
      </div>

      <input
        className="w-full max-w-md rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-700 dark:bg-slate-900"
        placeholder="Cari produk..."
        value={q}
        onChange={(e) => {
          setPage(1);
          setQ(e.target.value);
        }}
      />

      <div className={`${PAGE_TABLE_WRAP} overflow-x-auto`}>
        {loading ? (
          <div className="p-4">
            <TableSkeleton rows={6} cols={14} />
          </div>
        ) : (
          <table className={`${PAGE_TABLE} min-w-[1040px] divide-y divide-slate-100 text-sm dark:divide-slate-800`}>
            <thead className="bg-slate-50 dark:bg-slate-800/80">
              <tr>
                <th className="min-w-[12rem] px-4 py-3 text-left font-semibold">Nama Produk</th>
                <th className="whitespace-nowrap px-4 py-3 text-left font-semibold">SKU</th>
                <th className="whitespace-nowrap px-4 py-3 text-left font-semibold">Status</th>
                <th className="whitespace-nowrap px-4 py-3 text-left font-semibold">Foto</th>
                <th className="whitespace-nowrap px-4 py-3 text-right font-semibold">Beli</th>
                <th className="whitespace-nowrap px-4 py-3 text-right font-semibold">Jual</th>
                <th className="whitespace-nowrap px-4 py-3 text-right font-semibold">Stok</th>
                <th className="whitespace-nowrap px-4 py-3 text-right font-semibold">Terjual</th>
                <th className="whitespace-nowrap px-4 py-3 text-left font-semibold">Satuan</th>
                <th className="min-w-[6rem] px-4 py-3 text-left font-semibold">Kategori</th>
                <th className="min-w-[5rem] px-4 py-3 text-left font-semibold">Lokasi</th>
                <th className="min-w-[5rem] px-4 py-3 text-left font-semibold">Merek</th>
                <th className="whitespace-nowrap px-4 py-3 text-left font-semibold">Aksi</th>
                <th className="whitespace-nowrap px-4 py-3 text-right font-semibold">ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {list.length === 0 ? (
                <EmptyTableRow
                  colSpan={14}
                  title="Belum ada produk"
                  description="Produk yang Anda tambahkan atau impor akan muncul di sini"
                />
              ) : (
                list.map((p) => (
                  <tr key={p.id} className={Number(p.is_active) === 0 ? "opacity-60" : ""}>
                    <td className="min-w-[12rem] px-4 py-3 font-bold text-slate-900 dark:text-white">
                      {p.name || "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">{p.sku}</td>
                    <td className="px-4 py-3">
                      {Number(p.is_active) === 0 ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
                          Nonaktif
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
                          Aktif
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {p.image_path ? (
                        <div className="relative inline-flex">
                          <img
                            src={uploadSrc(p.image_path)}
                            alt=""
                            className="h-10 w-10 rounded-xl border border-slate-200 object-cover dark:border-slate-700"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.parentElement.innerHTML = `<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 border border-slate-200 dark:border-slate-700"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="2" y1="2" x2="22" y2="22"/><path d="M10.41 10.41a2 2 0 1 1-2.83-2.83"/><line x1="13.5" y1="13.5" x2="6" y2="21"/><line x1="18" y1="12" x2="21" y2="15"/><path d="M3.59 3.59A2 2 0 0 0 3 5v14a2 2 0 0 0 1.41-.59"/><path d="M21 15V5a2 2 0 0 0-2-2H9"/></svg></div>`;
                            }}
                          />
                          <button
                            type="button"
                            title="Hapus gambar"
                            className="absolute -right-1 -top-1 rounded-full bg-red-600 p-1 text-white shadow hover:bg-red-700"
                            onClick={() => setRemoveImgId(p.id)}
                          >
                            <ImageOff className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500">
                          <ImageOff className="h-4 w-4" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">{formatIDR(p.purchase_price)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">{formatIDR(p.sell_price)}</td>
                    <td className="px-4 py-3 text-right font-medium">{p.stock}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700 dark:text-slate-300">
                      {Number(p.qty_sold || 0).toLocaleString("id-ID")}
                    </td>
                    <td className="px-4 py-3">{p.unit || "PCS"}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">{p.categories || "—"}</td>
                    <td className="px-4 py-3 text-xs">{p.location || "—"}</td>
                    <td className="px-4 py-3 text-xs">{p.brand || "—"}</td>
                    <td className="px-4 py-3 text-left">
                      <div className="flex flex-nowrap gap-1">
                        <button type="button" className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800" title="Cetak Barcode" onClick={() => printBarcode(p)}>
                          <ScanBarcode className="h-4 w-4" />
                        </button>
                        <label className="cursor-pointer rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800" title="Unggah Foto">
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadImage(p.id, e.target.files[0])} />
                          📷
                        </label>
                        <button type="button" className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800" title="Duplikat Produk" onClick={() => openDuplicate(p)}>
                          <Copy className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                        </button>
                        <button type="button" className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800" title="Edit Produk" onClick={() => openEdit(p)}>
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button type="button" className="rounded-lg p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30" title="Hapus Produk" onClick={() => setDelId(p.id)}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs">{String(p.id).padStart(6, "0")}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-t border-slate-100 pt-3 text-xs sm:text-sm text-slate-500 dark:border-slate-800">
        <span className="text-center sm:text-left">{total} produk</span>
        <PaginationBar page={page} pages={pages} setPage={setPage} />
      </div>

      <Modal open={modal === "edit"} title={form.watch("id") ? "Edit produk" : "Produk baru"} onClose={() => setModal(null)} wide>
        <form className="grid gap-3 md:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
          <input type="hidden" {...form.register("id")} />
          <div className="md:col-span-2">
            <label className="text-xs text-slate-500">Nama</label>
            <input className="mt-1 w-full rounded-xl border px-3 py-2 dark:border-slate-700 dark:bg-slate-950" {...form.register("name", { required: true })} />
          </div>
          <div>
            <label className="text-xs text-slate-500">SKU <span className="text-[11px] text-slate-400">(Opsional / Otomatis)</span></label>
            <input className="mt-1 w-full rounded-xl border px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" placeholder="Kosongkan untuk auto-generate" {...form.register("sku")} />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs text-slate-500">Barcode / Scan Langsung</label>
              <button
                type="button"
                onClick={() => {
                  setCameraError("");
                  setModalCameraScan(true);
                }}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400"
              >
                <Camera className="h-3.5 w-3.5" /> Scan Kamera
              </button>
            </div>
            <div className="relative mt-1">
              <input
                className="w-full rounded-xl border px-3 py-2 pr-10 font-mono text-sm dark:border-slate-700 dark:bg-slate-950"
                placeholder="Scan / ketik lalu tekan Enter…"
                {...form.register("barcode")}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleBarcodeScanLookup(e.target.value);
                  }
                }}
              />
              <button
                type="button"
                title="Cek data barcode"
                onClick={() => handleBarcodeScanLookup(form.getValues("barcode"))}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-slate-100 p-1 text-slate-600 hover:bg-brand-50 hover:text-brand-600 dark:bg-slate-800 dark:text-slate-300"
              >
                <ScanBarcode className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500">Harga beli</label>
            <input type="number" className="mt-1 w-full rounded-xl border px-3 py-2 dark:border-slate-700 dark:bg-slate-950" {...form.register("purchase_price")} />
          </div>
          <div>
            <label className="text-xs text-slate-500">Harga jual</label>
            <input type="number" className="mt-1 w-full rounded-xl border px-3 py-2 dark:border-slate-700 dark:bg-slate-950" {...form.register("sell_price")} />
          </div>
          <div>
            <label className="text-xs text-slate-500">Harga grosir (opsional)</label>
            <input type="number" className="mt-1 w-full rounded-xl border px-3 py-2 dark:border-slate-700 dark:bg-slate-950" {...form.register("wholesale_price")} placeholder="Misal: 8500" />
          </div>
          <div>
            <label className="text-xs text-slate-500">Min. Qty grosir</label>
            <input type="number" className="mt-1 w-full rounded-xl border px-3 py-2 dark:border-slate-700 dark:bg-slate-950" {...form.register("wholesale_min_qty")} placeholder="Misal: 6" />
          </div>
          <div>
            <label className="text-xs text-slate-500">{form.watch("id") ? "Stok saat ini (ubah langsung)" : "Stok awal"}</label>
            <input type="number" className="mt-1 w-full rounded-xl border px-3 py-2 dark:border-slate-700 dark:bg-slate-950" {...form.register("stock")} />
          </div>
          <div>
            <label className="text-xs text-slate-500">Min stok</label>
            <input type="number" className="mt-1 w-full rounded-xl border px-3 py-2 dark:border-slate-700 dark:bg-slate-950" {...form.register("min_stock")} />
          </div>
          <div>
            <label className="text-xs text-slate-500">Satuan</label>
            <input className="mt-1 w-full rounded-xl border px-3 py-2 dark:border-slate-700 dark:bg-slate-950" {...form.register("unit")} placeholder="PCS" />
          </div>
          <div>
            <label className="text-xs text-slate-500">Lokasi</label>
            <input className="mt-1 w-full rounded-xl border px-3 py-2 dark:border-slate-700 dark:bg-slate-950" {...form.register("location")} />
          </div>
          <div>
            <label className="text-xs text-slate-500">Merek / tipe</label>
            <input className="mt-1 w-full rounded-xl border px-3 py-2 dark:border-slate-700 dark:bg-slate-950" {...form.register("brand")} />
          </div>
          <div>
            <label className="text-xs text-slate-500">Supplier</label>
            <select className="mt-1 w-full rounded-xl border px-3 py-2 dark:border-slate-700 dark:bg-slate-950" {...form.register("supplier_id")}>
              <option value="">—</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-slate-500">Kategori</label>
            <Controller
              name="category_ids"
              control={form.control}
              render={({ field }) => (
                <Select
                  isMulti
                  options={categoryOptions}
                  value={categoryOptions.filter((o) => (field.value || []).map(Number).includes(Number(o.value)))}
                  onChange={(chosen) => field.onChange((chosen || []).map((c) => c.value))}
                  placeholder="Pilih satu atau beberapa kategori…"
                  noOptionsMessage={() => "Belum ada kategori — buka halaman Data kategori"}
                  classNamePrefix="prs"
                  className="mt-1"
                  styles={resolvedSelectStyles}
                  menuPortalTarget={typeof document !== "undefined" ? document.body : null}
                  menuPosition="fixed"
                />
              )}
            />
          </div>

          <div className="md:col-span-2 rounded-2xl border border-brand-200/80 bg-brand-50/40 p-3.5 sm:p-4 dark:border-brand-900/40 dark:bg-brand-950/20">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Harga Bertingkat / Grosir (Opsional)</h4>
                <p className="text-xs text-slate-500">Contoh: 1 pcs Rp 3.500, 5 pcs Rp 3.400, 10 pcs ke atas Rp 3.300</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const curr = form.getValues("tiers") || [];
                  appendTier({ min_qty: curr.length ? (Number(curr[curr.length - 1].min_qty) || 1) + 4 : 5, price: form.watch("sell_price") || 0 });
                }}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-700 sm:py-1.5"
              >
                <Plus className="h-3.5 w-3.5" /> Tambah Tingkat Harga
              </button>
            </div>

            {tierFields.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Belum ada tingkat harga bertingkat ditambahkan. Menggunakan harga ecer standar.</p>
            ) : (
              <div className="space-y-2.5">
                {tierFields.map((t, idx) => (
                  <div key={t.id || idx} className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950 sm:flex-row sm:items-center sm:gap-3 sm:p-2.5">
                    <div className="flex items-center justify-between gap-2 sm:flex-1">
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Min. Pembelian</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          placeholder="Mis. 5"
                          className="w-20 sm:w-24 rounded-lg border px-2.5 py-1.5 text-xs font-semibold dark:border-slate-700 dark:bg-slate-900"
                          {...form.register(`tiers.${idx}.min_qty`)}
                        />
                        <span className="text-xs text-slate-500">pcs</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 sm:flex-1">
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Harga / Pcs</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          placeholder="Harga (Rp)"
                          className="w-28 sm:w-32 rounded-lg border px-2.5 py-1.5 text-xs font-semibold dark:border-slate-700 dark:bg-slate-900"
                          {...form.register(`tiers.${idx}.price`)}
                        />
                        <button
                          type="button"
                          onClick={() => removeTier(idx)}
                          className="rounded-lg bg-red-50 p-1.5 text-red-600 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400"
                          title="Hapus tingkat harga"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50/50 p-3.5 sm:p-4 dark:border-slate-800 dark:bg-slate-900/50">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Varian produk (opsional)</h4>
                <p className="text-xs text-slate-500">Misal: Ukuran L, Warna Merah, Kemasan Dus</p>
              </div>
              <button
                type="button"
                onClick={() => appendVariant({ name: "", sku: "", barcode: "", sell_price: form.watch("sell_price") || 0, stock: 0 })}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-800 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 sm:py-1.5"
              >
                <Plus className="h-3.5 w-3.5" /> Tambah varian
              </button>
            </div>

            {variantFields.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Belum ada varian ditambahkan.</p>
            ) : (
              <div className="space-y-3">
                {variantFields.map((v, idx) => (
                  <div key={v.id || idx} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950">
                    <div className="grid gap-2.5 sm:grid-cols-6 sm:items-end">
                      <div className="sm:col-span-3">
                        <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Nama Varian</label>
                        <input
                          type="text"
                          placeholder="Mis. Ukuran L / Merah"
                          className="mt-1 w-full rounded-lg border px-2.5 py-1.5 text-xs font-medium dark:border-slate-700 dark:bg-slate-900"
                          {...form.register(`variants.${idx}.name`)}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:col-span-2">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Harga (Rp)</label>
                          <input
                            type="number"
                            placeholder="Harga"
                            className="mt-1 w-full rounded-lg border px-2.5 py-1.5 text-xs font-medium dark:border-slate-700 dark:bg-slate-900"
                            {...form.register(`variants.${idx}.sell_price`)}
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Stok</label>
                          <input
                            type="number"
                            placeholder="Stok"
                            className="mt-1 w-full rounded-lg border px-2.5 py-1.5 text-xs font-medium dark:border-slate-700 dark:bg-slate-900"
                            {...form.register(`variants.${idx}.stock`)}
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-end pt-1 sm:col-span-1 sm:pt-0">
                        <button
                          type="button"
                          onClick={() => removeVariant(idx)}
                          className="inline-flex w-full items-center justify-center gap-1 rounded-lg bg-red-50 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400 sm:w-auto sm:p-2"
                          title="Hapus varian"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sm:hidden">Hapus Varian</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Konversi Satuan Lain (Multi-Unit) */}
          <div className="md:col-span-2 rounded-2xl border border-blue-200 bg-blue-50/40 p-3.5 sm:p-4 dark:border-blue-900/60 dark:bg-blue-950/20">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Pilihan Satuan Lain / Konversi (Multi-Unit)</h4>
                <p className="text-xs text-slate-500">
                  Bisa dipilih/diganti langsung saat transaksi di kasir POS. Misal: 1 Karton = 40 {form.watch("unit") || "PCS"}, 1 Lusin = 12 {form.watch("unit") || "PCS"}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => appendUnit({ unit_name: "", conversion_qty: 1, sell_price: form.watch("sell_price") || 0 })}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 sm:py-1.5"
              >
                <Plus className="h-3.5 w-3.5" /> Tambah Satuan Lain
              </button>
            </div>

            {unitFields.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Belum ada pilihan satuan lain. Hanya menggunakan satuan dasar ({form.watch("unit") || "PCS"}).</p>
            ) : (
              <div className="space-y-3">
                {unitFields.map((u, idx) => (
                  <div key={u.id || idx} className="rounded-xl border border-blue-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
                    <div className="grid gap-2.5 sm:grid-cols-7 sm:items-end">
                      <div className="sm:col-span-3">
                        <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Nama Satuan</label>
                        <input
                          type="text"
                          placeholder="Mis. Karton / Lusin / Pack / 1 Kg"
                          className="mt-1 w-full rounded-lg border px-2.5 py-1.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-900"
                          {...form.register(`unit_conversions.${idx}.unit_name`)}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          Isi (Jumlah {form.watch("unit") || "PCS"})
                        </label>
                        <input
                          type="number"
                          min="1"
                          placeholder="Mis. 40"
                          className="mt-1 w-full rounded-lg border px-2.5 py-1.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-900"
                          {...form.register(`unit_conversions.${idx}.conversion_qty`)}
                        />
                      </div>
                      <div className="sm:col-span-2 flex items-end gap-2">
                        <div className="flex-1">
                          <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Harga Satuan (Rp)</label>
                          <input
                            type="number"
                            placeholder="Harga Jual Satuan"
                            className="mt-1 w-full rounded-lg border px-2.5 py-1.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-900"
                            {...form.register(`unit_conversions.${idx}.sell_price`)}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeUnit(idx)}
                          className="rounded-lg bg-red-50 p-2 text-red-600 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400"
                          title="Hapus Satuan"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="text-xs text-slate-500">Deskripsi</label>
            <textarea className="mt-1 w-full rounded-xl border px-3 py-2 dark:border-slate-700 dark:bg-slate-950" rows={3} {...form.register("description")} />
          </div>
          {form.watch("id") && form.watch("image_path") ? (
            <div className="md:col-span-2 flex flex-wrap items-center gap-3 rounded-xl border border-slate-100 p-3 dark:border-slate-800">
              <img
                src={uploadSrc(form.watch("image_path"))}
                alt=""
                className="h-20 w-20 rounded-lg border object-cover"
              />
              <button
                type="button"
                className="rounded-xl border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/30"
                onClick={() => setRemoveImgId(form.watch("id"))}
              >
                Hapus gambar
              </button>
            </div>
          ) : null}
          <label className="flex items-center gap-2 md:col-span-2">
            <input type="checkbox" checked={!!form.watch("is_active")} onChange={(e) => form.setValue("is_active", e.target.checked)} />
            Aktif
          </label>
          <div className="md:col-span-2 flex justify-end gap-2">
            <button type="button" className="rounded-xl border px-4 py-2" onClick={() => setModal(null)}>
              Batal
            </button>
            <button type="submit" className="rounded-xl bg-brand-600 px-6 py-2 font-semibold text-white">
              Simpan
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!delId}
        title="Hapus produk?"
        message="Data yang dihapus tidak dapat dikembalikan."
        danger
        onConfirm={async () => {
          const res = await api.delete(`/api/products/${delId}`);
          if (res?.data?.message) {
            toast.success(res.data.message);
          } else {
            toast.success("Dihapus");
          }
          load();
        }}
        onClose={() => setDelId(null)}
      />

      <ConfirmDialog
        open={!!removeImgId}
        title="Hapus gambar produk?"
        message="File gambar di server akan dihapus dari disk."
        danger
        confirmText="Hapus"
        onConfirm={confirmRemoveImage}
        onClose={() => setRemoveImgId(null)}
      />

      <Modal open={modalCameraScan} title="Scan Barcode via Kamera HP" onClose={() => setModalCameraScan(false)}>
        <div className="space-y-4 text-center">
          <p className="text-xs text-slate-500">Arahkan kamera ke barcode produk toko untuk mengisi form secara otomatis.</p>
          <div id="product-form-camera-region" className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700" />
          {cameraError ? <p className="text-xs text-red-500">{cameraError}</p> : null}
          <button
            type="button"
            onClick={() => setModalCameraScan(false)}
            className="w-full rounded-xl bg-slate-800 py-2.5 text-xs font-bold text-white hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600"
          >
            Batal / Tutup Kamera
          </button>
        </div>
      </Modal>

    </PageStack>
  );
}
