import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Search,
  Trash2,
  Save,
  Pause,
  Printer,
  MessageCircle,
  MessageSquare,
  ScanBarcode,
  Plus,
  Minus,
  Tags,
  CreditCard,
  UserCheck,
  Camera,
  Send,
  CheckCircle2,
  Check,
  Ticket,
  Share2,
  Bluetooth,
  ShoppingBag,
  Smartphone,
  Award,
  Package,
  UserSearch,
  ArrowRightLeft,
  Loader2,
} from "lucide-react";
import Select from "react-select";
import AsyncCreatableSelect from "react-select/async-creatable";
import JsBarcode from "jsbarcode";
import { Html5Qrcode } from "html5-qrcode";
import api from "../api/client";
import { API_ENDPOINTS } from "../utils/endpoints";
import { fetchAllPages } from "../api/fetchAllPages";
import { PAGE_SIZE } from "../constants/pagination";
import { formatIDR, formatThousandsIdInput } from "../utils/format";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { Modal } from "../components/Modal";
import { PageStack } from "../components/TableCard";
import {
  buildThermalReceiptHtml,
  buildReceiptWhatsAppText,
  normalizeWhatsAppPhone,
  buildReceiptPlainText,
  buildEscPosReceiptBinary,
  printViaWebBluetooth,
  printViaRawBT,
  printViaRawBTBase64,
} from "../utils/receipt";
import { parseOptionalFloat, parseOptionalInt } from "../utils/numericInput";
import { uploadSrc } from "../utils/uploadUrl";
import { useThemeStore } from "../store/themeStore";
import AppDatePicker from "../components/AppDatePicker";

const PRODUCT_PAGE_SIZE = 48;
const POS_DRAFT_KEY = "pos-keuangan-draft-v1";

export default function PosPage() {
  const dark = useThemeStore((s) => s.dark);
  const [q, setQ] = useState("");
  const dq = useDebouncedValue(q, 300);
  const [customerSearch, setCustomerSearch] = useState("");
  const custQ = useDebouncedValue(customerSearch, 350);
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productPage, setProductPage] = useState(1);
  const [productTotal, setProductTotal] = useState(0);
  const [inactiveHint, setInactiveHint] = useState(null);
  const [cart, setCart] = useState([]);

  // Lock orientation portrait logic
  const [isMobileLandscape, setIsMobileLandscape] = useState(false);
  const [dismissLandscapeNotice, setDismissLandscapeNotice] = useState(false);

  useEffect(() => {
    const lockPortrait = async () => {
      try {
        if (typeof window !== "undefined" && window.screen?.orientation?.lock) {
          await window.screen.orientation.lock("portrait");
        }
      } catch {
        /* Ignore browser restriction when not fullscreen */
      }
    };
    lockPortrait();

    const checkOrientation = () => {
      const isMobileSize = window.innerWidth <= 1024;
      const isLandscape = window.innerWidth > window.innerHeight;
      setIsMobileLandscape(isMobileSize && isLandscape);
    };

    checkOrientation();
    window.addEventListener("resize", checkOrientation);
    window.addEventListener("orientationchange", checkOrientation);

    return () => {
      window.removeEventListener("resize", checkOrientation);
      window.removeEventListener("orientationchange", checkOrientation);
    };
  }, []);
  const [selectedVariantProduct, setSelectedVariantProduct] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [cashAccounts, setCashAccounts] = useState([]);
  const [customerId, setCustomerId] = useState("");
  const [selectedCustomerOption, setSelectedCustomerOption] = useState(null);
  const [newCustomerModalOpen, setNewCustomerModalOpen] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustAddress, setNewCustAddress] = useState("");
  const [newCustCategory, setNewCustCategory] = useState("umum");
  const [newCustNotes, setNewCustNotes] = useState("");
  const [newCustSubmitting, setNewCustSubmitting] = useState(false);
  const [customItemOpen, setCustomItemOpen] = useState(false);
  const [customItemName, setCustomItemName] = useState("");
  const [customItemPrice, setCustomItemPrice] = useState("");
  const [customItemQty, setCustomItemQty] = useState("1");
  const [pointSettings, setPointSettings] = useState({ enabled: false, perAmount: 10000 });
  const [discountTotal, setDiscountTotal] = useState(0);
  const [taxPercent, setTaxPercent] = useState(0);
  const [notes, setNotes] = useState("");
  const [saleDate, setSaleDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [additionalFee, setAdditionalFee] = useState(0);
  const [additionalFeeName, setAdditionalFeeName] = useState("Ongkos Kirim");
  const [feeModalOpen, setFeeModalOpen] = useState(false);
  const [feeDraftName, setFeeDraftName] = useState("");
  const [feeDraftAmt, setFeeDraftAmt] = useState("");

  const [priceConfirmModalOpen, setPriceConfirmModalOpen] = useState(false);
  const [pendingPriceChange, setPendingPriceChange] = useState(null); // { itemKey, newPrice }

  const [enabledPayMethods, setEnabledPayMethods] = useState({ cash: true, transfer: true, qris: true });
  const [receiptCfg, setReceiptCfg] = useState({
    store_name: "",
    store_address: "",
    store_phone: "",
    receipt_footer: "",
    thermal_width_mm: "80",
  });
  const [payOpen, setPayOpen] = useState(false);
  const [cashAmtStr, setCashAmtStr] = useState("");
  const [cashAccountId, setCashAccountId] = useState("");
  const [transferAmtStr, setTransferAmtStr] = useState("");
  const [transferAcc, setTransferAcc] = useState("");
  const [qrisAmtStr, setQrisAmtStr] = useState("");
  const [qrisAcc, setQrisAcc] = useState("");
  const [barcodeOpen, setBarcodeOpen] = useState(false);
  const [cameraScanOpen, setCameraScanOpen] = useState(false);
  const [cameraStatus, setCameraStatus] = useState("Menyiapkan kamera...");
  const [cameraError, setCameraError] = useState("");
  const [cameraLastCode, setCameraLastCode] = useState("");
  const [barcodeProdId, setBarcodeProdId] = useState("");
  /** String agar bisa dikosongkan saat diketik */
  const [barcodeCopies, setBarcodeCopies] = useState("1");
  /** { [product_id]: { qty?, sell?, disc? } } */
  const [lineDraft, setLineDraft] = useState({});
  const [discOpenKeys, setDiscOpenKeys] = useState({});
  const [discountDraft, setDiscountDraft] = useState(null);
  const [taxDraft, setTaxDraft] = useState(null);
  const desktopBarcodeRef = useRef(null);
  const mobileBarcodeRef = useRef(null);
  const cartContainerRef = useRef(null);
  const cameraScannerRef = useRef(null);
  const cameraBusyRef = useRef(false);
  const cameraStartedRef = useRef(false);
  const resolveScannedCodeRef = useRef(null);
  const payModalOpenedRef = useRef(false);
  const draftResumeIdRef = useRef(null);

  const focusBarcodeInputs = useCallback(() => {
    if (desktopBarcodeRef.current) {
      desktopBarcodeRef.current.focus({ preventScroll: true });
    }
    if (mobileBarcodeRef.current) {
      mobileBarcodeRef.current.focus({ preventScroll: true });
    }
    if (typeof window !== "undefined" && "virtualKeyboard" in navigator) {
      try {
        navigator.virtualKeyboard.hide();
      } catch {
        /* */
      }
    }
  }, []);

  useEffect(() => {
    if (cartContainerRef.current && cart.length > 0) {
      const el = cartContainerRef.current;
      const scrollToBottom = () => {
        if (el) {
          el.scrollTo({
            top: el.scrollHeight,
            behavior: "smooth",
          });
        }
      };
      scrollToBottom();
      const animFrame = requestAnimationFrame(scrollToBottom);
      const timer = setTimeout(scrollToBottom, 60);
      return () => {
        cancelAnimationFrame(animFrame);
        clearTimeout(timer);
      };
    }
  }, [cart]);
  const [selectProductModalOpen, setSelectProductModalOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [receiptWaPhone, setReceiptWaPhone] = useState("");
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [completedTx, setCompletedTx] = useState(null);

  const fetchProductPage = useCallback(
    async (pageNum, append) => {
      if (!append) setProductsLoading(true);
      try {
        const { data } = await api.get("/api/products", {
          params: { q: dq, limit: PRODUCT_PAGE_SIZE, page: pageNum, active: 1 },
        });
        const rows = data.data || [];
        const tot = Number(data.total ?? rows.length);
        setProductTotal(tot);
        if (append) setProducts((prev) => [...prev, ...rows]);
        else setProducts(rows);

        if (!append && rows.length === 0 && dq.trim()) {
          try {
            const { data: all } = await api.get("/api/products", {
              params: { q: dq, limit: 1, page: 1 },
            });
            const hit = (all.data || [])[0];
            setInactiveHint(hit && Number(hit.is_active) === 0 ? hit : null);
          } catch {
            setInactiveHint(null);
          }
        } else if (!append) {
          setInactiveHint(null);
        }
      } catch (err) {
        if (!append) setProducts([]);
      } finally {
        if (!append) setProductsLoading(false);
      }
    },
    [dq]
  );

  useEffect(() => {
    setProductPage(1);
    fetchProductPage(1, false).catch(() => { });
  }, [dq, fetchProductPage]);

  function loadMoreProducts() {
    const next = productPage + 1;
    const maxPage = Math.max(1, Math.ceil(productTotal / PRODUCT_PAGE_SIZE));
    if (next > maxPage) return;
    setProductPage(next);
    fetchProductPage(next, true).catch(() => { });
  }

  useEffect(() => {
    api
      .get("/api/settings")
      .then(({ data }) => {
        setReceiptCfg({
          store_name: data.store_name || "Toko",
          store_address: data.store_address || "",
          store_phone: data.store_phone || "",
          receipt_footer: data.receipt_footer || data.whatsapp_sender_note || "",
          thermal_width_mm: String(data.thermal_width_mm || "80"),
        });
        setEnabledPayMethods({
          cash: data.enable_pay_cash !== "0",
          transfer: data.enable_pay_transfer === "1",
          qris: data.enable_pay_qris === "1",
        });
        setPointSettings({
          enabled: data.point_enabled === "1",
          perAmount: Number(data.point_per_amount) || 10000,
        });
      })
      .catch(() => { });
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const ca = await fetchAllPages("/api/cash-accounts").catch(() => []);
        setCashAccounts(ca);
        if (ca.length) setCashAccountId(String(ca[0].id));
      } catch {
        /* */
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/api/customers", {
          params: { q: custQ, page: 1, limit: PAGE_SIZE },
        });
        setCustomers(data.data || []);
      } catch {
        setCustomers([]);
      }
    })();
  }, [custQ]);

  useEffect(() => {
    if (!customerId) {
      setReceiptWaPhone("");
      return;
    }
    const c = customers.find((x) => String(x.id) === String(customerId));
    if (c?.whatsapp) setReceiptWaPhone(String(c.whatsapp).replace(/\D/g, ""));
    else setReceiptWaPhone("");
  }, [customerId, customers]);

  function calculateUnitPrice(productOrCartItem, qty) {
    const retailPrice = Number(productOrCartItem.retail_price || productOrCartItem.sell_price || 0);
    const tiers = productOrCartItem.tiers || [];

    if (tiers && tiers.length > 0) {
      const sortedTiers = [...tiers].sort((a, b) => Number(b.min_qty) - Number(a.min_qty));
      const matched = sortedTiers.find((t) => qty >= Number(t.min_qty));
      if (matched) {
        return Number(matched.price);
      }
    }

    const wholesalePrice = Number(productOrCartItem.wholesale_price || 0);
    const minQty = Number(productOrCartItem.wholesale_min_qty || 0);

    if (wholesalePrice > 0 && minQty > 0 && qty >= minQty) {
      return wholesalePrice;
    }
    return retailPrice;
  }

  function addToCart(p, variant = null) {
    if (p.variants && p.variants.length > 0 && !variant) {
      setSelectedVariantProduct(p);
      return;
    }

    const targetStock = variant ? Number(variant.stock) : Number(p.stock);
    const itemKey = variant ? `${p.id}_v${variant.id}` : `${p.id}`;
    const itemName = variant ? `${p.name} (${variant.name})` : p.name;
    const itemRetailPrice = variant ? Number(variant.sell_price) : Number(p.sell_price);
    const itemWholesalePrice = variant ? Number(variant.wholesale_price || 0) : Number(p.wholesale_price || 0);
    const itemMinQty = variant ? Number(variant.wholesale_min_qty || 0) : Number(p.wholesale_min_qty || 0);
    const itemTiers = variant ? (variant.tiers || []) : (p.tiers || []);
    const itemUnitConversions = p.unit_conversions || [];
    const itemBaseUnit = p.unit || "PCS";

    const exIndex = cart.findIndex((c) => c.item_key === itemKey || (c.product_id === p.id && !variant && !c.variant_id));
    if (exIndex >= 0) {
      const ex = cart[exIndex];
      const newQty = ex.qty + 1;
      const unitPrice = calculateUnitPrice(ex, newQty);
      const updatedItem = {
        ...ex,
        qty: newQty,
        sell_price: unitPrice,
      };
      const restCart = cart.filter((_, idx) => idx !== exIndex);
      setCart([...restCart, updatedItem]);
    } else {
      const newQty = 1;
      const baseItem = {
        retail_price: itemRetailPrice,
        wholesale_price: itemWholesalePrice,
        wholesale_min_qty: itemMinQty,
        tiers: itemTiers,
      };
      const unitPrice = calculateUnitPrice(baseItem, newQty);
      setCart([
        ...cart,
        {
          item_key: itemKey,
          product_id: p.id,
          variant_id: variant ? variant.id : null,
          variant_name: variant ? variant.name : null,
          name: itemName,
          barcode: variant?.barcode || p.barcode,
          stock: targetStock,
          purchase_price: Number(p.purchase_price),
          sell_price: unitPrice,
          retail_price: itemRetailPrice,
          wholesale_price: itemWholesalePrice,
          wholesale_min_qty: itemMinQty,
          tiers: itemTiers,
          qty: newQty,
          discount_amount: 0,
          unit_conversions: itemUnitConversions,
          base_unit: itemBaseUnit,
          selected_unit: null, // null = base unit (PCS)
        },
      ]);
    }
    toast.success(`${itemName} ditambahkan`);
  }

  function addCustomItemToCart() {
    const name = customItemName.trim();
    const price = Number(String(customItemPrice).replace(/\D/g, "")) || 0;
    const qty = Number(customItemQty) || 1;
    if (!name) { toast.error("Nama item wajib diisi"); return; }
    if (price <= 0) { toast.error("Harga harus lebih dari 0"); return; }
    const itemKey = `custom_${Date.now()}`;
    setCart((prev) => [
      ...prev,
      {
        item_key: itemKey,
        product_id: null,
        variant_id: null,
        name,
        barcode: null,
        stock: 9999,
        purchase_price: 0,
        sell_price: price,
        retail_price: price,
        wholesale_price: 0,
        wholesale_min_qty: 0,
        tiers: [],
        qty,
        discount_amount: 0,
        is_custom: true,
        unit_conversions: [],
        base_unit: "PCS",
        selected_unit: null,
      },
    ]);
    toast.success(`"${name}" ditambahkan ke keranjang`);
    setCustomItemName("");
    setCustomItemPrice("");
    setCustomItemQty("1");
    setCustomItemOpen(false);
  }

  function switchCartUnit(itemKey, unitConversionId) {
    setCart((prev) =>
      prev.map((c) => {
        if ((c.item_key || String(c.product_id)) !== itemKey) return c;
        if (!unitConversionId) {
          // Back to base unit
          const prevUnit = c.selected_unit;
          if (!prevUnit) return c;
          const newQty = c.qty * prevUnit.conversion_qty;
          const newPrice = c.retail_price;
          return { ...c, qty: newQty, sell_price: newPrice, selected_unit: null, is_custom_price: false };
        }
        const conv = (c.unit_conversions || []).find((u) => u.id === unitConversionId);
        if (!conv) return c;
        // Convert from current unit to base, then to new unit
        const currentBaseQty = c.selected_unit ? c.qty * c.selected_unit.conversion_qty : c.qty;
        const newQty = Math.max(1, Math.floor(currentBaseQty / conv.conversion_qty));
        return { ...c, qty: newQty, sell_price: Number(conv.sell_price), selected_unit: conv, is_custom_price: false };
      })
    );
  }

  // Customer search for AsyncCreatableSelect
  const loadCustomerOptions = useCallback(async (inputValue) => {
    try {
      const { data } = await api.get(API_ENDPOINTS.CUSTOMERS.LIST, { params: { q: inputValue, page: 1, limit: 20 } });
      return (data.data || []).map((c) => ({
        value: String(c.id),
        label: `${c.name}${c.whatsapp ? " (" + c.whatsapp + ")" : ""}`,
        customer: c,
      }));
    } catch {
      return [];
    }
  }, []);

  const handleCreateCustomer = useCallback((inputValue) => {
    const trimmed = (inputValue || "").trim();
    setNewCustName(trimmed);
    setNewCustPhone("");
    setNewCustAddress("");
    setNewCustCategory("umum");
    setNewCustNotes("");
    setNewCustomerModalOpen(true);
  }, []);

  const handleSaveNewCustomerModal = async (e) => {
    if (e) e.preventDefault();
    const trimmedName = (newCustName || "").trim();
    if (!trimmedName) {
      toast.error("Nama pelanggan wajib diisi");
      return;
    }
    setNewCustSubmitting(true);
    const t = toast.loading(`Menyimpan pelanggan "${trimmedName}"...`);
    try {
      const { data } = await api.post(API_ENDPOINTS.CUSTOMERS.CREATE, {
        name: trimmedName,
        whatsapp: newCustPhone.trim() || null,
        address: newCustAddress.trim() || null,
        category: newCustCategory || "umum",
        notes: newCustNotes.trim() || null,
      });
      const newCustomer = {
        id: data.id,
        name: trimmedName,
        whatsapp: newCustPhone.trim() || null,
        address: newCustAddress.trim() || null,
        category: newCustCategory || "umum",
        notes: newCustNotes.trim() || null,
        member_barcode: data.member_barcode,
        total_points: 0,
        total_visits: 0,
      };
      const newOption = {
        value: String(data.id),
        label: `${trimmedName}${newCustPhone.trim() ? " (" + newCustPhone.trim() + ")" : ""}`,
        customer: newCustomer,
      };
      setCustomers((prev) => [newCustomer, ...prev]);
      setCustomerId(String(data.id));
      setSelectedCustomerOption(newOption);
      if (newCustPhone.trim()) {
        setReceiptWaPhone(newCustPhone.trim().replace(/\D/g, ""));
      }
      setNewCustomerModalOpen(false);
      setNewCustName("");
      setNewCustPhone("");
      setNewCustAddress("");
      setNewCustCategory("umum");
      setNewCustNotes("");
      toast.success(`Pelanggan "${trimmedName}" berhasil ditambahkan & dipilih`, { id: t });
    } catch (err) {
      toast.error(err.response?.data?.error || "Gagal menambahkan pelanggan", { id: t });
    } finally {
      setNewCustSubmitting(false);
    }
  };

  function updateLine(keyOrId, patch) {
    setCart((prevCart) =>
      prevCart.map((c) => {
        const matches = c.item_key
          ? String(c.item_key) === String(keyOrId)
          : String(c.product_id) === String(keyOrId);
        if (!matches) return c;
        let next = { ...c, ...patch };
        if (patch.sell_price != null) {
          next.is_custom_price = true;
        }
        if (patch.qty != null) {
          const cap = lineQtyCap(c);
          let n = typeof patch.qty === "number" ? patch.qty : Number(patch.qty);
          if (!Number.isFinite(n)) n = c.qty;
          const mq = Math.max(1, Math.min(Math.trunc(n), cap));
          next.qty = mq;
          if (!next.is_custom_price) {
            next.sell_price = calculateUnitPrice(c, mq);
          }
        }
        if (patch.discount_amount != null) {
          const gross = next.sell_price * next.qty;
          next.discount_amount = Math.min(Math.max(0, Number(patch.discount_amount)), gross);
        }
        return next;
      })
    );
  }

  function handlePriceChangeThisTxOnly() {
    if (!pendingPriceChange) return;
    const { itemKey, newPrice } = pendingPriceChange;
    updateLine(itemKey, { sell_price: newPrice });
    setPendingPriceChange(null);
    setPriceConfirmModalOpen(false);
    toast.success("Harga diubah untuk transaksi ini");
  }

  async function handlePriceChangePermanently() {
    if (!pendingPriceChange) return;
    const { itemKey, cartItem, newPrice } = pendingPriceChange;
    const t = toast.loading("Memperbarui harga di database...");
    try {
      if (cartItem.variant_id) {
        await api.patch(API_ENDPOINTS.PRODUCTS.UPDATE_VARIANT_PRICE(cartItem.product_id, cartItem.variant_id), { sell_price: newPrice });
      } else {
        await api.patch(API_ENDPOINTS.PRODUCTS.UPDATE_PRICE(cartItem.product_id), { sell_price: newPrice });
      }
      updateLine(itemKey, { sell_price: newPrice });
      toast.success(`Harga produk diperbarui menjadi ${formatIDR(newPrice)} secara permanen!`, { id: t });
      fetchProductPage(productPage, false).catch(() => { });
    } catch (err) {
      toast.dismiss(t);
      toast.error(err.response?.data?.error || "Gagal memperbarui harga permanen");
    } finally {
      setPendingPriceChange(null);
      setPriceConfirmModalOpen(false);
    }
  }

  function adjustQty(itemKey, c, delta) {
    const capQty = lineQtyCap(c);
    const currentQ = Number(c.qty) || 1;
    const newQ = Math.max(1, Math.min(capQty, currentQ + delta));
    setLineDraft((m) => {
      const inner = { ...(m[itemKey] || {}) };
      delete inner.qty;
      const next = { ...m };
      if (Object.keys(inner).length === 0) delete next[itemKey];
      else next[itemKey] = inner;
      return next;
    });
    updateLine(itemKey, { qty: newQ });
  }

  function removeLine(keyOrId) {
    if (keyOrId == null) return;
    const targetKey = String(keyOrId);
    setLineDraft((m) => {
      const next = { ...m };
      delete next[targetKey];
      delete next[keyOrId];
      return next;
    });
    setCart((prevCart) =>
      prevCart.filter((c) => {
        const k1 = c.item_key ? String(c.item_key) : "";
        const k2 = c.product_id != null ? String(c.product_id) : "";
        return k1 !== targetKey && k2 !== targetKey;
      })
    );
  }

  function lineQtyCap(c) {
    if (c.is_custom) return 9999;
    const srv = liveStock(c.product_id, c.stock);
    const otherRes = (reservedByProduct[c.product_id] || 0) - c.qty;
    return Math.max(1, Math.max(0, srv - otherRes));
  }

  const subtotal = useMemo(
    () => cart.reduce((s, c) => s + c.sell_price * c.qty - (c.discount_amount || 0), 0),
    [cart]
  );
  const taxAmount = useMemo(() => (subtotal - discountTotal) * (taxPercent / 100), [subtotal, discountTotal, taxPercent]);
  const grandTotal = useMemo(() => subtotal - discountTotal + taxAmount + (Number(additionalFee) || 0), [subtotal, discountTotal, taxAmount, additionalFee]);

  useEffect(() => {
    if (payOpen && !payModalOpenedRef.current) {
      payModalOpenedRef.current = true;
      setCashAmtStr("");
      setTransferAmtStr("");
      setQrisAmtStr("");
    }
    if (!payOpen) payModalOpenedRef.current = false;
  }, [payOpen]);

  useEffect(() => {
    try {
      if (new URLSearchParams(window.location.search).get("resume")) return;
      const raw = localStorage.getItem(POS_DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d.v !== 1 || !Array.isArray(d.cart)) return;
      if (d.cart.length) setCart(d.cart);
      if (d.customerId != null) setCustomerId(String(d.customerId));
      if (typeof d.discountTotal === "number") setDiscountTotal(d.discountTotal);
      if (typeof d.taxPercent === "number") setTaxPercent(d.taxPercent);
      if (typeof d.notes === "string") setNotes(d.notes);
      if (typeof d.saleDate === "string") setSaleDate(d.saleDate);
    } catch {
      /* */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        POS_DRAFT_KEY,
        JSON.stringify({
          v: 1,
          cart,
          customerId,
          discountTotal,
          taxPercent,
          notes,
          saleDate,
        })
      );
    } catch {
      /* */
    }
  }, [cart, customerId, discountTotal, taxPercent, notes, saleDate]);

  const resumeId = searchParams.get("resume");
  useEffect(() => {
    if (!resumeId) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get(`/api/transactions/${resumeId}`, { skipToast: true });
        if (cancelled || !data || !["draft", "hold", "completed"].includes(String(data.status))) {
          setSearchParams({}, { replace: true });
          return;
        }
        const isCompleted = String(data.status) === "completed";
        const lines = await Promise.all(
          (data.items || []).map(async (it) => {
            const isCustom = Boolean(it.is_custom || !it.product_id);
            if (isCustom) {
              return {
                product_id: null,
                name: it.product_name || "Item Custom",
                barcode: it.barcode || "",
                stock: 999,
                purchase_price: Number(it.purchase_price || 0),
                sell_price: Number(it.sell_price || 0),
                qty: Number(it.qty || 1),
                discount_amount: Number(it.discount_amount || 0),
                is_custom: true,
              };
            }
            try {
              const { data: pr } = await api.get(`/api/products/${it.product_id}`, { skipToast: true });
              return {
                product_id: it.product_id,
                name: it.product_name || pr.name,
                barcode: it.barcode || pr.barcode,
                stock: Number(pr.stock),
                purchase_price: Number(it.purchase_price ?? pr.purchase_price),
                sell_price: Number(it.sell_price),
                qty: Number(it.qty),
                discount_amount: Number(it.discount_amount || 0),
                is_custom: false,
              };
            } catch {
              return {
                product_id: it.product_id,
                name: it.product_name || `Produk #${it.product_id}`,
                barcode: it.barcode || "",
                stock: Math.max(Number(it.qty || 1), 1),
                purchase_price: Number(it.purchase_price || 0),
                sell_price: Number(it.sell_price || 0),
                qty: Number(it.qty || 1),
                discount_amount: Number(it.discount_amount || 0),
                is_custom: !it.product_id,
              };
            }
          })
        );
        if (cancelled) return;
        setCart(lines);
        if (data.customer_id) {
          setCustomerId(String(data.customer_id));
          setSelectedCustomerOption({
            value: String(data.customer_id),
            label: data.customer_name || "Pelanggan",
            customer: {
              id: data.customer_id,
              name: data.customer_name,
              whatsapp: data.customer_wa,
              total_points: data.customer_total_points,
            },
          });
        } else {
          setCustomerId("");
          setSelectedCustomerOption(null);
          setReceiptWaPhone("");
        }
        setNotes(data.notes || "");
        setDiscountTotal(Number(data.discount_total || 0));
        setTaxPercent(Number(data.tax_percent || 0));
        if (data.sale_date) setSaleDate(String(data.sale_date).slice(0, 10));

        if (isCompleted) {
          // Void completed transaction in DB so stock is restored and replaced by edited order
          try {
            await api.delete(`/api/transactions/${resumeId}`, { skipToast: true });
          } catch {
            /* ignore if deletion restricted or fails */
          }
          toast.success("Data transaksi dimuat ke kasir — silakan lakukan koreksi");
        } else {
          draftResumeIdRef.current = Number(resumeId);
          toast.success("Draft/hold dimuat — silakan bayar");
          queueMicrotask(() => setPayOpen(true));
        }

        setSearchParams({}, { replace: true });
      } catch {
        setSearchParams({}, { replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [resumeId, setSearchParams]);

  const marginTotal = useMemo(
    () =>
      cart.reduce((s, c) => {
        const line = c.sell_price * c.qty - (c.discount_amount || 0);
        const cost = c.purchase_price * c.qty;
        return s + (line - cost);
      }, 0),
    [cart]
  );

  const reservedByProduct = useMemo(() => {
    const m = {};
    for (const c of cart) {
      m[c.product_id] = (m[c.product_id] || 0) + c.qty;
    }
    return m;
  }, [cart]);

  function liveStock(pid, fallbackStock) {
    const pr = products.find((x) => x.id === pid);
    return pr != null ? Number(pr.stock) : Number(fallbackStock);
  }

  function availableOnGrid(p) {
    const st = Number(p.stock);
    const res = reservedByProduct[p.id] || 0;
    return Math.max(0, st - res);
  }

  const cashAmt = Number(String(cashAmtStr).replace(/\D/g, "")) || 0;
  const transferAmt = Number(String(transferAmtStr).replace(/\D/g, "")) || 0;
  const qrisAmt = Number(String(qrisAmtStr).replace(/\D/g, "")) || 0;
  const nonDebtPaid = cashAmt + transferAmt + qrisAmt;
  const hutangGap = Math.max(0, Math.round((grandTotal - nonDebtPaid) * 100) / 100);
  const paidSumDraft = nonDebtPaid + hutangGap;
  const kembalianDraft = Math.max(0, paidSumDraft - grandTotal);

  function buildPayments() {
    const pays = [];
    if (cashAmt > 0 && cashAccountId)
      pays.push({ method: "cash", amount: cashAmt, cash_account_id: Number(cashAccountId) });
    if (transferAmt > 0 && transferAcc) pays.push({ method: "transfer", amount: transferAmt, cash_account_id: Number(transferAcc) });
    if (qrisAmt > 0 && qrisAcc) pays.push({ method: "qris", amount: qrisAmt, cash_account_id: Number(qrisAcc) });
    if (hutangGap > 0.02) pays.push({ method: "hutang", amount: hutangGap });
    return pays;
  }

  function receiptPaymentsFromDraft() {
    const p = [];
    if (cashAmt > 0) p.push({ method: "cash", amount: cashAmt });
    if (transferAmt > 0) p.push({ method: "transfer", amount: transferAmt });
    if (qrisAmt > 0) p.push({ method: "qris", amount: qrisAmt });
    if (hutangGap > 0.02) p.push({ method: "piutang", amount: hutangGap });
    return p;
  }

  async function submitSale(status = "completed") {
    const pays = status === "completed" ? buildPayments() : [];
    if (status === "completed") {
      if (cashAmt > 0 && !cashAccountId) {
        toast.error("Pilih akun kas untuk pembayaran tunai");
        return;
      }
      if (transferAmt > 0 && !transferAcc) {
        toast.error("Pilih rekening untuk transfer");
        return;
      }
      if (qrisAmt > 0 && !qrisAcc) {
        toast.error("Pilih akun untuk QRIS");
        return;
      }
      const sum = pays.reduce((s, x) => s + Number(x.amount || 0), 0);
      if (grandTotal > 0.01 && sum + 0.02 < grandTotal) {
        toast.error("Total pembayaran kurang dari grand total");
        return;
      }
      if (hutangGap > 0.02 && !customerId) {
        toast.error("Pilih pelanggan agar sisa (grand total − tunai/transfer/QRIS) bisa dicatat sebagai piutang");
        return;
      }
    }
    const payload = {
      customer_id: customerId ? Number(customerId) : null,
      discount_total: discountTotal,
      tax_percent: taxPercent,
      additional_fee: additionalFee,
      additional_fee_name: additionalFeeName,
      notes,
      sale_date: saleDate,
      status,
      items: cart.map((c) => ({
        product_id: c.product_id,
        qty: c.qty,
        sell_price: c.sell_price,
        discount_amount: c.discount_amount || 0,
        is_custom: c.is_custom || false,
        name: c.is_custom ? c.name : undefined,
      })),
      payments: pays,
    };
    const t = toast.loading(status === "completed" ? "Menyimpan..." : "Menyimpan draft...");
    try {
      const { data } = await api.post("/api/transactions", payload);
      const baseMsg = data.invoice_no || "Tersimpan";
      const hasReceivable = status === "completed" && hutangGap > 0.02;
      toast.success(hasReceivable ? `${baseMsg} · belum lunas (ada piutang)` : baseMsg, { id: t });
      if (draftResumeIdRef.current) {
        const rid = draftResumeIdRef.current;
        draftResumeIdRef.current = null;
        api.delete(`/api/transactions/${rid}`, { skipToast: true }).catch(() => { });
      }
      try {
        localStorage.removeItem(POS_DRAFT_KEY);
      } catch {
        /* */
      }
      if (status === "completed") {
        const pays = receiptPaymentsFromDraft();
        const paidSum = pays.reduce((s, p) => s + p.amount, 0);
        const changeAmt = Math.max(0, paidSum - grandTotal);
        const queueNo = data.id ? `#${data.id}` : `#${data.invoice_no || "1"}`;
        const custObj = selectedCustomerOption?.customer || customers.find((c) => String(c.id) === String(customerId)) || null;
        const custName = custObj?.name || "Umum";
        const totalPointsNow =
          custObj
            ? (data.customer_total_points != null
                ? data.customer_total_points
                : Number(custObj.total_points || 0) + Number(data.points_earned || 0))
            : null;

        setCompletedTx({
          id: data.id,
          invoice_no: data.invoice_no || `INV-${data.id}`,
          queue_no: queueNo,
          grand_total: data.grand_total ?? grandTotal,
          paid_amount: paidSumDraft > 0 ? paidSumDraft : paidSum,
          change_amount: data.change_amount ?? changeAmt,
          sale_date: saleDate,
          lines: [...cart],
          subtotal,
          discountTotal,
          taxPercent,
          taxAmount,
          additionalFee,
          additionalFeeName,
          payments: pays,
          customer: custObj ? { ...custObj, total_points: totalPointsNow } : null,
          customer_name: custName,
          customer_total_points: totalPointsNow,
          receiptWaPhone: custObj ? receiptWaPhone : "",
          points_earned: custObj ? (data.points_earned || 0) : 0,
        });
        setSuccessModalOpen(true);
      }

      setCart([]);
      setLineDraft({});
      setDiscountTotal(0);
      setNotes("");
      setPayOpen(false);
      setTransferAmtStr("");
      setQrisAmtStr("");
      setCashAmtStr("");
      setCustomerId("");
      setSelectedCustomerOption(null);
      setReceiptWaPhone("");
      setAdditionalFee(0);
      setAdditionalFeeName("Ongkos Kirim");
      setTaxPercent(0);
      setSaleDate(new Date().toISOString().slice(0, 10));
      fetchProductPage(1, false).catch(() => { });
      setProductPage(1);
    } catch {
      toast.dismiss(t);
    }
  }

  function getTxReceiptDateStr(tx) {
    if (!tx) return new Date().toLocaleString("id-ID");
    const nowTime = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    if (tx.created_at) {
      const d = new Date(tx.created_at);
      const time = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
      const date = tx.sale_date || d.toLocaleDateString("id-ID");
      return `${date} · ${time}`;
    }
    return tx.sale_date ? `${tx.sale_date} · ${nowTime}` : new Date().toLocaleString("id-ID");
  }

  async function printCompletedBluetoothReceipt(tx) {
    if (!tx) return;
    const binary = buildEscPosReceiptBinary({
      storeName: receiptCfg.store_name,
      storeAddress: receiptCfg.store_address,
      storePhone: receiptCfg.store_phone,
      footer: receiptCfg.receipt_footer,
      invoiceNo: tx.invoice_no,
      queueNo: tx.queue_no,
      customerName: tx.customer?.name || tx.customer_name || "Umum",
      customerPoints: tx.customer ? (tx.customer_total_points ?? tx.customer?.total_points ?? null) : null,
      pointsEarned: tx.customer ? (tx.points_earned || 0) : 0,
      dateStr: getTxReceiptDateStr(tx),
      lines: tx.lines || [],
      subtotal: tx.subtotal || 0,
      discountTotal: tx.discountTotal || 0,
      taxPercent: tx.taxPercent || 0,
      taxAmount: tx.taxAmount || 0,
      additionalFee: tx.additionalFee || 0,
      additionalFeeName: tx.additionalFeeName || "Biaya Tambahan",
      grandTotal: tx.grand_total || 0,
      changeAmount: tx.change_amount || 0,
      payments: tx.payments || [],
      widthMm: Number(receiptCfg.thermal_width_mm) || 58,
    });
    const t = toast.loading("Mencetak ke Printer Bluetooth...");
    try {
      await printViaWebBluetooth(binary);
      toast.success("Struk dikirim ke Printer Bluetooth!", { id: t });
    } catch (err) {
      toast.dismiss(t);
      toast.error(err.message || "Printer Bluetooth SPP tidak merespons GATT. Gunakan tombol RawBT.");
    }
  }

  function printCompletedRawBtReceipt(tx) {
    if (!tx) return;
    const binary = buildEscPosReceiptBinary({
      storeName: receiptCfg.store_name,
      storeAddress: receiptCfg.store_address,
      storePhone: receiptCfg.store_phone,
      footer: receiptCfg.receipt_footer,
      invoiceNo: tx.invoice_no,
      queueNo: tx.queue_no,
      customerName: tx.customer?.name || tx.customer_name || "Umum",
      customerPoints: tx.customer ? (tx.customer_total_points ?? tx.customer?.total_points ?? null) : null,
      pointsEarned: tx.customer ? (tx.points_earned || 0) : 0,
      dateStr: getTxReceiptDateStr(tx),
      lines: tx.lines || [],
      subtotal: tx.subtotal || 0,
      discountTotal: tx.discountTotal || 0,
      taxPercent: tx.taxPercent || 0,
      taxAmount: tx.taxAmount || 0,
      additionalFee: tx.additionalFee || 0,
      additionalFeeName: tx.additionalFeeName || "Biaya Tambahan",
      grandTotal: tx.grand_total || 0,
      changeAmount: tx.change_amount || 0,
      payments: tx.payments || [],
      widthMm: Number(receiptCfg.thermal_width_mm) || 58,
    });
    printViaRawBTBase64(binary);
  }

  function printCompletedReceipt(tx) {
    if (!tx) return;
    const w = window.open("", "_blank", "width=380,height=720");
    if (!w) return toast.error("Popup diblokir");
    const html = buildThermalReceiptHtml({
      storeName: receiptCfg.store_name,
      storeAddress: receiptCfg.store_address,
      storePhone: receiptCfg.store_phone,
      footer: receiptCfg.receipt_footer,
      widthMm: Number(receiptCfg.thermal_width_mm) || 80,
      invoiceNo: tx.invoice_no,
      queueNo: tx.queue_no,
      customerName: tx.customer?.name || tx.customer_name || "Umum",
      customerPoints: tx.customer ? (tx.customer_total_points ?? tx.customer?.total_points ?? null) : null,
      pointsEarned: tx.customer ? (tx.points_earned || 0) : 0,
      dateStr: getTxReceiptDateStr(tx),
      lines: tx.lines || [],
      subtotal: tx.subtotal || 0,
      discountTotal: tx.discountTotal || 0,
      taxPercent: tx.taxPercent || 0,
      taxAmount: tx.taxAmount || 0,
      additionalFee: tx.additionalFee || 0,
      additionalFeeName: tx.additionalFeeName || "Biaya Tambahan",
      grandTotal: tx.grand_total || 0,
      paidSum: tx.paid_amount || 0,
      changeAmount: tx.change_amount || 0,
      payments: tx.payments || [],
    });
    w.document.write(html);
    w.document.close();
  }

  function printCompletedQueueTicket(tx) {
    if (!tx) return;
    const w = window.open("", "_blank", "width=380,height=500");
    if (!w) return toast.error("Popup diblokir");
    const queueNo = tx.queue_no || `#${tx.id}`;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Nomor Antrian</title>
<style>
  @page { size: ${Number(receiptCfg.thermal_width_mm) || 80}mm auto; margin: 2mm; }
  html,body{margin:0;padding:0;font-family:system-ui,sans-serif;text-align:center;}
  .wrap{max-width:${Number(receiptCfg.thermal_width_mm) || 80}mm;margin:0 auto;padding:12px 6px;}
  .store{font-weight:700;font-size:14px;margin-bottom:8px;}
  .lbl{font-size:12px;font-weight:600;color:#444;margin-top:10px;}
  .num{font-size:42px;font-weight:900;margin:8px 0;letter-spacing:1px;}
  .inv{font-size:11px;color:#666;}
  .ftr{font-size:10px;color:#777;margin-top:14px;border-top:1px dashed #aaa;padding-top:8px;}
</style></head><body><div class="wrap">
<div class="store">${receiptCfg.store_name || "Toko"}</div>
<div class="lbl">NOMOR ANTRIAN</div>
<div class="num">${queueNo}</div>
<div class="inv">${tx.invoice_no} · ${getTxReceiptDateStr(tx)}</div>
<div class="ftr">Silakan simpan nomor ini.<br/>Terima kasih atas kunjungan Anda!</div>
</div><script>window.onload=function(){window.print();}<\/script></body></html>`;
    w.document.write(html);
    w.document.close();
  }

  function shareCompletedWa(tx) {
    if (!tx) return;
    const custWa = tx.customer?.whatsapp || tx.receiptWaPhone || receiptWaPhone;
    const wa = normalizeWhatsAppPhone(custWa);
    if (!wa) {
      toast.error("Nomor WhatsApp pelanggan tidak tersedia. Isi nomor WA terlebih dahulu.");
      return;
    }
    const text = encodeURIComponent(
      buildReceiptWhatsAppText({
        storeName: receiptCfg.store_name,
        invoiceNo: tx.invoice_no,
        queueNo: tx.queue_no,
        customerName: tx.customer?.name || tx.customer_name || "Umum",
        customerPoints: tx.customer ? (tx.customer_total_points ?? tx.customer?.total_points ?? null) : null,
        pointsEarned: tx.customer ? (tx.points_earned || 0) : 0,
        dateStr: getTxReceiptDateStr(tx),
        lines: tx.lines || [],
        subtotal: tx.subtotal || 0,
        discountTotal: tx.discountTotal || 0,
        taxPercent: tx.taxPercent || 0,
        taxAmount: tx.taxAmount || 0,
        additionalFee: tx.additionalFee || 0,
        additionalFeeName: tx.additionalFeeName || "Biaya Tambahan",
        grandTotal: tx.grand_total || 0,
        payments: tx.payments || [],
        changeAmount: tx.change_amount || 0,
      })
    );
    window.open(`https://wa.me/${wa}?text=${text}`, "_blank");
  }

  function openPrintReceipt() {
    const pays = receiptPaymentsFromDraft();
    const paidSum = pays.reduce((s, p) => s + p.amount, 0);
    const changeAmt = Math.max(0, paidSum - grandTotal);
    const w = window.open("", "_blank", "width=380,height=720");
    if (!w) return toast.error("Popup diblokir");
    const html = buildThermalReceiptHtml({
      storeName: receiptCfg.store_name,
      storeAddress: receiptCfg.store_address,
      storePhone: receiptCfg.store_phone,
      footer: receiptCfg.receipt_footer,
      widthMm: Number(receiptCfg.thermal_width_mm) || 80,
      invoiceNo: "Preview keranjang",
      customerName: selectedCustomerOption?.customer?.name || "Umum",
      customerPoints: selectedCustomerOption?.customer ? (selectedCustomerOption.customer.total_points ?? null) : null,
      dateStr: saleDate || new Date().toLocaleDateString("id-ID"),
      lines: cart,
      subtotal,
      discountTotal,
      taxPercent,
      taxAmount,
      additionalFee,
      additionalFeeName,
      grandTotal,
      paidSum,
      changeAmount: changeAmt,
      payments: pays,
    });
    w.document.write(html);
    w.document.close();
  }

  function waNotaToNumber(phoneDigits, invoiceNo = "Keranjang") {
    const wa = normalizeWhatsAppPhone(phoneDigits);
    if (!wa) {
      toast.error("Isi nomor WhatsApp tujuan");
      return;
    }
    const pays = receiptPaymentsFromDraft();
    const paidSum = pays.reduce((s, p) => s + p.amount, 0);
    const changeAmt = Math.max(0, paidSum - grandTotal);
    const text = encodeURIComponent(
      buildReceiptWhatsAppText({
        storeName: receiptCfg.store_name,
        invoiceNo,
        customerName: selectedCustomerOption?.customer?.name || "Umum",
        customerPoints: selectedCustomerOption?.customer ? (selectedCustomerOption.customer.total_points ?? null) : null,
        pointsEarned: 0,
        dateStr: saleDate,
        lines: cart,
        subtotal,
        discountTotal,
        taxPercent,
        taxAmount,
        grandTotal,
        payments: pays,
        changeAmount: changeAmt,
      })
    );
    window.open(`https://wa.me/${wa}?text=${text}`, "_blank");
  }

  const receiptWaShareBlock = (opts = {}) => {
    const { invoiceLabel = "Keranjang" } = opts;
    return (
      <div className="rounded-2xl border border-emerald-200/60 bg-emerald-50/70 p-3.5 shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/40">
        <div className="mb-2 flex items-center gap-2 text-xs font-bold text-emerald-900 dark:text-emerald-200">
          <MessageSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span>Kirim Struk WhatsApp</span>
        </div>
        <div className="flex gap-2">
          <input
            type="tel"
            inputMode="numeric"
            className="min-w-0 flex-1 rounded-xl border border-emerald-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-900 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-emerald-800 dark:bg-slate-950 dark:text-white"
            placeholder="Nomor WA (contoh: 08123456789)"
            value={receiptWaPhone}
            onChange={(e) => setReceiptWaPhone(e.target.value.replace(/[^\d]/g, ""))}
          />
          <button
            type="button"
            disabled={!cart.length}
            onClick={() => waNotaToNumber(receiptWaPhone, invoiceLabel)}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-soft transition hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" /> Kirim
          </button>
        </div>
      </div>
    );
  };

  const resolveScannedCode = useCallback(
    async (rawCode) => {
      const code = String(rawCode || "").trim();
      if (!code) return false;

      // Detect member barcode (MBR-xxx)
      if (code.startsWith("MBR-")) {
        try {
          const { data } = await api.get(`/api/customers/barcode/${encodeURIComponent(code)}`);
          if (data && data.id) {
            setCustomerId(String(data.id));
            setSelectedCustomerOption({
              value: String(data.id),
              label: `${data.name}${data.whatsapp ? " (" + data.whatsapp + ")" : ""}`,
              customer: data,
            });
            if (data.whatsapp) setReceiptWaPhone(String(data.whatsapp).replace(/\D/g, ""));
            toast.success(`Pelanggan: ${data.name} (${data.total_points || 0} point)`);
            return true;
          }
        } catch {
          toast.error("Member tidak ditemukan");
        }
        return false;
      }
      let found = products.find((p) => p.barcode === code || p.sku === code);
      if (!found) {
        try {
          const { data } = await api.get("/api/products", { params: { q: code, limit: PAGE_SIZE, active: 1 } });
          found =
            (data.data || []).find((p) => p.barcode === code || p.sku === code) || data.data?.[0];
        } catch {
          /* */
        }
      }
      if (!found) {
        try {
          const { data } = await api.get("/api/products", { params: { q: code, limit: 5 } });
          const inactive =
            (data.data || []).find((p) => (p.barcode === code || p.sku === code) && Number(p.is_active) === 0) ||
            (data.data || []).find((p) => Number(p.is_active) === 0);
          if (inactive) {
            toast.error(`"${inactive.name}" nonaktif — aktifkan di halaman Produk`);
            return false;
          }
        } catch {
          /* */
        }
      }
      if (found) {
        addToCart(found);
        return true;
      }
      return false;
    },
    [products, addToCart]
  );

  useEffect(() => {
    resolveScannedCodeRef.current = resolveScannedCode;
  }, [resolveScannedCode]);

  async function handleBarcode(e) {
    if (e.key !== "Enter") return;
    const code = e.target.value.trim();
    if (!code) return;
    const ok = await resolveScannedCode(code);
    if (!ok) toast.error("Produk tidak ditemukan");
    e.target.value = "";
    focusBarcodeInputs();
  }

  useEffect(() => {
    if (!cameraScanOpen) return;
    let closed = false;
    cameraStartedRef.current = false;

    (async () => {
      try {
        setCameraError("");
        setCameraStatus("Meminta akses kamera...");
        const scanner = new Html5Qrcode("pos-camera-scan-region", { verbose: false });
        cameraScannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 280, height: 140 },
            disableFlip: true,
            rememberLastUsedCamera: true,
          },
          async (decodedText) => {
            if (cameraBusyRef.current || closed) return;
            cameraBusyRef.current = true;
            setCameraLastCode(decodedText);
            const ok = await resolveScannedCodeRef.current?.(decodedText);
            if (!ok) toast.error(`Barcode tidak ditemukan: ${decodedText}`);
            if (navigator.vibrate) navigator.vibrate(60);
            setTimeout(() => {
              cameraBusyRef.current = false;
            }, 900);
          },
          () => { }
        );
        cameraStartedRef.current = true;
        if (closed) {
          try {
            await scanner.stop();
          } catch {
            /* */
          }
          try {
            await scanner.clear();
          } catch {
            /* */
          }
          return;
        }
        if (!closed) setCameraStatus("Kamera aktif — arahkan barcode ke kotak scan.");
      } catch {
        if (!closed) {
          setCameraError("Gagal mengaktifkan kamera. Pastikan izin kamera diizinkan dan akses lewat HTTPS.");
          setCameraStatus("");
        }
      }
    })();

    return () => {
      closed = true;
      cameraBusyRef.current = false;
      const scanner = cameraScannerRef.current;
      cameraScannerRef.current = null;
      if (!scanner) return;
      const clearScanner = () => {
        try {
          const clearResult = scanner.clear();
          if (clearResult && typeof clearResult.catch === "function") clearResult.catch(() => { });
        } catch {
          /* */
        }
      };
      if (cameraStartedRef.current) {
        try {
          const stopResult = scanner.stop();
          Promise.resolve(stopResult)
            .catch(() => { })
            .finally(() => {
              clearScanner();
            });
        } catch {
          clearScanner();
        }
      } else {
        clearScanner();
      }
      cameraStartedRef.current = false;
    };
  }, [cameraScanOpen]);

  function printBarcodeLabels() {
    const p = products.find((x) => String(x.id) === String(barcodeProdId));
    if (!p) return toast.error("Pilih produk");
    const code = p.barcode || p.sku;
    if (!code) return toast.error("Produk tanpa barcode/SKU");
    const n = Math.min(50, Math.max(1, parseOptionalInt(barcodeCopies, 1, { min: 1, max: 50 })));
    const w = window.open("", "_blank", "width=400,height=600");
    if (!w) return toast.error("Popup diblokir");
    const labels = [];
    for (let i = 0; i < n; i++) {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      JsBarcode(svg, String(code), {
        format: "CODE128",
        width: 2.4,
        height: 72,
        displayValue: true,
        fontSize: 14,
        textMargin: 4,
        margin: 12,
      });
      const bottom = String(p.barcode || p.sku || code).replace(/</g, "&lt;");
      labels.push(
        `<div class="lb" style="page-break-after:always;text-align:center;padding:8px;font-family:sans-serif;font-size:11px;display:flex;flex-direction:column;align-items:center;gap:2px;">
          <div style="font-weight:600;line-height:1.15;margin:0;max-width:100%;">${String(p.name).replace(/</g, "&lt;")}</div>
          <div style="line-height:0">${svg.outerHTML}</div>
          <div style="margin:0;font-family:monospace;font-size:10px;line-height:1.15;">${bottom}</div>
        </div>`
      );
    }
    w.document.write(
      `<!DOCTYPE html><html><head><title>Barcode</title><style>body{margin:0} @media print{.lb{page-break-after:always}}</style></head><body>${labels.join("")}<script>window.onload=function(){window.print();}<\/script></body></html>`
    );
    w.document.close();
  }

  const hasMoreProducts = products.length < productTotal;
  const maxProductPage = Math.max(1, Math.ceil(productTotal / PRODUCT_PAGE_SIZE));

  return (
    <PageStack>
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Point of Sale</h1>
          <p className="text-sm text-slate-500">Kasir dan transaksi kasir langsung</p>
        </div>
        {/* Tombol Draft, Hold, Struk disembunyikan sesuai permintaan */}
        {/* 
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => submitSale("draft")}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600"
          >
            <Save className="h-4 w-4" /> Draft
          </button>
          <button
            type="button"
            onClick={() => submitSale("hold")}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-amber-700"
          >
            <Pause className="h-4 w-4" /> Hold
          </button>
          <button
            type="button"
            onClick={openPrintReceipt}
            disabled={!cart.length}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-emerald-700 disabled:opacity-50"
          >
            <Printer className="h-4 w-4" /> Struk
          </button>
        </div>
        */}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {/* Kolom Kiri (Desktop): Pencarian & Daftar Barang */}
        <div className="hidden space-y-3 xl:block xl:col-span-2">
          <div className="sticky top-0 z-10 space-y-3 rounded-b-2xl bg-slate-50/95 pb-2 pt-1 backdrop-blur dark:bg-slate-950/95">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-medium dark:border-slate-700 dark:bg-slate-900"
                placeholder="Cari nama barang, barcode..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <ScanBarcode className="h-5 w-5 shrink-0 text-brand-600 dark:text-brand-400" />
              <input
                ref={desktopBarcodeRef}
                inputMode="none"
                virtualKeyboardPolicy="manual"
                className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-slate-400"
                placeholder="Klik & Scan Barcode..."
                onKeyDown={handleBarcode}
                onFocus={() => {
                  if (typeof window !== "undefined" && "virtualKeyboard" in navigator) {
                    try {
                      navigator.virtualKeyboard.hide();
                    } catch {
                      /* */
                    }
                  }
                }}
              />
              <button
                type="button"
                onClick={() => {
                  setCameraLastCode("");
                  setCameraError("");
                  setCameraScanOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-3 py-2 text-xs font-bold text-white shadow-soft transition hover:bg-brand-700"
              >
                <Camera className="h-4 w-4" /> Kamera HP
              </button>
            </div>
          </div>
          <div className="max-h-[min(460px,55vh)] overflow-y-auto rounded-2xl border border-slate-100 dark:border-slate-800">
            {inactiveHint && (
              <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                <strong>{inactiveHint.name}</strong> ditemukan tapi <strong>nonaktif</strong>.
              </div>
            )}
            {productsLoading ? (
              <div className="flex min-h-[260px] flex-col items-center justify-center gap-2.5 py-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-brand-600 dark:text-brand-400" />
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Memuat produk...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 py-10 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                  <ShoppingBag className="h-6 w-6" />
                </div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {dq.trim() ? "Tidak ada produk yang cocok" : "Belum ada data produk"}
                </p>
              </div>
            ) : (
              <div className="grid gap-2 p-2 sm:grid-cols-2">
                {products.map((p) => {
                  const left = availableOnGrid(p);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={left <= 0}
                      onClick={() => addToCart(p)}
                      className="flex w-full gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-xs transition hover:border-brand-400 disabled:cursor-not-allowed disabled:opacity-45 dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div className="min-w-0 flex-1 flex flex-col">
                        <span className="line-clamp-2 text-sm font-bold text-slate-900 dark:text-white">{p.name}</span>
                        <span className="mt-1 text-brand-700 font-bold dark:text-brand-300">
                          {formatIDR(p.sell_price)}
                          {p.wholesale_price > 0 && p.wholesale_min_qty > 0 ? (
                            <span className="ml-1.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                              (Grosir min {p.wholesale_min_qty}: {formatIDR(p.wholesale_price)})
                            </span>
                          ) : null}
                        </span>
                        {p.variants && p.variants.length > 0 ? (
                          <span className="mt-1 inline-block rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold text-brand-700 dark:bg-brand-950/40 dark:text-brand-300">
                            {p.variants.length} Varian
                          </span>
                        ) : null}
                        <span className={`text-xs ${left <= 0 ? "text-red-500" : "text-slate-400"}`}>
                          Tersisa: {left}
                          {(reservedByProduct[p.id] || 0) > 0 ? (
                            <span className="text-slate-500"> / gudang {p.stock}</span>
                          ) : null}
                        </span>
                      </div>
                      {p.image_path ? (
                        <img
                          src={uploadSrc(p.image_path)}
                          alt=""
                          className="h-20 w-20 shrink-0 self-start rounded-xl border border-slate-200 object-cover dark:border-slate-600"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          {hasMoreProducts && (
            <button
              type="button"
              onClick={loadMoreProducts}
              className="w-full rounded-xl border border-dashed border-slate-300 py-2 text-xs text-slate-600 dark:border-slate-600 dark:text-slate-400"
            >
              Muat lagi produk ({products.length}/{productTotal}
              {maxProductPage > 1 ? ` · hal ${productPage}/${maxProductPage}` : ""})
            </button>
          )}
        </div>

        {/* Kolom Kanan (Desktop) & Utama (Mobile): Keranjang Transaksi */}
        <div className="space-y-3 xl:col-span-1">
          {/* Scanner Barcode di Tampilan Mobile */}
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm dark:border-slate-800 dark:bg-slate-900 xl:hidden">
            <ScanBarcode className="h-5 w-5 shrink-0 text-brand-600 dark:text-brand-400" />
            <input
              ref={mobileBarcodeRef}
              inputMode="none"
              virtualKeyboardPolicy="manual"
              className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-slate-400"
              placeholder="Scan Barcode..."
              onKeyDown={handleBarcode}
              onFocus={() => {
                if (typeof window !== "undefined" && "virtualKeyboard" in navigator) {
                  try {
                    navigator.virtualKeyboard.hide();
                  } catch {
                    /* */
                  }
                }
              }}
            />
            <button
              type="button"
              onClick={() => {
                setCameraLastCode("");
                setCameraError("");
                setCameraScanOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-3 py-2 text-xs font-bold text-white shadow-soft transition hover:bg-brand-700"
            >
              <Camera className="h-4 w-4" /> Kamera HP
            </button>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold text-slate-900 dark:text-white">Keranjang</h2>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {cart.length} Item
              </span>
            </div>

            <div ref={cartContainerRef} className="max-h-[min(480px,58vh)] space-y-3 overflow-auto pr-1">
              {cart.length === 0 && (
                <div className="py-10 text-center">
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                    <ShoppingBag className="h-7 w-7" />
                  </div>
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Belum ada item di keranjang</p>
                </div>
              )}
              {cart.map((c) => {
                const itemKey = c.item_key || String(c.product_id);
                const gross = c.sell_price * c.qty;
                const disc = Number(c.discount_amount || 0);
                const net = gross - disc;
                const ld = lineDraft[itemKey] || {};
                const qtyShow = ld.qty !== undefined ? ld.qty : String(c.qty);
                const sellShow = ld.sell !== undefined ? ld.sell : String(c.sell_price);
                const discShow = ld.disc !== undefined ? ld.disc : String(Number(c.discount_amount || 0));
                const capQty = lineQtyCap(c);
                const isWholesaleActive = c.wholesale_price > 0 && c.wholesale_min_qty > 0 && c.qty >= c.wholesale_min_qty;
                const isDiscOpen = disc > 0 || lineDraft[itemKey]?.disc !== undefined || !!discOpenKeys[itemKey];
                return (
                  <div key={itemKey} className="group relative rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs transition-all hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5 dark:border-slate-800/60">
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-bold text-slate-900 line-clamp-1 dark:text-white">
                          {c.is_custom && <Package className="inline h-3.5 w-3.5 mr-1 text-amber-500" />}
                          {c.name}
                        </h4>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          {isWholesaleActive && (
                            <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                              Harga Grosir (≥{c.wholesale_min_qty})
                            </span>
                          )}
                          {c.is_custom_price && (
                            <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                              Harga Custom
                            </span>
                          )}
                          {c.is_custom && (
                            <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                              Item Bebas
                            </span>
                          )}
                          {c.selected_unit && (
                            <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                              {c.selected_unit.unit_name}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          removeLine(itemKey);
                        }}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-red-500 transition-colors hover:bg-red-50 active:scale-95 dark:hover:bg-red-950/40"
                        title="Hapus item dari keranjang"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          Jumlah
                        </label>
                        <div className="flex h-10 items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-1.5 dark:border-slate-700 dark:bg-slate-950">
                          <button
                            type="button"
                            onClick={() => adjustQty(itemKey, c, -1)}
                            disabled={c.qty <= 1}
                            className="flex h-7 w-7 aspect-square shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold transition hover:bg-emerald-700 active:scale-95 disabled:opacity-30"
                            title="Kurangi"
                          >
                            <Minus className="h-3.5 w-3.5 stroke-[3]" />
                          </button>
                          <input
                            type="text"
                            inputMode="numeric"
                            className="w-full text-center text-sm font-bold text-slate-900 bg-transparent outline-none dark:text-white"
                            value={qtyShow}
                            onChange={(e) =>
                              setLineDraft((m) => ({
                                ...m,
                                [itemKey]: { ...(m[itemKey] || {}), qty: e.target.value.replace(/\D/g, "").slice(0, 8) },
                              }))
                            }
                            onBlur={() => {
                              const rawQty = lineDraft[itemKey]?.qty;
                              setLineDraft((m) => {
                                const inner = { ...(m[itemKey] || {}) };
                                delete inner.qty;
                                const next = { ...m };
                                if (Object.keys(inner).length === 0) delete next[itemKey];
                                else next[itemKey] = inner;
                                return next;
                              });
                              const qv = parseOptionalInt(rawQty ?? String(c.qty), c.qty, { min: 1, max: capQty });
                              updateLine(itemKey, { qty: qv });
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => adjustQty(itemKey, c, 1)}
                            disabled={c.qty >= capQty}
                            className="flex h-7 w-7 aspect-square shrink-0 items-center justify-center rounded-lg bg-red-500 text-white font-bold transition hover:bg-red-600 active:scale-95 disabled:opacity-30"
                            title="Tambah"
                          >
                            <Plus className="h-3.5 w-3.5 stroke-[3]" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="mb-1 block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          Harga Satuan (Rp)
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 shadow-xs outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                          value={sellShow}
                          onChange={(e) =>
                            setLineDraft((m) => ({
                              ...m,
                              [itemKey]: { ...(m[itemKey] || {}), sell: e.target.value.replace(/[^\d]/g, "").slice(0, 14) },
                            }))
                          }
                          onBlur={() => {
                            const rawSell = lineDraft[itemKey]?.sell;
                            setLineDraft((m) => {
                              const inner = { ...(m[itemKey] || {}) };
                              delete inner.sell;
                              const next = { ...m };
                              if (Object.keys(inner).length === 0) delete next[itemKey];
                              else next[itemKey] = inner;
                              return next;
                            });
                            const pv = parseOptionalFloat(rawSell ?? String(c.sell_price), c.sell_price, { min: 0 });
                            if (pv !== c.sell_price) {
                              setPendingPriceChange({ itemKey, cartItem: c, newPrice: pv });
                              setPriceConfirmModalOpen(true);
                            }
                          }}
                        />
                      </div>
                    </div>

                    {isDiscOpen ? (
                      <div className="mt-2.5 flex items-center justify-between gap-2 rounded-xl border border-slate-200/60 bg-slate-50/80 p-2 dark:border-slate-800 dark:bg-slate-950/60">
                        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                          Diskon Baris (Rp)
                        </span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="0"
                            className="h-8 w-28 rounded-lg border border-slate-200 bg-white px-2.5 text-right text-xs font-bold text-slate-900 shadow-xs outline-none transition focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                            value={discShow}
                            onChange={(e) =>
                              setLineDraft((m) => ({
                                ...m,
                                [itemKey]: { ...(m[itemKey] || {}), disc: e.target.value.replace(/[^\d]/g, "").slice(0, 14) },
                              }))
                            }
                            onBlur={() => {
                              const rawDisc = lineDraft[itemKey]?.disc;
                              const g = c.sell_price * c.qty;
                              setLineDraft((m) => {
                                const inner = { ...(m[itemKey] || {}) };
                                delete inner.disc;
                                const next = { ...m };
                                if (Object.keys(inner).length === 0) delete next[itemKey];
                                else next[itemKey] = inner;
                                return next;
                              });
                              const dv = parseOptionalFloat(rawDisc ?? String(disc), disc, { min: 0, max: g });
                              updateLine(itemKey, { discount_amount: dv });
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              updateLine(itemKey, { discount_amount: 0 });
                              setDiscOpenKeys((prev) => {
                                const next = { ...prev };
                                delete next[itemKey];
                                return next;
                              });
                            }}
                            className="flex h-6 w-6 items-center justify-center rounded-md text-xs text-slate-400 hover:bg-slate-200 hover:text-red-500 dark:hover:bg-slate-800"
                            title="Tutup / Reset Diskon"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 flex items-center justify-start">
                        <button
                          type="button"
                          onClick={() => setDiscOpenKeys((prev) => ({ ...prev, [itemKey]: true }))}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:underline dark:text-brand-400"
                        >
                          <Tags className="h-3 w-3" /> + Tambah Diskon Item
                        </button>
                      </div>
                    )}

                    {/* Unit switching dropdown */}
                    {!c.is_custom && c.unit_conversions && c.unit_conversions.length > 0 && (
                      <div className="mt-2 flex items-center gap-2 rounded-xl border border-blue-200/60 bg-blue-50/50 p-2 dark:border-blue-900/40 dark:bg-blue-950/30">
                        <ArrowRightLeft className="h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
                        <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-300 shrink-0">Satuan:</span>
                        <select
                          className="min-w-0 flex-1 rounded-lg border border-blue-200 bg-white px-2 py-1 text-xs font-bold text-slate-900 outline-none dark:border-blue-800 dark:bg-slate-900 dark:text-white"
                          value={c.selected_unit ? String(c.selected_unit.id) : ""}
                          onChange={(e) => switchCartUnit(itemKey, e.target.value ? Number(e.target.value) : null)}
                        >
                          <option value="">{c.base_unit || "PCS"}</option>
                          {c.unit_conversions.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.unit_name} (1 {u.unit_name} = {u.conversion_qty} {c.base_unit || "PCS"}) — {formatIDR(u.sell_price)}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 text-xs dark:border-slate-800">
                      <span className="text-[11px] text-slate-400">
                        {!c.is_custom && <>Margin: <strong className="font-semibold text-emerald-600 dark:text-emerald-400">{formatIDR(net - c.purchase_price * c.qty)}</strong></>}
                        {c.is_custom && <span className="text-purple-500 dark:text-purple-400">Item Bebas</span>}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        Subtotal: {formatIDR(net)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tombol Aksi Keranjang */}
            <div className="mt-3.5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectProductModalOpen(true)}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-2.5 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 active:scale-[0.98] sm:text-sm"
              >
                <Plus className="h-4 w-4 shrink-0 stroke-[2.5]" />
                <span className="truncate">Tambah Produk</span>
              </button>
              <button
                type="button"
                onClick={() => setCustomItemOpen(true)}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-amber-300/80 bg-amber-50/80 px-2.5 py-2.5 text-xs font-bold text-amber-800 shadow-xs transition hover:bg-amber-100 active:scale-[0.98] sm:text-sm dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/40"
              >
                <Package className="h-4 w-4 shrink-0 stroke-[2.2]" />
                <span className="truncate">Item Bebas</span>
              </button>
            </div>

            {/* Pilih Pelanggan */}
            <div className="mt-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-900/60">
              <div className="mb-1.5 flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-400">
                  <UserSearch className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" /> Pelanggan
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setNewCustName("");
                    setNewCustPhone("");
                    setNewCustAddress("");
                    setNewCustCategory("umum");
                    setNewCustNotes("");
                    setNewCustomerModalOpen(true);
                  }}
                  className="flex items-center gap-1 text-[11px] font-bold text-brand-600 hover:text-brand-700 hover:underline dark:text-brand-400 transition"
                  title="Tambah Pelanggan Baru"
                >
                  <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                  <span>+ Tambah Pelanggan</span>
                </button>
              </div>
              <AsyncCreatableSelect
                cacheOptions
                defaultOptions
                loadOptions={loadCustomerOptions}
                value={selectedCustomerOption}
                onChange={(opt) => {
                  if (opt) {
                    setCustomerId(opt.value);
                    setSelectedCustomerOption(opt);
                    if (opt.customer?.whatsapp) setReceiptWaPhone(String(opt.customer.whatsapp).replace(/\D/g, ""));
                  } else {
                    setCustomerId("");
                    setSelectedCustomerOption(null);
                  }
                }}
                onCreateOption={handleCreateCustomer}
                formatCreateLabel={(input) => `+ Tambah pelanggan baru: "${input}"`}
                isClearable
                placeholder="Cari atau ketik nama pelanggan..."
                noOptionsMessage={({ inputValue }) => (
                  <div className="p-2 text-center">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Pelanggan tidak ditemukan</p>
                    <button
                      type="button"
                      onClick={() => {
                        setNewCustName(inputValue || "");
                        setNewCustPhone("");
                        setNewCustAddress("");
                        setNewCustomerModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-700 shadow-sm transition"
                    >
                      <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                      <span>Tambah "{inputValue || "Pelanggan Baru"}"</span>
                    </button>
                  </div>
                )}
                loadingMessage={() => "Mencari..."}
                styles={{
                  control: (base, state) => ({
                    ...base,
                    borderRadius: "0.75rem",
                    minHeight: "38px",
                    height: "38px",
                    fontSize: "0.8125rem",
                    fontWeight: 500,
                    borderColor: state.isFocused ? (dark ? "#10b981" : "#059669") : (dark ? "#334155" : "#e2e8f0"),
                    backgroundColor: dark ? "#020617" : "#fff",
                    color: dark ? "#fff" : "#0f172a",
                    boxShadow: state.isFocused ? "0 0 0 1px #10b981" : "none",
                    "&:hover": { borderColor: dark ? "#475569" : "#cbd5e1" },
                  }),
                  valueContainer: (base) => ({
                    ...base,
                    padding: "0 8px",
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                  }),
                  placeholder: (base) => ({
                    ...base,
                    color: dark ? "#64748b" : "#94a3b8",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    margin: 0,
                    fontSize: "0.8125rem",
                  }),
                  singleValue: (base) => ({
                    ...base,
                    color: dark ? "#fff" : "#0f172a",
                    margin: 0,
                    fontSize: "0.8125rem",
                  }),
                  input: (base) => ({
                    ...base,
                    color: dark ? "#fff" : "#0f172a",
                    margin: 0,
                    padding: 0,
                  }),
                  indicatorSeparator: () => ({ display: "none" }),
                  indicatorsContainer: (base) => ({
                    ...base,
                    paddingRight: "4px",
                  }),
                  dropdownIndicator: (base) => ({
                    ...base,
                    padding: "4px",
                    color: dark ? "#64748b" : "#94a3b8",
                  }),
                  clearIndicator: (base) => ({
                    ...base,
                    padding: "4px",
                    color: dark ? "#64748b" : "#94a3b8",
                  }),
                  menu: (base) => ({
                    ...base,
                    borderRadius: "0.75rem",
                    overflow: "hidden",
                    zIndex: 50,
                    backgroundColor: dark ? "#0f172a" : "#fff",
                    border: dark ? "1px solid #1e293b" : "1px solid #e2e8f0",
                    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
                  }),
                  option: (base, state) => ({
                    ...base,
                    backgroundColor: state.isSelected
                      ? (dark ? "#047857" : "#059669")
                      : state.isFocused
                      ? (dark ? "#1e293b" : "#f1f5f9")
                      : "transparent",
                    color: state.isSelected ? "#fff" : (dark ? "#f1f5f9" : "#0f172a"),
                    fontSize: "0.8125rem",
                    fontWeight: state.isSelected ? 600 : 500,
                    padding: "8px 12px",
                    cursor: "pointer",
                  }),
                }}
              />
              {selectedCustomerOption?.customer && pointSettings.enabled && (
                <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                  <Award className="h-3.5 w-3.5" />
                  <span>{selectedCustomerOption.customer.total_points || 0} point</span>
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-500">{selectedCustomerOption.customer.total_visits || 0}x kunjungan</span>
                </div>
              )}
            </div>

            <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 dark:border-slate-800">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>{formatIDR(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setFeeDraftName(additionalFeeName);
                      setFeeDraftAmt(additionalFee ? String(additionalFee) : "");
                      setFeeModalOpen(true);
                    }}
                    className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400"
                  >
                    {additionalFee > 0 ? `${additionalFeeName || "Biaya Tambahan"} (Ubah)` : "+ Tambah Biaya"}
                  </button>
                </span>
                <span className="font-semibold">
                  {additionalFee > 0 ? (
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                      +{formatIDR(additionalFee)}
                      <button
                        type="button"
                        onClick={() => {
                          setAdditionalFee(0);
                          toast.success("Biaya tambahan dihapus");
                        }}
                        className="ml-1 text-xs text-red-500 hover:text-red-700"
                        title="Hapus biaya"
                      >
                        ✕
                      </button>
                    </span>
                  ) : (
                    "Rp0"
                  )}
                </span>
              </div>
              <div className="flex justify-between text-lg font-bold text-brand-700 dark:text-brand-300">
                <span>Grand Total</span>
                <span>{formatIDR(grandTotal)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>Margin (est.)</span>
                <span>{formatIDR(marginTotal)}</span>
              </div>
              <textarea
                className="w-full rounded-xl border border-slate-200 p-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                placeholder="Catatan transaksi"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 p-3.5 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 xl:static xl:z-auto xl:border-0 xl:bg-transparent xl:p-0">
                <button
                  type="button"
                  onClick={() => setPayOpen(true)}
                  disabled={!cart.length}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 py-3.5 text-base font-bold text-white shadow-lg transition hover:bg-brand-700 active:scale-[0.99] disabled:opacity-50 xl:shadow-soft"
                >
                  <CreditCard className="h-5 w-5" /> Bayar ({formatIDR(grandTotal)})
                </button>
              </div>
              <div className="h-16 xl:hidden" />
            </div>
          </div>
        </div>
      </div>

      <Modal open={payOpen} title="Pembayaran" onClose={() => setPayOpen(false)} wide>
        <div className="mb-4 rounded-xl bg-brand-50 p-3 text-sm dark:bg-brand-950/30">
          <div className="flex justify-between font-semibold">
            <span>Grand total</span>
            <span>{formatIDR(grandTotal)}</span>
          </div>
          <div className="mt-1 flex justify-between text-slate-600 dark:text-slate-400">
            <span>Tunai + transfer + QRIS</span>
            <span>{formatIDR(nonDebtPaid)}</span>
          </div>
          {hutangGap > 0.02 && (
            <div className="mt-1 flex justify-between text-slate-600 dark:text-slate-400">
              <span>Piutang (sisa otomatis)</span>
              <span>{formatIDR(hutangGap)}</span>
            </div>
          )}
          <div className="mt-1 flex justify-between font-semibold text-slate-800 dark:text-slate-200">
            <span>Total alokasi</span>
            <span>{formatIDR(paidSumDraft)}</span>
          </div>
          <div className="mt-2 flex justify-between text-lg font-bold text-brand-800 dark:text-brand-300">
            <span>Kembalian</span>
            <span>{formatIDR(kembalianDraft)}</span>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {enabledPayMethods.cash && (
            <div className="space-y-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
              <p className="text-sm font-medium">Cash (Tunai)</p>
              <select
                className="w-full rounded-lg border px-2 py-2 dark:border-slate-600 dark:bg-slate-950"
                value={cashAccountId}
                onChange={(e) => setCashAccountId(e.target.value)}
              >
                {cashAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                inputMode="numeric"
                className="w-full rounded-lg border px-2 py-2 text-base font-bold dark:border-slate-600 dark:bg-slate-950"
                placeholder="Jumlah cash (boleh lebih)"
                value={formatThousandsIdInput(cashAmtStr)}
                onChange={(e) => setCashAmtStr(e.target.value.replace(/\D/g, "").slice(0, 14))}
              />
            </div>
          )}
          {enabledPayMethods.transfer && (
            <div className="space-y-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
              <p className="text-sm font-medium">Transfer Bank</p>
              <select className="w-full rounded-lg border px-2 py-2 dark:border-slate-950" value={transferAcc} onChange={(e) => setTransferAcc(e.target.value)}>
                <option value="">Rekening</option>
                {cashAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                inputMode="numeric"
                className="w-full rounded-lg border px-2 py-2 dark:bg-slate-950"
                placeholder="Jumlah"
                value={formatThousandsIdInput(transferAmtStr)}
                onChange={(e) => setTransferAmtStr(e.target.value.replace(/\D/g, "").slice(0, 14))}
              />
            </div>
          )}
          {enabledPayMethods.qris && (
            <div className="space-y-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
              <p className="text-sm font-medium">QRIS</p>
              <select className="w-full rounded-lg border px-2 py-2 dark:bg-slate-950" value={qrisAcc} onChange={(e) => setQrisAcc(e.target.value)}>
                <option value="">Akun</option>
                {cashAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                inputMode="numeric"
                className="w-full rounded-lg border px-2 py-2 dark:bg-slate-950"
                placeholder="Jumlah"
                value={formatThousandsIdInput(qrisAmtStr)}
                onChange={(e) => setQrisAmtStr(e.target.value.replace(/\D/g, "").slice(0, 14))}
              />
            </div>
          )}
          {/* Piutang disembunyikan sesuai permintaan */}
          {/* 
          <div className="space-y-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800 md:col-span-2">
            <p className="text-sm font-medium">Piutang (sisa ke grand total)</p>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Nominal di atas belum menutup total? Sisanya otomatis jadi piutang — pilih pelanggan dulu.
            </p>
            {hutangGap > 0.02 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50/90 px-3 py-2 text-sm font-semibold text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
                Sisa piutang: {formatIDR(hutangGap)}
                {!customerId && (
                  <span className="mt-1 block text-xs font-normal text-red-600 dark:text-red-400">
                    Pilih pelanggan di keranjang agar transaksi bisa diselesaikan.
                  </span>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Tidak ada sisa piutang (atau grand total sudah tertutup).</p>
            )}
          </div>
          */}
        </div>

        {/* Saran Nominal Cepat Dynamic */}
        <div className="mt-4 space-y-2 border-b border-slate-100 pb-3 dark:border-slate-800">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Saran Nominal Cepat:</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-xl bg-brand-600 px-3.5 py-2 text-xs font-bold text-white shadow-soft transition hover:bg-brand-700 active:scale-95"
              onClick={() => setCashAmtStr(String(Math.max(0, Math.round(grandTotal))))}
            >
              Uang Pas ({formatIDR(grandTotal)})
            </button>
            {(() => {
              const exact = Math.max(0, Math.round(grandTotal));
              if (exact <= 0) return null;
              const suggestions = [];
              const rawTiers = [
                Math.ceil(exact / 5000) * 5000,
                Math.ceil(exact / 10000) * 10000,
                Math.ceil(exact / 20000) * 20000,
                Math.ceil(exact / 50000) * 50000,
                Math.ceil(exact / 100000) * 100000,
                Math.ceil(exact / 500000) * 500000,
              ];
              for (const v of rawTiers) {
                if (v > exact && !suggestions.includes(v)) {
                  suggestions.push(v);
                }
                if (suggestions.length >= 4) break;
              }
              return suggestions.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-800 shadow-xs hover:border-brand-500 hover:bg-brand-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
                  onClick={() => setCashAmtStr(String(amt))}
                >
                  {formatIDR(amt)}
                </button>
              ));
            })()}
            <button
              type="button"
              className="rounded-xl border border-dashed border-slate-300 px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
              onClick={() => {
                setCashAmtStr("");
                setTransferAmtStr("");
                setQrisAmtStr("");
              }}
            >
              Reset / Kosongkan
            </button>
          </div>
        </div>
        {/* Kirim struk WA di modal pembayaran disembunyikan sesuai permintaan */}
        {/* 
        {receiptWaShareBlock({
          compact: true,
          invoiceLabel: "Preview pembayaran",
          hint: "Struk mencakup item keranjang + rincian tunai/transfer/QRIS/piutang sesuai nominal di atas.",
        })}
        */}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="rounded-xl border px-4 py-2" onClick={() => setPayOpen(false)}>
            Batal
          </button>
          <button type="button" className="rounded-xl bg-brand-600 px-6 py-2 font-semibold text-white" onClick={() => submitSale("completed")}>
            Selesaikan
          </button>
        </div>
      </Modal>

      <Modal
        open={cameraScanOpen}
        title="Scan Barcode via Kamera"
        onClose={() => {
          setCameraScanOpen(false);
          setCameraStatus("");
        }}
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Gunakan kamera belakang HP untuk scan barcode produk. Produk otomatis masuk keranjang saat barcode terbaca.
          </p>
          <div id="pos-camera-scan-region" className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700" />
          {cameraStatus ? <p className="text-xs text-slate-500">{cameraStatus}</p> : null}
          {cameraError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
              {cameraError}
            </div>
          ) : null}
          {cameraLastCode ? (
            <p className="text-xs text-emerald-700 dark:text-emerald-300">
              Scan terakhir: <span className="font-semibold">{cameraLastCode}</span>
            </p>
          ) : null}
        </div>
      </Modal>

      {/* Modal Pilih Barang (Diakses via Tombol '+ Tambah Item Produk') */}
      <Modal
        open={selectProductModalOpen}
        title="Pilih Barang / Produk"
        onClose={() => setSelectProductModalOpen(false)}
        wide
      >
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-medium dark:border-slate-700 dark:bg-slate-900"
              placeholder="Cari nama barang, SKU, barcode..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div className="max-h-[min(480px,60vh)] overflow-y-auto rounded-2xl border border-slate-100 dark:border-slate-800">
            {inactiveHint && (
              <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                <strong>{inactiveHint.name}</strong> ({inactiveHint.sku}) ditemukan tapi <strong>nonaktif</strong>.
              </div>
            )}
            {productsLoading ? (
              <div className="flex min-h-[260px] flex-col items-center justify-center gap-2.5 py-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600 dark:text-emerald-400" />
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Memuat produk...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 py-10 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                  <ShoppingBag className="h-6 w-6" />
                </div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {q.trim() ? "Tidak ada produk yang cocok" : "Belum ada data produk"}
                </p>
              </div>
            ) : (
              <div className="grid gap-2 p-2 sm:grid-cols-2">
                {products.map((p) => {
                  const left = availableOnGrid(p);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={left <= 0}
                      onClick={() => {
                        addToCart(p);
                        setSelectProductModalOpen(false);
                      }}
                      className="flex w-full gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-xs transition hover:border-emerald-500 hover:bg-emerald-50/20 disabled:cursor-not-allowed disabled:opacity-45 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-500"
                    >
                      <div className="min-w-0 flex-1 flex flex-col">
                        <span className="line-clamp-2 text-sm font-bold text-slate-900 dark:text-white">{p.name}</span>
                        <span className="mt-1 text-emerald-600 font-bold dark:text-emerald-400">
                          {formatIDR(p.sell_price)}
                          {p.wholesale_price > 0 && p.wholesale_min_qty > 0 ? (
                            <span className="ml-1.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                              (Grosir min {p.wholesale_min_qty}: {formatIDR(p.wholesale_price)})
                            </span>
                          ) : null}
                        </span>
                        {p.variants && p.variants.length > 0 ? (
                          <span className="mt-1 inline-block rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold text-brand-700 dark:bg-brand-950/40 dark:text-brand-300">
                            {p.variants.length} Varian
                          </span>
                        ) : null}
                        <span className={`text-xs ${left <= 0 ? "text-red-500" : "text-slate-400"}`}>
                          Tersisa: {left}
                          {(reservedByProduct[p.id] || 0) > 0 ? (
                            <span className="text-slate-500"> / gudang {p.stock}</span>
                          ) : null}
                        </span>
                      </div>
                      {p.image_path ? (
                        <img
                          src={uploadSrc(p.image_path)}
                          alt=""
                          className="h-20 w-20 shrink-0 self-start rounded-xl border border-slate-200 object-cover dark:border-slate-600"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {hasMoreProducts && (
            <button
              type="button"
              onClick={loadMoreProducts}
              className="w-full rounded-xl border border-dashed border-slate-300 py-2 text-xs font-semibold text-slate-600 dark:border-slate-600 dark:text-slate-400"
            >
              Muat lagi produk ({products.length}/{productTotal}
              {maxProductPage > 1 ? ` · hal ${productPage}/${maxProductPage}` : ""})
            </button>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => setSelectProductModalOpen(false)}
              className="rounded-xl bg-slate-800 px-5 py-2 text-sm font-semibold text-white dark:bg-slate-700"
            >
              Selesai Memilih
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={barcodeOpen} title="Cetak barcode produk" onClose={() => setBarcodeOpen(false)}>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-500">Produk di daftar saat ini</label>
            <select
              className="mt-1 w-full rounded-xl border px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
              value={barcodeProdId}
              onChange={(e) => setBarcodeProdId(e.target.value)}
            >
              <option value="">— Pilih —</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku}) stok {p.stock}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500">Jumlah cetak (label)</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={3}
              className="mt-1 w-full rounded-xl border px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
              placeholder="1"
              value={barcodeCopies}
              onChange={(e) => setBarcodeCopies(e.target.value.replace(/\D/g, "").slice(0, 3))}
              onBlur={() => {
                const n = Number.parseInt(String(barcodeCopies).trim(), 10);
                if (!Number.isFinite(n) || n < 1) setBarcodeCopies("1");
              }}
            />
          </div>
          <button type="button" onClick={printBarcodeLabels} className="w-full rounded-xl bg-brand-600 py-3 font-semibold text-white">
            Print / Pengaturan printer
          </button>
          <p className="text-xs text-slate-500">Di dialog print pilih printer termal atau simpan PDF. Nama produk tercetak di atas barcode.</p>
        </div>
      </Modal>

      <Modal
        open={!!selectedVariantProduct}
        title={selectedVariantProduct ? `Pilih Varian: ${selectedVariantProduct.name}` : "Pilih Varian"}
        onClose={() => setSelectedVariantProduct(null)}
      >
        {selectedVariantProduct ? (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">Silakan pilih varian produk untuk dimasukkan ke keranjang:</p>
            <div className="grid gap-2">
              {(selectedVariantProduct.variants || []).map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => {
                    addToCart(selectedVariantProduct, v);
                    setSelectedVariantProduct(null);
                  }}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-brand-500 hover:bg-brand-50/40 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-400 dark:hover:bg-slate-800"
                >
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{v.name}</p>
                    <p className="text-xs text-slate-500">
                      Stok: <span className="font-semibold">{v.stock}</span>
                      {v.wholesale_price > 0 && v.wholesale_min_qty > 0 ? (
                        <span className="ml-2 text-brand-600 dark:text-brand-400">
                          (Grosir min {v.wholesale_min_qty}: {formatIDR(v.wholesale_price)})
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <span className="text-sm font-extrabold text-brand-600 dark:text-brand-400">
                    {formatIDR(v.sell_price)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Modal Biaya Tambahan */}
      <Modal open={feeModalOpen} title="Tambah Biaya Tambahan" onClose={() => setFeeModalOpen(false)}>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Nama Biaya</label>
            <input
              type="text"
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-950"
              placeholder="Contoh: Ongkos Kirim, Biaya Kemasan, Jasa Antar"
              value={feeDraftName}
              onChange={(e) => setFeeDraftName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Nominal Biaya (Rp)</label>
            <input
              type="text"
              inputMode="numeric"
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm font-bold outline-none dark:border-slate-700 dark:bg-slate-950"
              placeholder="0"
              value={formatThousandsIdInput(feeDraftAmt)}
              onChange={(e) => setFeeDraftAmt(e.target.value.replace(/\D/g, "").slice(0, 12))}
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              className="w-1/2 rounded-xl border py-2.5 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
              onClick={() => setFeeModalOpen(false)}
            >
              Batal
            </button>
            <button
              type="button"
              className="w-1/2 rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
              onClick={() => {
                const amt = Number(feeDraftAmt.replace(/\D/g, "")) || 0;
                setAdditionalFee(amt);
                setAdditionalFeeName(feeDraftName.trim() || "Biaya Tambahan");
                setFeeModalOpen(false);
                toast.success("Biaya tambahan diterapkan");
              }}
            >
              Simpan Biaya
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Konfirmasi Perubahan Harga Produk */}
      <Modal open={priceConfirmModalOpen} title="Konfirmasi Perubahan Harga" onClose={() => setPriceConfirmModalOpen(false)}>
        {pendingPriceChange ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-700 dark:text-slate-300">
              Harga produk <strong>{pendingPriceChange.cartItem?.name}</strong> diubah menjadi{" "}
              <strong className="text-brand-600 dark:text-brand-400">{formatIDR(pendingPriceChange.newPrice)}</strong>.
            </p>
            <p className="text-xs text-slate-500">Pilih bagaimana perubahan harga ini ingin diterapkan:</p>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                className="w-full rounded-2xl border border-slate-200 bg-white p-3.5 text-left transition hover:border-brand-500 hover:bg-brand-50/50 dark:border-slate-800 dark:bg-slate-900"
                onClick={handlePriceChangeThisTxOnly}
              >
                <p className="text-sm font-bold text-slate-900 dark:text-white">1. Ubah harga hanya untuk transaksi ini</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Harga hanya berubah pada transaksi yang sedang berlangsung. Harga barang di database tetap seperti semula.
                </p>
              </button>

              <button
                type="button"
                className="w-full rounded-2xl border border-brand-200 bg-brand-50/60 p-3.5 text-left transition hover:border-brand-600 hover:bg-brand-100/70 dark:border-brand-900 dark:bg-brand-950/40"
                onClick={handlePriceChangePermanently}
              >
                <p className="text-sm font-bold text-brand-900 dark:text-brand-300">2. Ubah harga secara permanen</p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Harga produk akan diperbarui menjadi <strong>{formatIDR(pendingPriceChange.newPrice)}</strong> di database dan digunakan untuk semua transaksi berikutnya.
                </p>
              </button>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                className="rounded-xl border px-4 py-2 text-xs font-semibold"
                onClick={() => {
                  setPendingPriceChange(null);
                  setPriceConfirmModalOpen(false);
                }}
              >
                Batal
              </button>
              <button
                type="button"
                className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700"
                onClick={handlePriceChangePermanently}
              >
                Ya, Ubah Permanen
              </button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Modal Popup Sukses Transaksi */}
      <Modal open={successModalOpen} onClose={() => setSuccessModalOpen(false)}>
        {completedTx && (
          <div className="py-2 text-center space-y-4">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 shadow-inner">
              <CheckCircle2 className="h-12 w-12 stroke-[2.2]" />
            </div>

            <div>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Transaksi Berhasil!</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Data telah disimpan ke dalam sistem</p>
            </div>

            {/* Rincian Ringkas Transaksi */}
            <div className="rounded-2xl border border-amber-200/70 bg-amber-50/70 p-4 text-left shadow-xs dark:border-slate-700 dark:bg-slate-800/80 space-y-2.5">
              <div className="flex items-center justify-between border-b border-amber-200/50 dark:border-slate-700/60 pb-2.5">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <UserCheck className="h-4 w-4 text-brand-600 dark:text-brand-400" /> Pelanggan
                </span>
                <span className="text-sm font-extrabold text-slate-900 dark:text-white truncate max-w-[200px] text-right">
                  {completedTx.customer?.name || completedTx.customer_name || "Pelanggan Umum"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-400 pt-1">
                <span>Total Harga</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{formatIDR(completedTx.grand_total)}</span>
              </div>
              <div className="flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-400">
                <span>Dibayar</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{formatIDR(completedTx.paid_amount)}</span>
              </div>
              <div className="mt-2 rounded-xl bg-amber-100/80 dark:bg-slate-700/80 p-3 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Kembalian</span>
                <span className="text-base font-black text-emerald-700 dark:text-emerald-300">{formatIDR(completedTx.change_amount)}</span>
              </div>
              {(completedTx.customer && (completedTx.customer_total_points != null || completedTx.customer?.total_points != null || completedTx.points_earned > 0)) && (
                <div className="mt-2 rounded-xl bg-amber-200/60 dark:bg-amber-950/50 p-3 space-y-1.5 border border-amber-300/40 dark:border-amber-900/40">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-800 dark:text-amber-200 flex items-center gap-1.5">
                      <Award className="h-4 w-4 text-amber-600 dark:text-amber-400" /> Total Point Pelanggan
                    </span>
                    <span className="text-sm font-black text-amber-900 dark:text-amber-200">
                      {completedTx.customer_total_points ?? completedTx.customer?.total_points ?? 0} Poin
                    </span>
                  </div>
                  {completedTx.points_earned > 0 && (
                    <div className="flex items-center justify-between text-[11px] text-amber-700 dark:text-amber-300 font-semibold pt-1 border-t border-amber-200/60 dark:border-amber-900/50">
                      <span>Point Didapat Transaksi Ini</span>
                      <span className="font-bold">+{completedTx.points_earned} Poin</span>
                    </div>
                  )}
                </div>
              )}
              <div className="flex items-center justify-between border-t border-amber-200/50 dark:border-slate-700/60 pt-2.5">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <Ticket className="h-3.5 w-3.5" /> No. Antrian
                </span>
                <span className="text-base font-black text-slate-900 dark:text-white font-mono">{completedTx.queue_no}</span>
              </div>
            </div>

            {/* Opsi Action Utama */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => printCompletedBluetoothReceipt(completedTx)}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-brand-600 hover:bg-brand-700 active:scale-98 text-white font-bold text-sm py-3 shadow-md shadow-brand-600/20 transition"
              >
                <Bluetooth className="h-4 w-4" /> Cetak via Bluetooth (Thermal ESC/POS)
              </button>

              <div className="grid grid-cols-4 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => printCompletedReceipt(completedTx)}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition group"
                  title="Cetak lewat Dialog Print Browser / PDF"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 shadow-xs group-hover:scale-105 transition">
                    <Printer className="h-5 w-5 stroke-[2]" />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Print HP/PC</span>
                </button>

                <button
                  type="button"
                  onClick={() => printCompletedRawBtReceipt(completedTx)}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition group"
                  title="Cetak lewat Aplikasi RawBT Android"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-brand-600 dark:border-slate-700 dark:bg-slate-800 dark:text-brand-400 shadow-xs group-hover:scale-105 transition">
                    <Printer className="h-5 w-5 stroke-[2.5]" />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">RawBT App</span>
                </button>

                <button
                  type="button"
                  onClick={() => printCompletedQueueTicket(completedTx)}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition group"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 shadow-xs group-hover:scale-105 transition">
                    <Ticket className="h-5 w-5" />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Antrian</span>
                </button>

                <button
                  type="button"
                  onClick={() => shareCompletedWa(completedTx)}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition group"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 shadow-xs group-hover:scale-105 transition">
                    <Share2 className="h-5 w-5" />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Bagikan</span>
                </button>
              </div>
            </div>

            {/* Tombol Buat Transaksi Baru */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setSuccessModalOpen(false)}
                className="w-full rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-98 text-slate-950 font-black text-sm py-3.5 shadow-md shadow-amber-500/20 transition"
              >
                Buat Transaksi Baru
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Item Bebas / Custom Item */}
      <Modal open={customItemOpen} title="Tambah Item Bebas" onClose={() => setCustomItemOpen(false)}>
        <div className="space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Tambahkan item yang tidak ada di database produk. Item ini hanya akan masuk ke laporan transaksi tanpa mengurangi stok.
          </p>
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Nama Item *</label>
            <input
              type="text"
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-950"
              placeholder="Contoh: Jasa Potong, Plastik, dll"
              value={customItemName}
              onChange={(e) => setCustomItemName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Harga Jual (Rp) *</label>
              <input
                type="text"
                inputMode="numeric"
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm font-bold outline-none dark:border-slate-700 dark:bg-slate-950"
                placeholder="0"
                value={formatThousandsIdInput(customItemPrice)}
                onChange={(e) => setCustomItemPrice(e.target.value.replace(/\D/g, "").slice(0, 14))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Jumlah</label>
              <input
                type="text"
                inputMode="numeric"
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm font-bold outline-none dark:border-slate-700 dark:bg-slate-950"
                placeholder="1"
                value={customItemQty}
                onChange={(e) => setCustomItemQty(e.target.value.replace(/\D/g, "").slice(0, 6))}
              />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              className="w-1/2 rounded-xl border py-2.5 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
              onClick={() => setCustomItemOpen(false)}
            >
              Batal
            </button>
            <button
              type="button"
              className="w-1/2 rounded-xl bg-amber-500 py-2.5 text-sm font-bold text-white hover:bg-amber-600"
              onClick={addCustomItemToCart}
            >
              Tambahkan
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Tambah Pelanggan Baru dari POS */}
      <Modal
        open={newCustomerModalOpen}
        title="Tambah Pelanggan Baru"
        onClose={() => setNewCustomerModalOpen(false)}
      >
        <form onSubmit={handleSaveNewCustomerModal} className="space-y-3.5">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Data pelanggan akan langsung disimpan ke sistem dan otomatis dipilih untuk transaksi saat ini.
          </p>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Nama Pelanggan <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              placeholder="Contoh: Bpk. Rahmat, Ibu Siti, dll"
              value={newCustName}
              onChange={(e) => setNewCustName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                No. WhatsApp / HP
              </label>
              <input
                type="tel"
                inputMode="numeric"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                placeholder="08123456789"
                value={newCustPhone}
                onChange={(e) => setNewCustPhone(e.target.value.replace(/[^\d+]/g, ""))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Kategori
              </label>
              <select
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                value={newCustCategory}
                onChange={(e) => setNewCustCategory(e.target.value)}
              >
                <option value="umum">Umum</option>
                <option value="member">Member</option>
                <option value="grosir">Grosir</option>
                <option value="reseller">Reseller</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Alamat (Opsional)
            </label>
            <input
              type="text"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              placeholder="Alamat pelanggan"
              value={newCustAddress}
              onChange={(e) => setNewCustAddress(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Catatan (Opsional)
            </label>
            <input
              type="text"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              placeholder="Catatan tambahan"
              value={newCustNotes}
              onChange={(e) => setNewCustNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition"
              onClick={() => setNewCustomerModalOpen(false)}
              disabled={newCustSubmitting}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={newCustSubmitting}
              className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white hover:bg-brand-700 shadow-md shadow-brand-600/20 transition disabled:opacity-60"
            >
              {newCustSubmitting ? "Menyimpan..." : "Simpan & Pilih"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Landscape Orientation Warning Overlay on Mobile */}
      {isMobileLandscape && !dismissLandscapeNotice && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center text-white">
          <div className="w-20 h-20 rounded-3xl bg-brand-600/30 border border-brand-500 flex items-center justify-center mb-4 animate-bounce">
            <Smartphone className="h-10 w-10 text-brand-400 rotate-90" />
          </div>
          <h3 className="text-2xl font-black mb-2">Putar Perangkat ke Mode Portrait</h3>
          <p className="text-sm text-slate-300 max-w-sm mb-6 leading-relaxed">
            Tampilan kasir dioptimalkan untuk posisi tegak (Portrait) agar tata letak tombol transaksi dan keranjang tidak bergeser saat digunakan.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
            <button
              type="button"
              onClick={() => {
                if (window.screen?.orientation?.lock) {
                  window.screen.orientation.lock("portrait").catch(() => {});
                }
              }}
              className="w-full py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 font-bold text-white shadow-lg transition active:scale-95 text-sm"
            >
              Kunci Mode Portrait
            </button>
            <button
              type="button"
              onClick={() => setDismissLandscapeNotice(true)}
              className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 font-semibold text-slate-300 transition text-xs"
            >
              Lanjutkan (Tutup)
            </button>
          </div>
        </div>
      )}
    </PageStack>
  );
}
