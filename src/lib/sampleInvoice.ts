// Sample Invoice PDF Generator - Reuses Sales Invoice layout with SAMPLE adjustments
// A4 pagination, Header/Footer repeat, signatures, DRAFT watermark

import { formatDate, formatTimeWithSeconds, formatCurrency, numberToWords } from './format';

interface SampleLineData {
  productName: string;
  batchNumber: string;
  quantity: number;
  tpRate: number;
  costPrice: number;
  tpTotal: number;
}

interface SampleInvoiceData {
  sampleNumber: string;
  saleDateTime: string;
  status: 'DRAFT' | 'CONFIRMED' | 'CANCELLED';
  storeName?: string;
  customerName?: string;
  customerAddress?: string;
  customerPhone?: string;
  customerCode?: string;
  receiverName?: string;
  receiverPhone?: string;
  sellerName?: string;
  sellerDesignation?: string;
  sellerPhone?: string;
  notes?: string;
  lines: SampleLineData[];
  copyType?: 'SAMPLE' | 'OFFICE';
  showCost?: boolean;
  preparedBySignatureUrl?: string;
  representativeSignatureUrl?: string;
}

const MAX_ITEMS_PER_PAGE = 10;

export function generateSampleInvoiceHTML(data: SampleInvoiceData): string {
  const {
    sampleNumber,
    saleDateTime,
    status,
    storeName,
    customerName,
    customerAddress,
    customerPhone,
    customerCode,
    receiverName,
    receiverPhone,
    sellerName,
    sellerDesignation,
    sellerPhone,
    notes,
    lines,
    copyType = 'SAMPLE',
    showCost = false,
    preparedBySignatureUrl,
    representativeSignatureUrl,
  } = data;

  const dateObj = new Date(saleDateTime);
  const dateStr = formatDate(dateObj);
  const timeStr = formatTimeWithSeconds(dateObj);

  const subtotalTP = lines.reduce((s, l) => s + l.tpTotal, 0);
  const totalCost = lines.reduce((s, l) => s + l.costPrice * l.quantity, 0);
  const totalQty = lines.reduce((s, l) => s + l.quantity, 0);
  const amountInWords = numberToWords(subtotalTP);
  const isDraft = status === 'DRAFT';

  const billToName = storeName || customerName || receiverName || 'N/A';
  const billToPhone = customerPhone || receiverPhone || '';

  // Pagination
  const totalPages = Math.max(1, Math.ceil(lines.length / MAX_ITEMS_PER_PAGE));
  const paginatedLines: SampleLineData[][] = [];
  for (let i = 0; i < lines.length; i += MAX_ITEMS_PER_PAGE) {
    paginatedLines.push(lines.slice(i, i + MAX_ITEMS_PER_PAGE));
  }

  const tableHeaderHTML = `
    <tr>
      <th class="align-center" style="width:40px">SL</th>
      <th>Product</th>
      <th>Batch/Lot</th>
      <th class="align-center">Qty</th>
      <th class="align-right">TP Rate</th>
      <th class="align-right">TP Total</th>
      ${showCost ? '<th class="align-right">Cost Price</th><th class="align-right">Cost Total</th>' : ''}
    </tr>
  `;

  const generateLineItemsHTML = (pageLines: SampleLineData[], startIndex: number) =>
    pageLines.map((line, i) => `
      <tr class="product-row">
        <td class="align-center">${startIndex + i + 1}</td>
        <td class="product-name">${line.productName}</td>
        <td class="text-muted">${line.batchNumber}</td>
        <td class="align-center">${line.quantity}</td>
        <td class="align-right currency tp-highlight">৳${line.tpRate.toLocaleString('en-BD', { minimumFractionDigits: 2 })}</td>
        <td class="align-right total-cell currency">৳${line.tpTotal.toLocaleString('en-BD', { minimumFractionDigits: 2 })}</td>
        ${showCost ? `
          <td class="align-right currency text-muted">৳${line.costPrice.toLocaleString('en-BD', { minimumFractionDigits: 2 })}</td>
          <td class="align-right currency text-muted">৳${(line.costPrice * line.quantity).toLocaleString('en-BD', { minimumFractionDigits: 2 })}</td>
        ` : ''}
      </tr>
    `).join('');

  const headerHTML = (full: boolean) => full ? `
    <div class="header">
      <div class="header-left">
        <div class="invoice-title">Sample Invoice</div>
        <div class="invoice-meta">
          <div class="invoice-meta-row"><span class="invoice-meta-label">Sample No:</span><span class="invoice-meta-value">${sampleNumber}</span></div>
          <div class="invoice-meta-row"><span class="invoice-meta-label">Date:</span><span class="invoice-meta-value">${dateStr}</span></div>
          <div class="invoice-meta-row"><span class="invoice-meta-label">Time:</span><span class="invoice-meta-value">${timeStr}</span></div>
          ${customerCode ? `<div class="invoice-meta-row"><span class="invoice-meta-label">Customer ID:</span><span class="invoice-meta-value">${customerCode}</span></div>` : ''}
        </div>
      </div>
      <div class="header-right">
        <div class="logo-container">
          <img src="/favicon.svg" alt="Gazi Laboratories" />
          <div class="company-info">
            <div class="company-name">Gazi Laboratories Ltd.</div>
            <div class="company-address">Islamiahat, Hathazari, Chattogram</div>
            <div class="company-phone">+880 1987-501700</div>
          </div>
        </div>
      </div>
    </div>
    <div class="billing-section">
      <div class="billing-box bill-from">
        <div class="billing-header">From</div>
        <div class="billing-content">
          ${sellerName ? `
            <div class="billing-name">${sellerName}</div>
            ${sellerDesignation ? `<div class="billing-detail">${sellerDesignation}</div>` : ''}
            ${sellerPhone ? `<div class="billing-phone">${sellerPhone}</div>` : ''}
          ` : '<div class="billing-detail text-muted">No seller assigned</div>'}
        </div>
      </div>
      <div class="billing-box bill-to">
        <div class="billing-header">Sample To</div>
        <div class="billing-content">
          <div class="billing-name">${billToName}</div>
          ${customerAddress ? `<div class="billing-detail">${customerAddress}</div>` : ''}
          ${billToPhone ? `<div class="billing-phone">${billToPhone}</div>` : ''}
        </div>
      </div>
    </div>
  ` : `
    <div class="continuation-header">
      <div class="continuation-left">
        <img src="/favicon.svg" alt="Gazi Laboratories" class="continuation-logo" />
        <div class="continuation-company">
          <div class="company-name">Gazi Laboratories Ltd.</div>
          <div class="company-address">Islamiahat, Hathazari, Chattogram</div>
        </div>
      </div>
      <div class="continuation-right">
        <div class="continuation-invoice">Sample: ${sampleNumber}</div>
        <div class="continuation-date">${dateStr}</div>
      </div>
    </div>
  `;

  const summaryHTML = `
    <div class="summary-section">
      <div class="payment-info">
        <div class="payment-header">Sample Info</div>
        <div class="payment-row"><span class="payment-label">Status</span><span class="payment-value status">${status}</span></div>
        <div class="payment-row"><span class="payment-label">Seller</span><span class="payment-value">${sellerName || 'N/A'}</span></div>
        <div class="payment-row"><span class="payment-label">Total Items</span><span class="payment-value">${totalQty}</span></div>
        ${notes ? `<div class="payment-row"><span class="payment-label">Notes</span><span class="payment-value" style="font-size:9px;max-width:140px;word-break:break-word">${notes}</span></div>` : ''}
        ${showCost ? `
        <div class="profit-summary">
          <div class="profit-row"><span class="profit-label">Total Cost</span><span class="profit-value">৳${totalCost.toLocaleString('en-BD', { minimumFractionDigits: 2 })}</span></div>
        </div>
        ` : ''}
      </div>
      <div class="totals-box">
        <div class="totals-row"><span class="totals-label">Subtotal (TP)</span><span class="totals-value">৳${subtotalTP.toLocaleString('en-BD', { minimumFractionDigits: 2 })}</span></div>
        <div class="totals-row"><span class="totals-label">Discount</span><span class="totals-value">৳0.00</span></div>
        <div class="totals-row"><span class="totals-label">Net Payable</span><span class="totals-value">৳0.00</span></div>
        <div class="totals-row"><span class="totals-label">Paid</span><span class="totals-value">৳0.00</span></div>
        <div class="totals-row due-row"><span class="totals-label">Due</span><span class="totals-value">৳0.00</span></div>
      </div>
    </div>
    ${copyType === 'OFFICE' 
      ? '<div class="sample-note office-note">Inventory adjusted via Sample module. Stock has been deducted.</div>' 
      : '<div class="sample-note customer-note">Sample Delivery Note (No Commercial Value)</div>'}
    <div class="amount-words">
      <div class="amount-words-box">
        <div class="amount-words-label">Sample Value in Words</div>
        <div class="amount-words-value">${amountInWords}</div>
      </div>
    </div>
  `;

  const signaturesHTML = `
    <div class="signatures-section">
      <div class="signature-box">
        <div class="signature-space"></div>
        <div class="signature-line"></div>
        <div class="signature-label">Receiver Signature</div>
      </div>
      <div class="signature-box">
        ${representativeSignatureUrl ? `<div class="signature-space"><img src="${representativeSignatureUrl}" alt="Representative" class="signature-image" /></div>` : '<div class="signature-space"></div>'}
        <div class="signature-line"></div>
        <div class="signature-label">Representative Signature</div>
        ${sellerName ? `<div class="signature-name">(${sellerName})</div>` : ''}
      </div>
      <div class="signature-box">
        ${preparedBySignatureUrl ? `<div class="signature-space"><img src="${preparedBySignatureUrl}" alt="Prepared By" class="signature-image" /></div>` : '<div class="signature-space"></div>'}
        <div class="signature-line"></div>
        <div class="signature-label">Prepared By</div>
      </div>
    </div>
  `;

  const footerHTML = `
    <div class="footer">
      <div class="footer-text">Thank you for your business with Gazi Laboratories Ltd.</div>
      <div class="footer-contact">Email: gazilaboratories58@gmail.com | Phone: +880 1987-501700 | Website: www.gazilaboratories.com</div>
    </div>
  `;

  const pagesHTML = paginatedLines.map((pageLines, pi) => `
    <div class="page ${pi > 0 ? 'continuation-page' : ''}">
      ${headerHTML(pi === 0)}
      <div class="table-container">
        <table class="items-table">
          <thead>${tableHeaderHTML}</thead>
          <tbody>${generateLineItemsHTML(pageLines, pi * MAX_ITEMS_PER_PAGE)}</tbody>
        </table>
      </div>
      ${summaryHTML}
      ${signaturesHTML}
      ${footerHTML}
      <div class="page-number">Page ${pi + 1} of ${totalPages}</div>
    </div>
    ${pi < totalPages - 1 ? '<div class="page-break"></div>' : ''}
  `).join('');

  // Reuse same CSS from invoice.ts with minor additions
  return `<!DOCTYPE html><html><head><title>Sample ${sampleNumber}</title>
<style>
@page { size: A4; margin: 12mm 15mm 15mm 15mm; }
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 210mm; min-height: 297mm; }
body { font-family: 'Segoe UI', 'Arial', sans-serif; background: #f0f4f8; padding: 20px; color: #1e293b; font-size: 11px; line-height: 1.4; }
.invoice-container { max-width: 210mm; margin: 0 auto; background: white; box-shadow: 0 4px 25px rgba(0,0,0,0.12); position: relative; }
.page { position: relative; min-height: 277mm; padding-bottom: 60px; }
.page-break { page-break-after: always; height: 1px; margin: 20px 0; border-bottom: 2px dashed #e2e8f0; }
.watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 80px; font-weight: 700; color: rgba(30,58,95,0.04); pointer-events: none; z-index: 0; white-space: nowrap; }
.draft-watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 100px; font-weight: 900; color: rgba(220,38,38,0.08); pointer-events: none; z-index: 100; white-space: nowrap; letter-spacing: 15px; }
.top-bar { height: 6px; background: linear-gradient(90deg, #1e3a5f 0%, #2d5a87 100%); }
.copy-badge { position: absolute; top: 15px; right: 20px; padding: 3px 10px; background: ${copyType === 'OFFICE' ? '#1e3a5f' : '#0d9488'}; color: white; font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; border-radius: 3px; z-index: 10; }
.header { display: flex; justify-content: space-between; align-items: flex-start; padding: 15px 20px; position: relative; z-index: 1; }
.header-left { flex: 1; }
.invoice-title { font-size: 28px; font-weight: 700; color: #1e3a5f; letter-spacing: -0.5px; margin-bottom: 8px; }
.invoice-meta { display: flex; flex-direction: column; gap: 2px; }
.invoice-meta-row { display: flex; gap: 8px; font-size: 11px; }
.invoice-meta-label { color: #64748b; min-width: 75px; }
.invoice-meta-value { color: #1e3a5f; font-weight: 600; }
.header-right { text-align: right; }
.logo-container { display: flex; flex-direction: row; align-items: center; gap: 12px; }
.logo-container img { width: 100px; height: auto; transform: translate(5px, -5px); }
.company-info { text-align: left; }
.company-name { font-size: 13px; font-weight: 700; color: #1e3a5f; margin-bottom: 2px; }
.company-address { font-size: 10px; color: #64748b; line-height: 1.4; }
.company-phone { font-size: 10px; color: #1e3a5f; font-weight: 500; margin-top: 2px; }
.continuation-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 20px; border-bottom: 2px solid #e2e8f0; background: #f8fafc; }
.continuation-left { display: flex; align-items: center; gap: 10px; }
.continuation-logo { width: 50px; height: auto; }
.continuation-company .company-name { font-size: 12px; }
.continuation-company .company-address { font-size: 9px; }
.continuation-right { text-align: right; }
.continuation-invoice { font-size: 12px; font-weight: 700; color: #1e3a5f; }
.continuation-date { font-size: 10px; color: #64748b; }
.billing-section { display: flex; justify-content: space-between; padding: 12px 20px; gap: 30px; position: relative; z-index: 1; }
.billing-box { min-width: 0; }
.billing-box.bill-from { flex: 0 0 auto; }
.billing-box.bill-to { flex: 0 0 auto; text-align: right; }
.billing-box.bill-to .billing-header { float: right; clear: both; }
.billing-box.bill-to .billing-content { clear: both; text-align: right; }
.billing-header { display: inline-block; background: #1e3a5f; color: white; padding: 3px 10px; font-weight: 600; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; border-radius: 2px; }
.billing-content { font-size: 11px; line-height: 1.5; }
.billing-name { font-weight: 700; color: #1e3a5f; font-size: 12px; margin-bottom: 3px; }
.billing-detail { color: #475569; }
.billing-phone { color: #1e3a5f; font-weight: 500; margin-top: 2px; }
.table-container { padding: 0 20px 15px; position: relative; z-index: 1; }
.items-table { width: 100%; border-collapse: collapse; }
.items-table thead { display: table-header-group; }
.items-table thead th { background: #1e3a5f; color: white; padding: 8px 6px; font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.items-table thead th:first-child { border-radius: 3px 0 0 0; }
.items-table thead th:last-child { border-radius: 0 3px 0 0; }
.items-table thead th.align-right { text-align: right; }
.items-table thead th.align-center { text-align: center; }
.items-table tbody td { padding: 7px 6px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; font-size: 10px; }
.items-table tbody tr:last-child td { border-bottom: 2px solid #e2e8f0; }
.items-table tbody td.align-right { text-align: right; font-family: 'SF Mono', 'Consolas', monospace; }
.items-table tbody td.align-center { text-align: center; }
.items-table tbody td.product-name { font-weight: 500; color: #1e293b; }
.items-table tbody td.total-cell { font-weight: 600; color: #1e3a5f; }
.currency { font-family: 'SF Mono', 'Consolas', monospace; }
.text-muted { color: #94a3b8; }
.tp-highlight { color: #1e3a5f; font-weight: 600; }
.product-row { page-break-inside: avoid; break-inside: avoid; }
.summary-section { display: flex; justify-content: space-between; padding: 10px 20px 15px; gap: 20px; position: relative; z-index: 1; page-break-inside: avoid; break-inside: avoid; }
.payment-info { flex: 1; max-width: 220px; }
.payment-header { display: inline-block; background: #1e3a5f; color: white; padding: 3px 10px; font-weight: 600; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; border-radius: 2px; }
.payment-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 11px; }
.payment-label { color: #64748b; }
.payment-value { color: #1e293b; font-weight: 600; }
.payment-value.status { color: ${status === 'CONFIRMED' ? '#059669' : status === 'DRAFT' ? '#d97706' : '#dc2626'}; }
.totals-box { min-width: 180px; background: #f8fafc; border-radius: 5px; padding: 10px 14px; border: 1px solid #e2e8f0; }
.totals-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 11px; border-bottom: 1px solid #e2e8f0; }
.totals-row:last-of-type { border-bottom: none; }
.totals-label { color: #64748b; }
.totals-value { font-weight: 600; color: #1e293b; font-family: 'SF Mono', 'Consolas', monospace; }
.totals-row.due-row { background: #1e3a5f; margin: 6px -14px -10px; padding: 8px 14px; border-radius: 0 0 5px 5px; }
.totals-row.due-row .totals-label, .totals-row.due-row .totals-value { color: white; font-weight: 700; font-size: 12px; }
.profit-summary { margin-top: 10px; padding: 8px 12px; background: #fef3c7; border: 1px solid #fcd34d; border-radius: 4px; page-break-inside: avoid; }
.profit-row { display: flex; justify-content: space-between; font-size: 11px; }
.profit-label { color: #92400e; font-weight: 500; }
.profit-value { color: #92400e; font-weight: 700; font-family: 'SF Mono', 'Consolas', monospace; }
.sample-note { margin: 0 20px 8px; padding: 6px 12px; border-radius: 4px; font-size: 10px; font-weight: 500; text-align: center; page-break-inside: avoid; }
.sample-note.office-note { background: #ecfdf5; border: 1px solid #86efac; color: #166534; }
.sample-note.customer-note { background: #f8fafc; border: 1px solid #e2e8f0; color: #64748b; font-style: italic; }
.amount-words { padding: 0 20px 12px; position: relative; z-index: 1; page-break-inside: avoid; }
.amount-words-box { background: #f0fdf4; border: 1px solid #86efac; border-radius: 4px; padding: 8px 12px; }
.amount-words-label { font-size: 9px; color: #64748b; text-transform: uppercase; margin-bottom: 2px; }
.amount-words-value { font-size: 11px; font-weight: 600; color: #166534; }
.signatures-section { display: flex; justify-content: space-between; padding: 20px 20px 12px; gap: 20px; margin-top: 10px; position: relative; z-index: 1; page-break-inside: avoid; break-inside: avoid; }
.signature-box { flex: 1; text-align: center; }
.signature-space { height: 45px; display: flex; align-items: flex-end; justify-content: center; }
.signature-image { max-height: 40px; max-width: 100px; object-fit: contain; }
.signature-line { border-top: 1.5px solid #334155; width: 100%; margin-bottom: 6px; }
.signature-label { font-size: 9px; color: #64748b; text-transform: uppercase; letter-spacing: 0.3px; }
.signature-name { font-size: 8px; color: #94a3b8; margin-top: 2px; }
.footer { background: linear-gradient(135deg, #e0f2fe 0%, #dbeafe 100%); padding: 15px 20px; margin-top: auto; position: relative; z-index: 1; text-align: center; page-break-inside: avoid; }
.footer-text { font-size: 12px; font-weight: 600; color: #1e3a5f; margin-bottom: 5px; }
.footer-contact { font-size: 9px; color: #64748b; }
.page-number { position: absolute; bottom: 10px; right: 20px; font-size: 10px; color: #64748b; background: white; padding: 2px 8px; border-radius: 3px; }
.print-actions { text-align: center; padding: 20px; }
.print-btn { display: inline-block; padding: 10px 25px; background: #1e3a5f; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500; margin: 0 5px; }
.print-btn:hover { background: #2d4a6f; }
.print-btn.secondary { background: #64748b; }
@media print {
  body { background: white; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .print-actions { display: none !important; }
  .invoice-container { box-shadow: none; max-width: 100%; }
  .page-break { display: none; page-break-after: always; }
  .page { page-break-after: always; min-height: auto; }
  .page:last-child { page-break-after: avoid; }
  .top-bar, .items-table thead th, .billing-header, .payment-header, .totals-row.due-row, .copy-badge, .continuation-header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .items-table thead { display: table-header-group; }
  .items-table tr { page-break-inside: avoid; break-inside: avoid; }
  .summary-section, .signatures-section, .footer, .amount-words, .sample-note { page-break-inside: avoid; break-inside: avoid; }
  .page-number { position: fixed; bottom: 5mm; right: 15mm; }
}
@media screen {
  .page-break { height: 30px; background: #e2e8f0; margin: 0; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #64748b; }
  .page-break::after { content: '— Page Break —'; }
}
</style>
</head>
<body>
  <div class="invoice-container">
    <div class="watermark">${copyType === 'OFFICE' ? 'OFFICE COPY' : 'SAMPLE COPY'}</div>
    ${isDraft ? '<div class="draft-watermark">DRAFT</div>' : ''}
    <div class="top-bar"></div>
    <div class="copy-badge">${copyType === 'OFFICE' ? 'Office Copy' : 'Sample Copy'}</div>
    ${pagesHTML}
  </div>
  <div class="print-actions">
    <button class="print-btn" onclick="window.print()">🖨️ Print Sample Invoice</button>
    <button class="print-btn secondary" onclick="window.close()">✕ Close</button>
  </div>
</body></html>`;
}

export function openSampleInvoiceWindow(data: SampleInvoiceData): void {
  const html = generateSampleInvoiceHTML(data);
  const w = window.open('', '_blank');
  if (w) { w.document.write(html); w.document.close(); }
}

export function openSampleOfficeCopy(data: SampleInvoiceData): void {
  openSampleInvoiceWindow({ ...data, copyType: 'OFFICE', showCost: true });
}

export function openSampleCopy(data: SampleInvoiceData): void {
  openSampleInvoiceWindow({ ...data, copyType: 'SAMPLE', showCost: false });
}
