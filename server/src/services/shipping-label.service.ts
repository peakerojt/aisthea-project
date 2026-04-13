import PDFDocument from 'pdfkit';
import path from 'path';
import bwipjs from 'bwip-js';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ShippingLabelItem {
  productName: string;
  variantName: string;
  quantity: number;
}

export interface ShippingLabelData {
  orderNumber: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  shippingAddress: string;
  items: ShippingLabelItem[];
  paymentMethod: string;
  codAmount: number;
  note?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const FONTS_DIR = path.resolve(__dirname, '../assets/fonts');
const FONT_REGULAR = path.join(FONTS_DIR, 'Roboto-Regular.ttf');
const FONT_BOLD = path.join(FONTS_DIR, 'Roboto-Bold.ttf');

/** Mock store info — replace with dynamic config later */
const STORE = {
  name: 'AISTHEA Store',
  phone: '0123-456-789',
  address: '123 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh',
};

// A6 in points: 105mm × 148mm → 297.64 × 419.53
const A6_WIDTH = 297.64;
const A6_HEIGHT = 419.53;
const MARGIN = 14;
const CONTENT_WIDTH = A6_WIDTH - MARGIN * 2;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN').format(Math.round(amount)) + ' ₫';
};

const formatDate = (iso: string): string => {
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
};

async function generateBarcodePng(text: string): Promise<Buffer> {
  return bwipjs.toBuffer({
    bcid: 'code128',
    text,
    scale: 2,
    height: 10,
    includetext: false,
  });
}

// ─── Label Rendering ─────────────────────────────────────────────────────────

function drawSectionHeader(doc: InstanceType<typeof PDFDocument>, label: string, x: number, y: number, width: number): number {
  doc.save();
  doc
    .roundedRect(x, y, width, 14, 2)
    .fill('#1a1a1a');
  doc.font(FONT_BOLD).fontSize(7).fillColor('#ffffff');
  doc.text(label, x + 5, y + 3, { width: width - 10 });
  doc.restore();
  doc.fillColor('#000000');
  return y + 18;
}

function drawDashedLine(doc: InstanceType<typeof PDFDocument>, x: number, y: number, width: number) {
  doc.save();
  doc.strokeColor('#bbbbbb').lineWidth(0.5);
  doc.moveTo(x, y).lineTo(x + width, y).dash(3, { space: 2 }).stroke();
  doc.restore();
  doc.undash();
}

async function renderLabel(doc: InstanceType<typeof PDFDocument>, order: ShippingLabelData) {
  let y = MARGIN;
  const x = MARGIN;

  // ── Header: Store name ──
  doc.font(FONT_BOLD).fontSize(12).fillColor('#000000');
  doc.text(STORE.name.toUpperCase(), x, y, { width: CONTENT_WIDTH, align: 'center' });
  y += 16;

  // ── Barcode ──
  try {
    const barcodePng = await generateBarcodePng(order.orderNumber);
    const barcodeWidth = 180;
    const barcodeHeight = 28;
    const barcodeX = x + (CONTENT_WIDTH - barcodeWidth) / 2;
    doc.image(barcodePng, barcodeX, y, { width: barcodeWidth, height: barcodeHeight });
    y += barcodeHeight + 2;
  } catch {
    // Fallback: just show text if barcode fails
    y += 4;
  }

  // ── Order number under barcode ──
  doc.font(FONT_REGULAR).fontSize(7).fillColor('#444444');
  doc.text(order.orderNumber, x, y, { width: CONTENT_WIDTH, align: 'center' });
  y += 12;

  drawDashedLine(doc, x, y, CONTENT_WIDTH);
  y += 6;

  // ── NGƯỜI GỬI ──
  y = drawSectionHeader(doc, 'NGƯỜI GỬI', x, y, CONTENT_WIDTH);
  doc.font(FONT_BOLD).fontSize(8).fillColor('#000000');
  doc.text(STORE.name, x + 4, y, { width: CONTENT_WIDTH - 8, continued: true });
  doc.font(FONT_REGULAR).fontSize(7);
  doc.text(`  |  ${STORE.phone}`, { width: CONTENT_WIDTH - 8 });
  y += 12;
  doc.font(FONT_REGULAR).fontSize(7);
  doc.text(STORE.address, x + 4, y, { width: CONTENT_WIDTH - 8 });
  y += doc.heightOfString(STORE.address, { width: CONTENT_WIDTH - 8 }) + 6;

  drawDashedLine(doc, x, y, CONTENT_WIDTH);
  y += 6;

  // ── NGƯỜI NHẬN ──
  y = drawSectionHeader(doc, 'NGƯỜI NHẬN', x, y, CONTENT_WIDTH);
  doc.font(FONT_BOLD).fontSize(8.5).fillColor('#000000');
  doc.text(order.customerName, x + 4, y, { width: CONTENT_WIDTH - 8, continued: true });
  doc.font(FONT_REGULAR).fontSize(7);
  doc.text(`  |  ${order.customerPhone}`, { width: CONTENT_WIDTH - 8 });
  y += 12;
  doc.font(FONT_REGULAR).fontSize(7);
  doc.text(order.shippingAddress, x + 4, y, { width: CONTENT_WIDTH - 8 });
  y += doc.heightOfString(order.shippingAddress, { width: CONTENT_WIDTH - 8 }) + 6;

  drawDashedLine(doc, x, y, CONTENT_WIDTH);
  y += 6;

  // ── SẢN PHẨM ──
  y = drawSectionHeader(doc, 'SẢN PHẨM', x, y, CONTENT_WIDTH);
  doc.font(FONT_REGULAR).fontSize(7).fillColor('#000000');
  for (const item of order.items) {
    const label = item.variantName
      ? `${item.quantity}x ${item.productName} — ${item.variantName}`
      : `${item.quantity}x ${item.productName}`;
    doc.text(label, x + 4, y, { width: CONTENT_WIDTH - 8 });
    y += doc.heightOfString(label, { width: CONTENT_WIDTH - 8 }) + 2;
  }
  y += 4;

  drawDashedLine(doc, x, y, CONTENT_WIDTH);
  y += 8;

  // ── Footer: COD + Date ──
  const isCod = order.paymentMethod?.toUpperCase() === 'COD';
  const footerLeft = isCod
    ? `COD: ${formatCurrency(order.codAmount)}`
    : 'Đã thanh toán';
  const footerRight = `Ngày: ${formatDate(order.createdAt)}`;

  doc.font(FONT_BOLD).fontSize(9).fillColor('#000000');
  doc.text(footerLeft, x + 4, y, { width: CONTENT_WIDTH / 2 - 4 });
  doc.font(FONT_REGULAR).fontSize(7).fillColor('#666666');
  doc.text(footerRight, x + CONTENT_WIDTH / 2, y, {
    width: CONTENT_WIDTH / 2 - 4,
    align: 'right',
  });
  doc.fillColor('#000000');
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function generateBulkShippingLabels(orders: ShippingLabelData[]): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    if (orders.length === 0) {
      resolve(Buffer.alloc(0));
      return;
    }

    const doc = new PDFDocument({
      size: [A6_WIDTH, A6_HEIGHT],
      margin: MARGIN,
      info: {
        Title: `AISTHEA Shipping Labels — ${new Date().toISOString().slice(0, 10)}`,
        Author: 'AISTHEA Admin',
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.registerFont('Roboto', FONT_REGULAR);
    doc.registerFont('Roboto-Bold', FONT_BOLD);

    try {
      for (let i = 0; i < orders.length; i++) {
        if (i > 0) doc.addPage();
        await renderLabel(doc, orders[i]);
      }
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
