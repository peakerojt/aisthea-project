import PDFDocument from 'pdfkit';
import path from 'path';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface InvoiceItemData {
  productName: string;
  variantName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface InvoiceOrderData {
  orderNumber: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  shippingAddress: string;
  items: InvoiceItemData[];
  pricing: {
    itemsTotal: number;
    shippingFee: number;
    discount: number;
    grandTotal: number;
  };
  paymentMethod: string;
  paymentStatus: string;
  status: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const FONTS_DIR = path.resolve(__dirname, '../assets/fonts');
const FONT_REGULAR = path.join(FONTS_DIR, 'Roboto-Regular.ttf');
const FONT_BOLD = path.join(FONTS_DIR, 'Roboto-Bold.ttf');

const formatCurrency = (amount: number): string => {
  const rounded = Math.round(amount);
  return new Intl.NumberFormat('vi-VN').format(rounded) + ' ₫';
};

const formatDate = (iso: string): string => {
  try {
    const date = new Date(iso);
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return iso;
  }
};

const getStatusLabel = (status: string): string => {
  const map: Record<string, string> = {
    Pending: 'Chờ xác nhận',
    Processing: 'Đang xử lý',
    Shipping: 'Đang giao',
    Delivered: 'Đã giao',
    Cancelled: 'Đã hủy',
  };
  return map[status] ?? status;
};

const getPaymentMethodLabel = (method: string): string => {
  const map: Record<string, string> = {
    COD: 'Thanh toán khi nhận hàng',
    VNPAY: 'VNPay',
  };
  return map[method?.toUpperCase()] ?? method;
};

// ─── PDF Rendering ───────────────────────────────────────────────────────────

const PAGE_MARGIN = 50;
const TABLE_COL_WIDTHS = {
  index: 28,
  product: 180,
  sku: 80,
  qty: 40,
  unitPrice: 85,
  lineTotal: 82,
};
const TABLE_WIDTH = Object.values(TABLE_COL_WIDTHS).reduce((sum, w) => sum + w, 0);

function renderInvoicePage(doc: InstanceType<typeof PDFDocument>, order: InvoiceOrderData) {
  const pageWidth = (doc.page?.width ?? 595.28) - PAGE_MARGIN * 2;
  let y = PAGE_MARGIN;

  // ── Header ──
  doc.font(FONT_BOLD).fontSize(18).text('AISTHEA', PAGE_MARGIN, y, { width: pageWidth });
  y += 24;
  doc.font(FONT_BOLD).fontSize(14).text('HOÁ ĐƠN BÁN HÀNG', PAGE_MARGIN, y, {
    width: pageWidth,
    align: 'center',
  });
  y += 26;

  // ── Order info ──
  doc.font(FONT_REGULAR).fontSize(9);
  doc.text(`Mã đơn: ${order.orderNumber}`, PAGE_MARGIN, y);
  doc.text(`Ngày tạo: ${formatDate(order.createdAt)}`, PAGE_MARGIN + pageWidth / 2, y);
  y += 14;
  doc.text(`Trạng thái: ${getStatusLabel(order.status)}`, PAGE_MARGIN, y);
  doc.text(`Thanh toán: ${getPaymentMethodLabel(order.paymentMethod)}`, PAGE_MARGIN + pageWidth / 2, y);
  y += 20;

  // ── Customer info ──
  doc.font(FONT_BOLD).fontSize(10).text('THÔNG TIN KHÁCH HÀNG', PAGE_MARGIN, y);
  y += 14;
  doc.font(FONT_REGULAR).fontSize(9);
  doc.text(`Họ tên: ${order.customerName}`, PAGE_MARGIN, y);
  y += 12;
  doc.text(`Điện thoại: ${order.customerPhone}`, PAGE_MARGIN, y);
  if (order.customerEmail) {
    doc.text(`Email: ${order.customerEmail}`, PAGE_MARGIN + pageWidth / 2, y);
  }
  y += 12;
  doc.text(`Địa chỉ: ${order.shippingAddress}`, PAGE_MARGIN, y, { width: pageWidth });
  y += doc.heightOfString(order.shippingAddress, { width: pageWidth }) + 6;

  // ── Divider ──
  y += 4;
  doc.moveTo(PAGE_MARGIN, y).lineTo(PAGE_MARGIN + TABLE_WIDTH, y).lineWidth(0.5).stroke('#cccccc');
  y += 8;

  // ── Table header ──
  doc.font(FONT_BOLD).fontSize(8);
  const headerCols = [
    { label: '#', width: TABLE_COL_WIDTHS.index, align: 'left' as const },
    { label: 'Sản phẩm', width: TABLE_COL_WIDTHS.product, align: 'left' as const },
    { label: 'SKU', width: TABLE_COL_WIDTHS.sku, align: 'left' as const },
    { label: 'SL', width: TABLE_COL_WIDTHS.qty, align: 'right' as const },
    { label: 'Đơn giá', width: TABLE_COL_WIDTHS.unitPrice, align: 'right' as const },
    { label: 'Thành tiền', width: TABLE_COL_WIDTHS.lineTotal, align: 'right' as const },
  ];

  let colX = PAGE_MARGIN;
  for (const col of headerCols) {
    doc.text(col.label, colX, y, { width: col.width, align: col.align });
    colX += col.width;
  }
  y += 12;
  doc.moveTo(PAGE_MARGIN, y).lineTo(PAGE_MARGIN + TABLE_WIDTH, y).lineWidth(0.3).stroke('#dddddd');
  y += 4;

  // ── Table rows ──
  doc.font(FONT_REGULAR).fontSize(8);
  for (let i = 0; i < order.items.length; i++) {
    const item = order.items[i];
    const productLabel = item.variantName
      ? `${item.productName} — ${item.variantName}`
      : item.productName;

    const rowHeight = Math.max(
      12,
      doc.heightOfString(productLabel, { width: TABLE_COL_WIDTHS.product - 4 }) + 2,
    );

    // Prevent overflow — add page if needed
    if (y + rowHeight > (doc.page?.height ?? 841.89) - PAGE_MARGIN - 80) {
      doc.addPage();
      y = PAGE_MARGIN;
    }

    colX = PAGE_MARGIN;
    doc.text(String(i + 1), colX, y, { width: TABLE_COL_WIDTHS.index });
    colX += TABLE_COL_WIDTHS.index;
    doc.text(productLabel, colX, y, { width: TABLE_COL_WIDTHS.product - 4 });
    colX += TABLE_COL_WIDTHS.product;
    doc.text(item.sku, colX, y, { width: TABLE_COL_WIDTHS.sku });
    colX += TABLE_COL_WIDTHS.sku;
    doc.text(String(item.quantity), colX, y, { width: TABLE_COL_WIDTHS.qty, align: 'right' });
    colX += TABLE_COL_WIDTHS.qty;
    doc.text(formatCurrency(item.unitPrice), colX, y, { width: TABLE_COL_WIDTHS.unitPrice, align: 'right' });
    colX += TABLE_COL_WIDTHS.unitPrice;
    doc.text(formatCurrency(item.lineTotal), colX, y, { width: TABLE_COL_WIDTHS.lineTotal, align: 'right' });

    y += rowHeight;
  }

  // ── Divider ──
  y += 4;
  doc.moveTo(PAGE_MARGIN, y).lineTo(PAGE_MARGIN + TABLE_WIDTH, y).lineWidth(0.5).stroke('#cccccc');
  y += 10;

  // ── Pricing summary ──
  const summaryX = PAGE_MARGIN + TABLE_WIDTH - 200;
  const labelW = 110;
  const valueW = 90;

  const pricingRows = [
    { label: 'Tạm tính:', value: formatCurrency(order.pricing.itemsTotal) },
    { label: 'Phí vận chuyển:', value: formatCurrency(order.pricing.shippingFee) },
  ];
  if (order.pricing.discount > 0) {
    pricingRows.push({ label: 'Giảm giá:', value: `-${formatCurrency(order.pricing.discount)}` });
  }

  doc.font(FONT_REGULAR).fontSize(9);
  for (const row of pricingRows) {
    doc.text(row.label, summaryX, y, { width: labelW, align: 'right' });
    doc.text(row.value, summaryX + labelW, y, { width: valueW, align: 'right' });
    y += 14;
  }

  // Grand total
  doc.font(FONT_BOLD).fontSize(11);
  doc.text('Tổng cộng:', summaryX, y, { width: labelW, align: 'right' });
  doc.text(formatCurrency(order.pricing.grandTotal), summaryX + labelW, y, { width: valueW, align: 'right' });
  y += 24;

  // ── Footer ──
  doc.font(FONT_REGULAR).fontSize(7).fillColor('#888888');
  doc.text(
    'Cảm ơn quý khách đã mua hàng tại AISTHEA.',
    PAGE_MARGIN,
    y,
    { width: pageWidth, align: 'center' },
  );
  doc.fillColor('#000000');
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function generateBulkInvoicePdf(orders: InvoiceOrderData[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    if (orders.length === 0) {
      resolve(Buffer.alloc(0));
      return;
    }

    const doc = new PDFDocument({
      size: 'A4',
      margin: PAGE_MARGIN,
      info: {
        Title: `AISTHEA Invoices — ${new Date().toISOString().slice(0, 10)}`,
        Author: 'AISTHEA Admin',
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Register fonts
    doc.registerFont('Roboto', FONT_REGULAR);
    doc.registerFont('Roboto-Bold', FONT_BOLD);

    for (let i = 0; i < orders.length; i++) {
      if (i > 0) {
        doc.addPage();
      }
      renderInvoicePage(doc, orders[i]);
    }

    doc.end();
  });
}
