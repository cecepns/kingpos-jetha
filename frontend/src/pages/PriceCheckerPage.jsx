import { useState, useEffect, useRef } from "react";
import { ShoppingCart, Scan, ImageOff, RefreshCw, ArrowLeft, Camera } from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api/client";
import { uploadSrc } from "../utils/uploadUrl";
import { formatIDR } from "../utils/format";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

export default function PriceCheckerPage() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [time, setTime] = useState("");
  const [resetCountdown, setResetCountdown] = useState(null);

  const [cameraScanOpen, setCameraScanOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const inputRef = useRef(null);
  const timerRef = useRef(null);
  const intervalRef = useRef(null);

  const clearAutoResetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    timerRef.current = null;
    intervalRef.current = null;
    setResetCountdown(null);
  };

  const handleReset = () => {
    clearAutoResetTimer();
    setData(null);
    setError("");
    setCode("");
    if (inputRef.current) inputRef.current.focus();
  };

  const startAutoResetTimer = (seconds = 15) => {
    clearAutoResetTimer();
    setResetCountdown(seconds);

    intervalRef.current = setInterval(() => {
      setResetCountdown((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          intervalRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    timerRef.current = setTimeout(() => {
      handleReset();
    }, seconds * 1000);
  };

  useEffect(() => {
    return () => {
      clearAutoResetTimer();
    };
  }, []);

  // Clock timer
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      const dateStr = d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }).toUpperCase();
      const timeStr = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      setTime(`${dateStr} ${timeStr}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto focus barcode listener
  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();

    const handleGlobalClick = () => {
      if (inputRef.current && !cameraScanOpen) inputRef.current.focus();
    };

    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, [cameraScanOpen]);

  const searchBarcode = async (searchCode) => {
    const query = String(searchCode || "").trim();
    if (!query) return;

    clearAutoResetTimer();
    setCode("");
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/api/price-checker?code=${encodeURIComponent(query)}`);
      if (!res.data || !res.data.product) {
        setData(null);
        setError(`Produk dengan barcode '${query}' tidak ditemukan dalam sistem.`);
        toast.error(`Produk '${query}' tidak ditemukan!`);
        startAutoResetTimer(15);
      } else {
        setData(res.data);
        startAutoResetTimer(15);
      }
    } catch (err) {
      setData(null);
      const errMsg = err.response?.data?.error || `Produk dengan barcode '${query}' tidak ditemukan dalam sistem`;
      setError(errMsg);
      toast.error(errMsg);
      startAutoResetTimer(15);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      searchBarcode(code);
    }
  };

  // Camera QR/Barcode Reader effect safely managed
  useEffect(() => {
    if (!cameraScanOpen) return;
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
        const scanner = new Html5Qrcode("price-checker-camera-region", { formatsToSupport, verbose: false });
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

            try {
              if (typeof window !== "undefined" && navigator?.vibrate) {
                navigator.vibrate(60);
              }
            } catch {}

            searchBarcode(decodedText);
            setCameraScanOpen(false);
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
  }, [cameraScanOpen]);

  const product = data?.product;
  const variants = data?.variants || [];
  const matchedVariant = data?.matchedVariant;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col justify-between font-sans select-none overflow-hidden">
      {/* Top Header Bar (Brand Emerald Theme) */}
      <header className="bg-brand-700 border-b border-brand-800 px-6 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-4">
          <Link
            to="/app/dashboard"
            className="rounded-xl bg-brand-900/60 p-2 text-brand-100 hover:bg-brand-800 transition"
            title="Kembali ke Dashboard"
          >
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-800 rounded-2xl shadow-inner border border-brand-600">
              <ShoppingCart className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-2xl font-black tracking-wider text-white">CEK HARGA</h1>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold tracking-widest text-brand-100">{time}</p>
        </div>
      </header>

      {/* Hidden Scanner Input (inputMode="none" agar keyboard virtual HP/Android tidak muncul) */}
      <input
        ref={inputRef}
        type="text"
        inputMode="none"
        className="opacity-0 absolute top-0 left-0 h-0 w-0"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        onKeyDown={handleKeyDown}
        autoFocus
      />

      {/* Main Content Body (White Background Clean Area) */}
      <main className="flex-1 p-6 flex flex-col justify-center items-center bg-slate-50/50">
        {loading ? (
          <div className="flex flex-col items-center gap-4 animate-pulse">
            <RefreshCw className="h-16 w-16 text-brand-600 animate-spin" />
            <p className="text-xl font-bold tracking-wide text-brand-800">Mencari harga produk...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border-2 border-red-500 rounded-3xl p-8 max-w-xl w-full text-center shadow-xl animate-fade-in space-y-4">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto border border-red-300">
              <Scan className="h-10 w-10 text-red-600" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-red-900 mb-2">PRODUK TIDAK DITEMUKAN</h2>
              <p className="text-slate-700 font-medium text-lg">{error}</p>
            </div>
            
            <div className="pt-4 border-t border-red-200/80 flex flex-col items-center gap-3">
              {resetCountdown !== null && (
                <span className="text-xs font-semibold px-3 py-1 bg-red-100 text-red-800 rounded-full border border-red-300 inline-flex items-center gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-red-600" />
                  Otomatis kembalikan mode scan dalam <strong className="font-bold text-red-900">{resetCountdown}s</strong>
                </span>
              )}
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm transition shadow active:scale-95"
              >
                <RefreshCw className="h-4 w-4" /> Reset & Scan Sekarang
              </button>
            </div>
          </div>
        ) : product ? (
          <div className="bg-white rounded-3xl p-6 lg:p-8 max-w-5xl w-full shadow-xl text-slate-900 grid lg:grid-cols-12 gap-8 items-center border border-slate-200 animate-fade-in relative">
            {/* Auto reset top notification banner */}
            <div className="lg:col-span-12 flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                <RefreshCw className="h-4 w-4 text-emerald-600 animate-spin" />
                <span>Reset otomatis ke mode scan dalam {resetCountdown ?? 5} detik</span>
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-700 hover:bg-brand-800 text-white font-bold rounded-xl text-xs transition shadow-sm active:scale-95"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Scan Lagi / Reset
              </button>
            </div>

            {/* Product Info Header (Tanpa Foto Produk) */}
            <div className="lg:col-span-5 flex flex-col justify-center items-start text-left border-b lg:border-b-0 lg:border-r border-slate-200 pb-6 lg:pb-0 lg:pr-6 space-y-3">
              <span className="bg-brand-100 text-brand-800 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">
                INFORMASI PRODUK
              </span>
              <h2 className="text-3xl lg:text-4xl font-black tracking-tight text-slate-900 uppercase leading-snug">
                {product.name}
              </h2>
              {matchedVariant ? (
                <div className="inline-block bg-brand-600 text-white text-sm font-bold px-3.5 py-1.5 rounded-xl shadow-sm">
                  Varian: {matchedVariant.name}
                </div>
              ) : null}
              <div className="pt-2 border-t border-slate-100 w-full">
                <p className="text-sm font-bold text-slate-500 tracking-wider">
                  Barcode / SKU : <span className="font-mono text-slate-900 bg-slate-100 px-2 py-1 rounded-md">{product.barcode || product.sku}</span>
                </p>
              </div>
            </div>

            {/* Pricing Details Column */}
            <div className="lg:col-span-7 space-y-4">
              {variants.length > 0 ? (
                /* VARIANTS PRICING LIST */
                <div>
                  <div className="flex items-center justify-center mb-4">
                    <div className="h-[2px] bg-slate-200 flex-1" />
                    <span className="px-4 text-xs font-black tracking-widest text-slate-500 uppercase">
                      PILIHAN VARIAN & HARGA
                    </span>
                    <div className="h-[2px] bg-slate-200 flex-1" />
                  </div>
                  <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                    {variants.map((v) => {
                      const isMatched = matchedVariant && matchedVariant.id === v.id;
                      return (
                        <div
                          key={v.id}
                          className={`flex items-center justify-between p-4 rounded-2xl border-2 transition ${
                            isMatched
                              ? "bg-brand-50 border-brand-600 shadow-md"
                              : "bg-slate-50 border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2.5 rounded-xl ${isMatched ? "bg-brand-600 text-white" : "bg-slate-200 text-slate-700"}`}>
                              <ShoppingCart className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-black text-slate-900 text-base">{v.name}</p>
                              {v.wholesale_price > 0 && v.wholesale_min_qty > 0 ? (
                                <p className="text-xs font-bold text-emerald-600">
                                  Grosir (Min {v.wholesale_min_qty} pcs): {formatIDR(v.wholesale_price)}
                                </p>
                              ) : (
                                <p className="text-xs font-medium text-slate-500">Eceran</p>
                              )}
                            </div>
                          </div>
                          <p className={`text-2xl font-black ${isMatched ? "text-brand-700" : "text-slate-900"}`}>
                            {formatIDR(v.sell_price)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* TIERED / STANDARD PRICING (MATCHING KIOSK DESIGN) */
                <div>
                  <div className="flex items-center justify-center mb-6">
                    <div className="h-[2px] bg-slate-200 flex-1" />
                    <span className="px-4 text-xs font-black tracking-widest text-slate-500 uppercase">
                      {(data?.tiers && data.tiers.length > 0) || product.wholesale_price > 0 ? "HARGA BERTINGKAT" : "HARGA PRODUK"}
                    </span>
                    <div className="h-[2px] bg-slate-200 flex-1" />
                  </div>

                  <div className="space-y-3.5">
                    {/* Tier 1: Ecer (1 pcs) */}
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-brand-50/80 border-2 border-brand-200 shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-brand-600 text-white rounded-xl shadow">
                          <ShoppingCart className="h-6 w-6" />
                        </div>
                        <span className="text-xl font-bold text-slate-800">1 pcs</span>
                      </div>
                      <span className="text-3xl font-black text-brand-900 tracking-tight">
                        {formatIDR(product.sell_price)}
                      </span>
                    </div>

                    {/* Dynamic Multi-Tiers (e.g. 5 pcs -> Rp 3.400, 10 pcs ke atas -> Rp 3.300) */}
                    {data?.tiers && data.tiers.length > 0 ? (
                      data.tiers.map((t, idx) => {
                        const bgColors = ["bg-emerald-50/90 border-emerald-200 text-emerald-900", "bg-orange-50/90 border-orange-200 text-orange-900", "bg-purple-50/90 border-purple-200 text-purple-900"];
                        const iconColors = ["bg-emerald-600", "bg-orange-600", "bg-purple-600"];
                        const styleClass = bgColors[idx % bgColors.length];
                        const iconClass = iconColors[idx % iconColors.length];
                        return (
                          <div key={t.id || idx} className={`flex items-center justify-between p-4 rounded-2xl border-2 shadow-sm ${styleClass}`}>
                            <div className="flex items-center gap-4">
                              <div className={`p-3 text-white rounded-xl shadow ${iconClass}`}>
                                <ShoppingCart className="h-6 w-6" />
                              </div>
                              <span className="text-xl font-bold">
                                {t.min_qty} pcs {idx === data.tiers.length - 1 ? "ke atas" : ""}
                              </span>
                            </div>
                            <span className="text-3xl font-black tracking-tight">
                              {formatIDR(t.price)}
                            </span>
                          </div>
                        );
                      })
                    ) : product.wholesale_price > 0 && product.wholesale_min_qty > 0 ? (
                      /* Fallback legacy wholesale price */
                      <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-50/90 border-2 border-emerald-200 shadow-sm">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-emerald-600 text-white rounded-xl shadow">
                            <ShoppingCart className="h-6 w-6" />
                          </div>
                          <span className="text-xl font-bold text-emerald-900">
                            {product.wholesale_min_qty} pcs ke atas
                          </span>
                        </div>
                        <span className="text-3xl font-black text-emerald-800 tracking-tight">
                          {formatIDR(product.wholesale_price)}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* IDLE SCAN PROMPT STATE */
          <div className="flex flex-col items-center text-center gap-6 max-w-lg">
            <div className="relative">
              <div className="w-32 h-32 bg-brand-100 rounded-full flex items-center justify-center border-4 border-brand-500 shadow-xl animate-pulse">
                <Scan className="h-16 w-16 text-brand-600" />
              </div>
            </div>
            <div>
              <h2 className="text-3xl font-black tracking-tight text-slate-900 mb-2">SIAP MEMINDAI BARCODE</h2>
              <p className="text-slate-600 font-medium text-base">
                Tempelkan barcode pada mesin scanner atau gunakan kamera HP untuk menampilkan harga barang.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setCameraScanOpen(true)}
              className="mt-2 inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-6 py-3 text-base font-bold text-white shadow-lg hover:bg-brand-700 transition active:scale-95"
            >
              <Camera className="h-5 w-5" /> Scan via Kamera HP
            </button>
          </div>
        )}
      </main>

      {/* Bottom Footer Scanner Banner (Hijau Brand Emerald Theme) */}
      <footer className="bg-brand-700 border-t border-brand-800 p-4 text-center">
        <div className="inline-flex items-center gap-3 bg-brand-800 border border-brand-600 px-6 py-2.5 rounded-full shadow-inner">
          <Scan className="h-6 w-6 text-brand-100 animate-bounce" />
          <span className="text-sm font-bold tracking-widest text-white uppercase">
            TEMPELKAN / PINDAIKAN BARCODE PRODUK
          </span>
        </div>
      </footer>

      {/* Camera Scan Modal */}
      {cameraScanOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-800 shadow-2xl text-center space-y-4">
            <h3 className="text-lg font-bold text-white">Scan Barcode via Kamera</h3>
            <div id="price-checker-camera-region" className="overflow-hidden rounded-2xl border border-slate-700" />
            {cameraError ? <p className="text-xs text-red-400">{cameraError}</p> : null}
            <button
              type="button"
              onClick={() => setCameraScanOpen(false)}
              className="w-full rounded-xl bg-slate-800 py-2.5 text-sm font-bold text-white hover:bg-slate-700"
            >
              Tutup Kamera
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
