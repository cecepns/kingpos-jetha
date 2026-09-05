import { formatIDR } from "./format";

/** Normalisasi ke angka WA Indonesia (62…) untuk tautan wa.me */
export function normalizeWhatsAppPhone(input) {
  const d = String(input || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("62")) return d;
  if (d.startsWith("0")) return `62${d.slice(1)}`;
  if (d.length >= 9) return `62${d}`;
  return d;
}

/** Struk HTML untuk window.print — dioptimalkan printer termal (lebar mm) */
export function buildThermalReceiptHtml({
  storeName = "Toko",
  storeAddress = "",
  storePhone = "",
  footer = "",
  widthMm = 80,
  invoiceNo = "—",
  queueNo = "",
  customerName = "",
  customerPoints = null,
  pointsEarned = 0,
  dateStr = "",
  lines = [],
  subtotal = 0,
  discountTotal = 0,
  taxPercent = 0,
  taxAmount = 0,
  additionalFee = 0,
  additionalFeeName = "Biaya Tambahan",
  grandTotal = 0,
  paidSum = 0,
  changeAmount = 0,
  payments = [],
}) {
  const esc = (s) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const lineRows = lines
    .map((c) => {
      const raw = Number(c.discount_amount || 0);
      const sub = Number(c.sell_price) * Number(c.qty);
      const net = sub - raw;
      const discHtml =
        raw > 0
          ? `<div class="small muted">${formatIDR(sub)} → <b>${formatIDR(net)}</b> (diskon ${formatIDR(raw)})</div>`
          : `<div>${formatIDR(net)}</div>`;
      return `<div class="item"><div class="row"><span class="nm">${esc(c.name)}</span></div>
        <div class="row"><span>${c.qty}x ${formatIDR(c.sell_price)}</span></div>${discHtml}</div>`;
    })
    .join("");

  const payRows =
    payments.length > 0
      ? payments
          .map(
            (p) =>
              `<div class="row"><span>${esc(p.method)}</span><span>${formatIDR(p.amount)}</span></div>`
          )
          .join("")
      : "";

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Struk</title>
<style>
  @page { size: ${widthMm}mm auto; margin: 2mm; }
  html,body{margin:0;padding:0;font-family:system-ui,sans-serif;font-size:11px;}
  .wrap{max-width:${widthMm}mm;margin:0 auto;padding:4px;}
  .c{text-align:center;}
  .h{font-weight:700;font-size:13px;margin:4px 0;}
  .row{display:flex;justify-content:space-between;gap:4px;margin:2px 0;}
  .item{border-bottom:1px dashed #ccc;padding:4px 0;}
  .small{font-size:10px;}
  .muted{color:#555;}
  .tot{font-weight:700;font-size:12px;margin-top:8px;padding-top:6px;border-top:1px solid #000;}
  .queue-box{border:1px solid #000;padding:4px;margin:6px 0;text-align:center;}
  .queue-num{font-weight:900;font-size:16px;}
  hr{border:none;border-top:1px dashed #999;margin:6px 0;}
</style></head><body><div class="wrap">
<div class="c h">${esc(storeName)}</div>
${storeAddress ? `<div class="c small">${esc(storeAddress)}</div>` : ""}
${storePhone ? `<div class="c small">${esc(storePhone)}</div>` : ""}
<hr/>
${customerName ? `<div class="row small"><span>Pelanggan</span><span style="font-weight:700;">${esc(customerName)}</span></div>` : ""}
<div class="row small"><span>${esc(invoiceNo)}</span><span>${esc(dateStr)}</span></div>
<hr/>
${lineRows}
<div class="row"><span>Subtotal</span><span>${formatIDR(subtotal)}</span></div>
${discountTotal > 0 ? `<div class="row muted"><span>Diskon total</span><span>- ${formatIDR(discountTotal)}</span></div>` : ""}
${taxPercent > 0 ? `<div class="row muted"><span>Pajak ${taxPercent}%</span><span>${formatIDR(taxAmount)}</span></div>` : ""}
${additionalFee > 0 ? `<div class="row muted"><span>${esc(additionalFeeName || "Biaya Tambahan")}</span><span>+ ${formatIDR(additionalFee)}</span></div>` : ""}
<div class="row tot"><span>TOTAL</span><span>${formatIDR(grandTotal)}</span></div>
${payRows ? `<hr/><div class="small">Bayar:</div>${payRows}` : ""}
${changeAmount > 0 ? `<div class="row" style="font-weight:700"><span>Kembalian</span><span>${formatIDR(changeAmount)}</span></div>` : ""}
${customerPoints != null ? `<hr/><div class="row small" style="font-weight:700;"><span>Total Point Pelanggan</span><span>${esc(customerPoints)} Poin</span></div>` : ""}
${pointsEarned > 0 ? `<div class="row small muted"><span>Point Didapat</span><span>+${pointsEarned} Poin</span></div>` : ""}
${queueNo ? `<hr/><div class="queue-box"><div class="small">NO. ANTRIAN</div><div class="queue-num">${esc(queueNo)}</div></div>` : ""}
${footer ? `<hr/><div class="c small">${esc(footer)}</div>` : ""}
</div><script>window.onload=function(){window.print();}<\/script></body></html>`;
}

export function buildReceiptWhatsAppText({
  storeName,
  invoiceNo,
  queueNo,
  customerName = "",
  customerPoints = null,
  pointsEarned = 0,
  dateStr,
  lines,
  subtotal,
  discountTotal,
  taxPercent,
  taxAmount,
  additionalFee = 0,
  additionalFeeName = "Biaya Tambahan",
  grandTotal,
  changeAmount,
  payments,
}) {
  let hdr = `${storeName}\n`;
  if (customerName) hdr += `Pelanggan: ${customerName}\n`;
  hdr += `${invoiceNo} · ${dateStr}\n---\n`;
  const items = lines
    .map((c) => {
      const d = Number(c.discount_amount || 0);
      const sub = Number(c.sell_price) * Number(c.qty);
      const net = sub - d;
      let t = `${c.qty}x ${c.name} @ ${formatIDR(c.sell_price)}`;
      if (d > 0) t += `\n   ${formatIDR(sub)} → ${formatIDR(net)} (diskon ${formatIDR(d)})`;
      else t += ` = ${formatIDR(net)}`;
      return t;
    })
    .join("\n");
  let foot = `\n---\nSubtotal ${formatIDR(subtotal)}`;
  if (discountTotal > 0) foot += `\nDiskon -${formatIDR(discountTotal)}`;
  if (taxPercent > 0) foot += `\nPajak ${taxPercent}% ${formatIDR(taxAmount)}`;
  if (additionalFee > 0) foot += `\n${additionalFeeName || "Biaya Tambahan"} +${formatIDR(additionalFee)}`;
  foot += `\n*TOTAL ${formatIDR(grandTotal)}*`;
  if (payments?.length)
    foot += `\nBayar:\n${payments.map((p) => `- ${p.method}: ${formatIDR(p.amount)}`).join("\n")}`;
  if (changeAmount > 0) foot += `\nKembalian: ${formatIDR(changeAmount)}`;
  if (customerPoints != null) foot += `\nTotal Point: ${customerPoints} Poin`;
  if (pointsEarned > 0) foot += ` (Point Didapat: +${pointsEarned})`;
  if (queueNo) foot += `\n\n*NO. ANTRIAN: ${queueNo}*`;
  foot += "\n\nTerima kasih.";
  return hdr + items + foot;
}

/** Formatter Plain Text untuk ESC/POS atau RawBT */
export function buildReceiptPlainText({
  storeName = "Toko",
  storeAddress = "",
  storePhone = "",
  footer = "",
  invoiceNo = "—",
  queueNo = "",
  customerName = "",
  customerPoints = null,
  pointsEarned = 0,
  dateStr = "",
  lines = [],
  subtotal = 0,
  discountTotal = 0,
  taxPercent = 0,
  taxAmount = 0,
  additionalFee = 0,
  additionalFeeName = "Biaya Tambahan",
  grandTotal = 0,
  changeAmount = 0,
  payments = [],
  widthChars = 32,
}) {
  const lineStr = "-".repeat(widthChars);
  const doubleLine = "=".repeat(widthChars);

  const padRightLeft = (left, right) => {
    const spaceNeeded = widthChars - left.length - right.length;
    if (spaceNeeded <= 0) return left.slice(0, Math.max(1, widthChars - right.length - 1)) + " " + right;
    return left + " ".repeat(spaceNeeded) + right;
  };

  const centerText = (str) => {
    if (str.length >= widthChars) return str;
    const pad = Math.floor((widthChars - str.length) / 2);
    return " ".repeat(pad) + str;
  };

  let txt = "";
  txt += centerText(storeName) + "\n";
  if (storeAddress) txt += centerText(storeAddress) + "\n";
  if (storePhone) txt += centerText(storePhone) + "\n";
  txt += lineStr + "\n";
  if (customerName) {
    txt += padRightLeft("Pelanggan", customerName) + "\n";
  }
  txt += padRightLeft(invoiceNo, dateStr) + "\n";
  txt += lineStr + "\n";

  for (const c of lines) {
    const rawDisc = Number(c.discount_amount || 0);
    const sub = Number(c.sell_price) * Number(c.qty);
    const net = sub - rawDisc;
    txt += c.name + "\n";
    const qtyPrice = `${c.qty}x ${formatIDR(c.sell_price)}`;
    txt += padRightLeft(`  ${qtyPrice}`, formatIDR(net)) + "\n";
    if (rawDisc > 0) {
      txt += `  (disc: -${formatIDR(rawDisc)})\n`;
    }
  }

  txt += lineStr + "\n";
  txt += padRightLeft("Subtotal", formatIDR(subtotal)) + "\n";
  if (discountTotal > 0) txt += padRightLeft("Diskon total", `-${formatIDR(discountTotal)}`) + "\n";
  if (taxPercent > 0) txt += padRightLeft(`Pajak ${taxPercent}%`, formatIDR(taxAmount)) + "\n";
  if (additionalFee > 0) txt += padRightLeft(additionalFeeName || "Biaya Tambahan", `+${formatIDR(additionalFee)}`) + "\n";
  txt += doubleLine + "\n";
  txt += padRightLeft("TOTAL", formatIDR(grandTotal)) + "\n";
  txt += doubleLine + "\n";

  if (payments?.length) {
    for (const p of payments) {
      txt += padRightLeft(`Bayar (${p.method})`, formatIDR(p.amount)) + "\n";
    }
  }
  if (changeAmount > 0) {
    txt += padRightLeft("Kembalian", formatIDR(changeAmount)) + "\n";
  }

  if (customerPoints != null) {
    txt += lineStr + "\n";
    txt += padRightLeft("Total Point", `${customerPoints} Poin`) + "\n";
    if (pointsEarned > 0) {
      txt += padRightLeft("Point Didapat", `+${pointsEarned} Poin`) + "\n";
    }
  }

  if (queueNo) {
    txt += lineStr + "\n";
    txt += centerText(`ANTRIAN: ${queueNo}`) + "\n";
  }

  if (footer) {
    txt += lineStr + "\n";
    txt += centerText(footer) + "\n";
  }
  txt += "\n\n\n";
  return txt;
}

import EscPosEncoder from "esc-pos-encoder";

/** Membangun Data Biner ESC/POS menggunakan library esc-pos-encoder */
export function buildEscPosReceiptBinary({
  storeName = "Toko",
  storeAddress = "",
  storePhone = "",
  footer = "",
  invoiceNo = "—",
  queueNo = "",
  customerName = "",
  customerPoints = null,
  pointsEarned = 0,
  dateStr = "",
  lines = [],
  subtotal = 0,
  discountTotal = 0,
  taxPercent = 0,
  taxAmount = 0,
  additionalFee = 0,
  additionalFeeName = "Biaya Tambahan",
  grandTotal = 0,
  paidSum = 0,
  changeAmount = 0,
  payments = [],
  widthMm = 58,
}) {
  const encoder = new EscPosEncoder();
  const maxCols = Number(widthMm) <= 58 ? 32 : 48;
  const lineStr = "-".repeat(maxCols);
  const doubleLine = "=".repeat(maxCols);

  encoder.initialize().codepage("cp437").align("center").bold(true).size("normal").line(storeName).bold(false);

  if (storeAddress) encoder.line(storeAddress);
  if (storePhone) encoder.line(storePhone);
  encoder.line(lineStr);
  if (customerName) {
    encoder.align("left").line(`Pelanggan: ${customerName}`);
  }
  encoder.align("left").line(`${invoiceNo}  ${dateStr}`).line(lineStr);

  for (const c of lines) {
    const rawDisc = Number(c.discount_amount || 0);
    const sub = Number(c.sell_price) * Number(c.qty);
    const net = sub - rawDisc;
    encoder.line(c.name);
    const qtyPrice = `  ${c.qty}x ${formatIDR(c.sell_price)}`;
    const netStr = formatIDR(net);
    const spaceCount = Math.max(1, maxCols - qtyPrice.length - netStr.length);
    encoder.line(qtyPrice + " ".repeat(spaceCount) + netStr);
    if (rawDisc > 0) {
      encoder.line(`  (disc: -${formatIDR(rawDisc)})`);
    }
  }

  encoder.line(lineStr);

  const writePair = (left, right) => {
    const space = Math.max(1, maxCols - left.length - right.length);
    encoder.line(left + " ".repeat(space) + right);
  };

  writePair("Subtotal", formatIDR(subtotal));
  if (discountTotal > 0) writePair("Diskon total", `-${formatIDR(discountTotal)}`);
  if (taxPercent > 0) writePair(`Pajak ${taxPercent}%`, formatIDR(taxAmount));
  if (additionalFee > 0) writePair(additionalFeeName || "Biaya Tambahan", `+${formatIDR(additionalFee)}`);

  encoder.line(doubleLine).bold(true);
  writePair("TOTAL", formatIDR(grandTotal));
  encoder.bold(false).line(doubleLine);

  if (payments?.length) {
    for (const p of payments) {
      writePair(`Bayar (${p.method})`, formatIDR(p.amount));
    }
  }
  if (changeAmount > 0) {
    writePair("Kembalian", formatIDR(changeAmount));
  }

  if (customerPoints != null) {
    encoder.line(lineStr);
    writePair("Total Point", `${customerPoints} Poin`);
    if (pointsEarned > 0) {
      writePair("Point Didapat", `+${pointsEarned} Poin`);
    }
  }

  if (queueNo) {
    encoder.line(lineStr);
    encoder.align("center").bold(true).size("large").line(`ANTRIAN ${queueNo}`).size("normal").bold(false);
  }

  if (footer) {
    encoder.line(lineStr).align("center").line(footer);
  }

  encoder.newline().newline().cut();
  return encoder.encode();
}

/** Print via RawBT App (Intent Base64 Stream) — Paling stabil untuk Android & Printer Bluetooth SPP */
export function printViaRawBTBase64(binaryData) {
  const bytes = new Uint8Array(binaryData);
  let binaryStr = "";
  for (let i = 0; i < bytes.length; i++) {
    binaryStr += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binaryStr);
  const intentUrl = `intent:#Intent;scheme=rawbt;package=ru.a2ol.rawbtprint;S.base64=${encodeURIComponent(base64)};end;`;
  window.location.href = intentUrl;
}

let savedBluetoothDevice = null;

/** Helper untuk menyambung GATT dengan timeout 6 detik */
async function connectGattWithTimeout(device, timeoutMs = 6000) {
  return Promise.race([
    device.gatt.connect(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timeout: Printer Bluetooth (SPP) tidak merespons GATT Chrome. Gunakan tombol RawBT.")), timeoutMs)
    ),
  ]);
}

/** Hubungkan & Simpan Printer Bluetooth */
export async function connectBluetoothPrinter() {
  if (!navigator.bluetooth) {
    throw new Error("Web Bluetooth tidak didukung di browser ini. Gunakan Google Chrome (Android/PC).");
  }
  const device = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: [
      "000018f0-0000-1000-8000-00805f9b34fb",
      "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
      "00001101-0000-1000-8000-00805f9b34fb",
      "49535343-fe7d-4ae5-8fa9-9fafd205e455",
    ],
  });

  if (!device.gatt.connected) {
    await connectGattWithTimeout(device, 6000);
  }
  savedBluetoothDevice = device;
  try {
    localStorage.setItem("kingpos_bt_printer_name", device.name || "Printer Thermal");
    localStorage.setItem("kingpos_bt_printer_id", device.id || "");
  } catch {
    /* */
  }
  return device;
}

/** Putuskan printer Bluetooth terpasang */
export function disconnectBluetoothPrinter() {
  if (savedBluetoothDevice && savedBluetoothDevice.gatt) {
    try {
      savedBluetoothDevice.gatt.disconnect();
    } catch {
      /* */
    }
  }
  savedBluetoothDevice = null;
  try {
    localStorage.removeItem("kingpos_bt_printer_name");
    localStorage.removeItem("kingpos_bt_printer_id");
  } catch {
    /* */
  }
}

/** Cek Status Printer Bluetooth saat ini */
export function getBluetoothPrinterStatus() {
  const savedName = typeof localStorage !== "undefined" ? localStorage.getItem("kingpos_bt_printer_name") : null;
  const isConnected = !!(savedBluetoothDevice && savedBluetoothDevice.gatt && savedBluetoothDevice.gatt.connected);
  return {
    isConnected,
    savedName: savedName || (savedBluetoothDevice ? savedBluetoothDevice.name : null),
    hasSavedDevice: !!(savedName || savedBluetoothDevice),
  };
}

/** Print via Web Bluetooth API dengan esc-pos-encoder & timeout protection */
export async function printViaWebBluetooth(binaryData) {
  if (!navigator.bluetooth) {
    throw new Error("Web Bluetooth tidak didukung di browser ini. Gunakan Google Chrome pada Android/PC.");
  }

  let device = savedBluetoothDevice;

  if (!device && typeof navigator.bluetooth.getDevices === "function") {
    try {
      const paired = await navigator.bluetooth.getDevices();
      const savedId = localStorage.getItem("kingpos_bt_printer_id");
      const savedName = localStorage.getItem("kingpos_bt_printer_name");
      if (paired && paired.length > 0) {
        device = paired.find((d) => (savedId && d.id === savedId) || (savedName && d.name === savedName)) || paired[0];
        if (device) savedBluetoothDevice = device;
      }
    } catch {
      /* */
    }
  }

  if (!device) {
    device = await connectBluetoothPrinter();
  }

  let server = device.gatt.connected ? device.gatt : null;
  if (!server) {
    server = await connectGattWithTimeout(device, 6000);
  }

  const services = await server.getPrimaryServices();
  let targetChar = null;

  for (const service of services) {
    const chars = await service.getCharacteristics();
    for (const c of chars) {
      if (c.properties.write || c.properties.writeWithoutResponse) {
        targetChar = c;
        break;
      }
    }
    if (targetChar) break;
  }

  if (!targetChar) {
    throw new Error("Karakteristik penulisan Bluetooth printer tidak ditemukan.");
  }

  const bytes = new Uint8Array(binaryData);
  const chunkSize = 512;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.slice(i, i + chunkSize);
    if (targetChar.properties.write) {
      await targetChar.writeValueWithResponse(chunk);
    } else {
      await targetChar.writeValueWithoutResponse(chunk);
    }
  }
}

/** Legacy RawBT Text Intent */
export function printViaRawBT(receiptText) {
  const intentUrl = "intent:#Intent;scheme=rawbt;package=ru.a2ol.rawbtprint;S.txt=" + encodeURIComponent(receiptText) + ";end;";
  window.location.href = intentUrl;
}

