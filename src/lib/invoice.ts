// Professional Invoice PDF Generator with TP Rate, Discount, and Amount in Words

import { SalesInvoice } from '@/types';
import { formatCurrency, formatDate, formatTimeWithSeconds, numberToWords } from './format';

interface InvoiceLineData {
  id: string;
  productName: string;
  quantity: number;
  freeQuantity: number;
  unitPrice: number; // MRP (for reference)
  tpRate: number; // Trade Price (billing price)
  costPrice?: number; // Internal cost (for Office Copy only)
  discountType: 'AMOUNT' | 'PERCENT';
  discountValue: number;
  lineTotal: number; // Based on TP Rate
}

interface InvoiceData {
  invoice: SalesInvoice;
  customerName: string;
  customerAddress?: string;
  customerPhone?: string;
  sellerName?: string;
  sellerDesignation?: string;
  sellerPhone?: string;
  storeName?: string;
  getProductName: (productId: string) => string;
  lines?: InvoiceLineData[]; // Enhanced line data
  showTPRate?: boolean; // Toggle to show TP Rate column
  showCostProfit?: boolean; // Toggle to show Cost Price & Profit (Office Copy only)
  copyType?: 'CUSTOMER' | 'OFFICE'; // Copy type for watermark
  // Signature URLs (embedded images)
  preparedBySignatureUrl?: string;
  representativeSignatureUrl?: string;
}

export function generateInvoiceHTML(data: InvoiceData): string {
  const { 
    invoice, 
    customerName, 
    customerAddress, 
    customerPhone, 
    sellerName, 
    sellerDesignation,
    sellerPhone,
    storeName,
    getProductName,
    lines,
    showTPRate = true, // Always show TP Rate
    showCostProfit = false, // Only for Office Copy
    copyType = 'CUSTOMER',
    preparedBySignatureUrl,
    representativeSignatureUrl,
  } = data;

  const invoiceDate = new Date(invoice.date);
  const dateStr = formatDate(invoiceDate);
  const timeStr = formatTimeWithSeconds(invoiceDate);
  
  // Calculate totals based on TP Rate
  const subtotalTP = (lines || []).reduce((sum, line) => {
    // Calculate TP-based subtotal before line discounts
    return sum + (line.tpRate * line.quantity);
  }, 0);
  
  const lineDiscountTotal = (lines || []).reduce((sum, line) => {
    const tpSubtotal = line.tpRate * line.quantity;
    if (line.discountValue > 0) {
      if (line.discountType === 'PERCENT') {
        return sum + (tpSubtotal * line.discountValue / 100);
      }
      return sum + line.discountValue;
    }
    return sum;
  }, 0);

  // Calculate total profit for Office Copy
  // Correct formula: Profit = (TP × Paid Qty - Line Discount) - Cost × (Paid + Free)
  const totalProfit = showCostProfit ? (lines || []).reduce((sum, line) => {
    const tpSubtotal = (line.tpRate || 0) * line.quantity;
    let lineDiscount = 0;
    if (line.discountValue > 0) {
      if (line.discountType === 'PERCENT') {
        lineDiscount = tpSubtotal * line.discountValue / 100;
      } else {
        lineDiscount = line.discountValue;
      }
    }
    const netSales = tpSubtotal - lineDiscount;
    const totalCost = (line.costPrice || 0) * (line.quantity + (line.freeQuantity || 0));
    const profit = netSales - totalCost;
    return sum + profit;
  }, 0) : 0;

  const amountInWords = numberToWords(invoice.totalAmount);

  // Generate line items HTML
  const lineItemsHTML = (lines || invoice.lines.map(line => ({
    id: line.id,
    productName: getProductName(line.productId),
    quantity: line.quantity,
    freeQuantity: line.freeQuantity,
    unitPrice: line.unitPrice,
    tpRate: 0,
    costPrice: 0,
    discountType: 'AMOUNT' as const,
    discountValue: 0,
    lineTotal: line.lineTotal,
  }))).map((line, index) => {
    const discountDisplay = line.discountValue > 0 
      ? (line.discountType === 'PERCENT' ? `${line.discountValue}%` : `৳${line.discountValue}`)
      : '-';
    
    // Calculate profit per line (for Office Copy)
    // Correct formula: Profit = (TP × Paid Qty - Line Discount) - Cost × (Paid + Free)
    let lineProfit = 0;
    if (showCostProfit) {
      const tpSubtotal = (line.tpRate || 0) * line.quantity;
      let lineDiscountAmt = 0;
      if (line.discountValue > 0) {
        if (line.discountType === 'PERCENT') {
          lineDiscountAmt = tpSubtotal * line.discountValue / 100;
        } else {
          lineDiscountAmt = line.discountValue;
        }
      }
      const netSales = tpSubtotal - lineDiscountAmt;
      const totalCost = (line.costPrice || 0) * (line.quantity + (line.freeQuantity || 0));
      lineProfit = netSales - totalCost;
    }
    
    return `
      <tr>
        <td class="align-center">${index + 1}</td>
        <td class="product-name">
          ${line.productName}
          ${line.freeQuantity > 0 ? `
            <div class="free-line">
              <span class="free-badge">FREE</span>
              <span class="free-qty">+${line.freeQuantity} free</span>
            </div>
          ` : ''}
        </td>
        <td class="align-right currency">৳${line.unitPrice.toLocaleString('en-BD', { minimumFractionDigits: 2 })}</td>
        <td class="align-right currency tp-highlight">৳${line.tpRate.toLocaleString('en-BD', { minimumFractionDigits: 2 })}</td>
        <td class="align-center">${line.quantity}${line.freeQuantity > 0 ? ` <span class="text-green">(+${line.freeQuantity})</span>` : ''}</td>
        <td class="align-center text-discount">${discountDisplay}</td>
        <td class="align-right total-cell currency">৳${line.lineTotal.toLocaleString('en-BD', { minimumFractionDigits: 2 })}</td>
        ${showCostProfit ? `
          <td class="align-right currency text-muted">৳${(line.costPrice || 0).toLocaleString('en-BD', { minimumFractionDigits: 2 })}</td>
          <td class="align-right currency ${lineProfit >= 0 ? 'text-profit' : 'text-loss'}">৳${lineProfit.toLocaleString('en-BD', { minimumFractionDigits: 2 })}</td>
        ` : ''}
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Invoice ${invoice.invoiceNumber}</title>
      <style>
        @page {
          size: A4;
          margin: 15mm;
        }
        * { 
          margin: 0; 
          padding: 0; 
          box-sizing: border-box; 
        }
        body { 
          font-family: 'Segoe UI', 'Arial', sans-serif; 
          background: #f0f4f8; 
          padding: 20px;
          min-height: 100vh;
          color: #1e293b;
          font-size: 12px;
          line-height: 1.4;
        }
        .invoice-container {
          max-width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          background: white;
          box-shadow: 0 4px 25px rgba(0,0,0,0.12);
          position: relative;
        }
        
        /* === WATERMARK === */
        .watermark {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-45deg);
          font-size: 80px;
          font-weight: 700;
          color: rgba(30, 58, 95, 0.05);
          pointer-events: none;
          z-index: 0;
          white-space: nowrap;
        }
        
        /* === TOP BAR === */
        .top-bar {
          height: 6px;
          background: linear-gradient(90deg, #1e3a5f 0%, #2d5a87 100%);
        }
        
        /* === COPY TYPE BADGE === */
        .copy-badge {
          position: absolute;
          top: 20px;
          right: 20px;
          padding: 4px 12px;
          background: ${copyType === 'OFFICE' ? '#1e3a5f' : '#059669'};
          color: white;
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
          border-radius: 3px;
        }
        
        /* === HEADER SECTION === */
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 25px 30px 20px;
          position: relative;
          z-index: 1;
        }
        .header-left {
          flex: 1;
        }
        .invoice-title {
          font-size: 32px;
          font-weight: 700;
          color: #1e3a5f;
          letter-spacing: -0.5px;
          margin-bottom: 10px;
        }
        .invoice-meta {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .invoice-meta-row {
          display: flex;
          gap: 8px;
          font-size: 12px;
        }
        .invoice-meta-label {
          color: #64748b;
          min-width: 85px;
        }
        .invoice-meta-value {
          color: #1e3a5f;
          font-weight: 600;
        }
        .header-right {
          text-align: right;
        }
        .logo-container {
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 15px;
        }
        .logo-container img {
          width: 130px;
          height: auto;
          transform: translate(10px, -10px);
        }
        .company-info {
          text-align: left;
        }
        .company-name {
          font-size: 14px;
          font-weight: 700;
          color: #1e3a5f;
          margin-bottom: 2px;
        }
        .company-address {
          font-size: 11px;
          color: #64748b;
          line-height: 1.4;
        }
        .company-phone {
          font-size: 11px;
          color: #1e3a5f;
          font-weight: 500;
          margin-top: 2px;
        }
        
        /* === BILLING SECTION === */
        .billing-section {
          display: flex;
          justify-content: space-between;
          padding: 20px 30px;
          gap: 40px;
          position: relative;
          z-index: 1;
        }
        .billing-box {
          min-width: 0;
        }
        .billing-box.bill-from {
          flex: 0 0 auto;
        }
        .billing-box.bill-to {
          flex: 0 0 auto;
          text-align: right;
        }
        .billing-box.bill-to .billing-header {
          float: right;
          clear: both;
        }
        .billing-box.bill-to .billing-content {
          clear: both;
          text-align: right;
        }
        .billing-header {
          display: inline-block;
          background: #1e3a5f;
          color: white;
          padding: 4px 12px;
          font-weight: 600;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 10px;
          border-radius: 2px;
        }
        .billing-content {
          font-size: 12px;
          line-height: 1.6;
        }
        .billing-name {
          font-weight: 700;
          color: #1e3a5f;
          font-size: 13px;
          margin-bottom: 4px;
        }
        .billing-detail {
          color: #475569;
        }
        .billing-phone {
          color: #1e3a5f;
          font-weight: 500;
          margin-top: 3px;
        }
        
        /* === ITEMS TABLE === */
        .table-container {
          padding: 0 30px 20px;
          position: relative;
          z-index: 1;
        }
        .items-table {
          width: 100%;
          border-collapse: collapse;
        }
        .items-table thead th {
          background: #1e3a5f;
          color: white;
          padding: 10px 8px;
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .items-table thead th:first-child {
          border-radius: 4px 0 0 0;
        }
        .items-table thead th:last-child {
          border-radius: 0 4px 0 0;
        }
        .items-table thead th.align-right {
          text-align: right;
        }
        .items-table thead th.align-center {
          text-align: center;
        }
        .items-table tbody td {
          padding: 10px 8px;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
          font-size: 11px;
        }
        .items-table tbody tr:last-child td {
          border-bottom: 2px solid #e2e8f0;
        }
        .items-table tbody td.align-right {
          text-align: right;
          font-family: 'SF Mono', 'Consolas', monospace;
        }
        .items-table tbody td.align-center {
          text-align: center;
        }
        .items-table tbody td.product-name {
          font-weight: 500;
          color: #1e293b;
        }
        .items-table tbody td.total-cell {
          font-weight: 600;
          color: #1e3a5f;
        }
        .currency {
          font-family: 'SF Mono', 'Consolas', monospace;
        }
        .text-muted {
          color: #94a3b8;
        }
        .text-discount {
          color: #d97706;
          font-weight: 500;
        }
        .free-badge {
          display: inline-block;
          background: #059669;
          color: white;
          padding: 1px 6px;
          border-radius: 3px;
          font-size: 9px;
          font-weight: 600;
          text-transform: uppercase;
        }
        .free-line {
          display: flex;
          align-items: center;
          gap: 5px;
          margin-top: 3px;
        }
        .free-qty {
          font-size: 10px;
          color: #059669;
          font-weight: 500;
        }
        .text-green {
          color: #059669;
          font-weight: 500;
        }
        .text-profit {
          color: #059669;
          font-weight: 600;
        }
        .text-loss {
          color: #dc2626;
          font-weight: 600;
        }
        .tp-highlight {
          color: #1e3a5f;
          font-weight: 600;
        }
        .profit-row {
          background: #f0fdf4;
          border-radius: 4px;
          padding: 8px !important;
          margin-top: 5px;
        }
        
        /* === SUMMARY SECTION === */
        .summary-section {
          display: flex;
          justify-content: space-between;
          padding: 0 30px 20px;
          gap: 30px;
          position: relative;
          z-index: 1;
        }
        .payment-info {
          flex: 1;
          max-width: 260px;
        }
        .payment-header {
          display: inline-block;
          background: #1e3a5f;
          color: white;
          padding: 4px 12px;
          font-weight: 600;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 10px;
          border-radius: 2px;
        }
        .payment-row {
          display: flex;
          justify-content: space-between;
          padding: 5px 0;
          font-size: 12px;
        }
        .payment-label {
          color: #64748b;
        }
        .payment-value {
          color: #1e293b;
          font-weight: 600;
        }
        .payment-value.status {
          color: ${invoice.status === 'CONFIRMED' ? '#059669' : '#d97706'};
        }
        
        .totals-box {
          min-width: 200px;
          background: #f8fafc;
          border-radius: 6px;
          padding: 12px 16px;
          border: 1px solid #e2e8f0;
        }
        .totals-row {
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
          font-size: 12px;
          border-bottom: 1px solid #e2e8f0;
        }
        .totals-row:last-of-type {
          border-bottom: none;
        }
        .totals-label {
          color: #64748b;
        }
        .totals-value {
          font-weight: 600;
          color: #1e293b;
          font-family: 'SF Mono', 'Consolas', monospace;
        }
        .totals-value.discount {
          color: #d97706;
        }
        .totals-row.due-row {
          background: #1e3a5f;
          margin: 8px -16px -12px;
          padding: 10px 16px;
          border-radius: 0 0 6px 6px;
        }
        .totals-row.due-row .totals-label,
        .totals-row.due-row .totals-value {
          color: white;
          font-weight: 700;
          font-size: 13px;
        }
        
        /* === AMOUNT IN WORDS === */
        .amount-words {
          padding: 0 30px 15px;
          position: relative;
          z-index: 1;
        }
        .amount-words-box {
          background: #f0fdf4;
          border: 1px solid #86efac;
          border-radius: 4px;
          padding: 10px 15px;
        }
        .amount-words-label {
          font-size: 10px;
          color: #64748b;
          text-transform: uppercase;
          margin-bottom: 3px;
        }
        .amount-words-value {
          font-size: 12px;
          font-weight: 600;
          color: #166534;
        }
        
        /* === SIGNATURES SECTION === */
        .signatures-section {
          display: flex;
          justify-content: space-between;
          padding: 25px 30px 15px;
          gap: 25px;
          margin-top: 15px;
          position: relative;
          z-index: 1;
        }
        .signature-box {
          flex: 1;
          text-align: center;
        }
        .signature-space {
          height: 50px;
          display: flex;
          align-items: flex-end;
          justify-content: center;
        }
        .signature-image {
          max-height: 45px;
          max-width: 120px;
          object-fit: contain;
        }
        .signature-line {
          border-top: 1.5px solid #334155;
          width: 100%;
          margin-bottom: 8px;
        }
        .signature-label {
          font-size: 10px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .signature-name {
          font-size: 9px;
          color: #94a3b8;
          margin-top: 2px;
        }
        
        /* === FOOTER === */
        .footer {
          background: linear-gradient(135deg, #e0f2fe 0%, #dbeafe 100%);
          padding: 20px 30px;
          margin-top: auto;
          position: relative;
          z-index: 1;
          text-align: center;
        }
        .footer-text {
          font-size: 14px;
          font-weight: 600;
          color: #1e3a5f;
          margin-bottom: 8px;
        }
        .footer-contact {
          font-size: 10px;
          color: #64748b;
        }
        
        /* === PRINT BUTTON === */
        .print-actions {
          text-align: center;
          padding: 20px;
        }
        .print-btn {
          display: inline-block;
          padding: 10px 25px;
          background: #1e3a5f;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          margin: 0 5px;
        }
        .print-btn:hover {
          background: #2d4a6f;
        }
        .print-btn.secondary {
          background: #64748b;
        }
        
        /* === PRINT STYLES === */
        @media print { 
          body { 
            background: white; 
            padding: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-actions { display: none; }
          .invoice-container { 
            box-shadow: none;
            max-width: 100%;
          }
          .top-bar,
          .items-table thead th,
          .billing-header,
          .payment-header,
          .totals-row.due-row,
          .copy-badge {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <div class="watermark">${copyType === 'OFFICE' ? 'OFFICE COPY' : 'CUSTOMER COPY'}</div>
        <div class="top-bar"></div>
        <div class="copy-badge">${copyType === 'OFFICE' ? 'Office Copy' : 'Customer Copy'}</div>
        
        <!-- Header Section -->
        <div class="header">
          <div class="header-left">
            <div class="invoice-title">Invoice</div>
            <div class="invoice-meta">
              <div class="invoice-meta-row">
                <span class="invoice-meta-label">Invoice No:</span>
                <span class="invoice-meta-value">${invoice.invoiceNumber}</span>
              </div>
              <div class="invoice-meta-row">
                <span class="invoice-meta-label">Date:</span>
                <span class="invoice-meta-value">${dateStr}</span>
              </div>
              <div class="invoice-meta-row">
                <span class="invoice-meta-label">Time:</span>
                <span class="invoice-meta-value">${timeStr}</span>
              </div>
              ${storeName ? `
              <div class="invoice-meta-row">
                <span class="invoice-meta-label">Store:</span>
                <span class="invoice-meta-value">${storeName}</span>
              </div>
              ` : ''}
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
        
        <!-- Billing Section -->
        <div class="billing-section">
          <div class="billing-box bill-from">
            <div class="billing-header">Bill From</div>
            <div class="billing-content">
              ${sellerName ? `
              <div class="billing-name">${sellerName}</div>
              ${sellerDesignation ? `<div class="billing-detail">${sellerDesignation}</div>` : ''}
              ${sellerPhone ? `<div class="billing-phone">${sellerPhone}</div>` : ''}
              ` : '<div class="billing-detail text-muted">No seller assigned</div>'}
            </div>
          </div>
          <div class="billing-box bill-to">
            <div class="billing-header">Bill To</div>
            <div class="billing-content">
              <div class="billing-name">${customerName || 'N/A'}</div>
              ${customerAddress ? `<div class="billing-detail">${customerAddress}</div>` : ''}
              ${customerPhone ? `<div class="billing-phone">${customerPhone}</div>` : ''}
            </div>
          </div>
        </div>
        
        <!-- Items Table -->
        <div class="table-container">
          <table class="items-table">
            <thead>
              <tr>
                <th class="align-center" style="width:40px">SL</th>
                <th>Product</th>
                <th class="align-right">MRP</th>
                <th class="align-right">TP Rate</th>
                <th class="align-center">Qty</th>
                <th class="align-center">Discount</th>
                <th class="align-right">Total (TP)</th>
                ${showCostProfit ? '<th class="align-right">Cost</th><th class="align-right">Profit</th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${lineItemsHTML}
            </tbody>
          </table>
        </div>
        
        <!-- Summary Section -->
        <div class="summary-section">
          <div class="payment-info">
            <div class="payment-header">Payment Info</div>
            <div class="payment-row">
              <span class="payment-label">Status</span>
              <span class="payment-value status">${['CONFIRMED', 'PAID', 'PARTIAL'].includes(invoice.status) ? 'Confirmed' : invoice.status}</span>
            </div>
            <div class="payment-row">
              <span class="payment-label">Seller</span>
              <span class="payment-value">${sellerName || 'N/A'}</span>
            </div>
            <div class="payment-row">
              <span class="payment-label">Paid Amount</span>
              <span class="payment-value currency">৳${invoice.paidAmount.toLocaleString('en-BD', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
          <div class="totals-box">
            <div class="totals-row">
              <span class="totals-label">Subtotal (TP)</span>
              <span class="totals-value">৳${subtotalTP.toLocaleString('en-BD', { minimumFractionDigits: 2 })}</span>
            </div>
            <div class="totals-row">
              <span class="totals-label">Line Discounts</span>
              <span class="totals-value discount">-৳${lineDiscountTotal.toLocaleString('en-BD', { minimumFractionDigits: 2 })}</span>
            </div>
            <div class="totals-row">
              <span class="totals-label">Net Payable</span>
              <span class="totals-value">৳${invoice.totalAmount.toLocaleString('en-BD', { minimumFractionDigits: 2 })}</span>
            </div>
            <div class="totals-row">
              <span class="totals-label">Paid</span>
              <span class="totals-value">৳${invoice.paidAmount.toLocaleString('en-BD', { minimumFractionDigits: 2 })}</span>
            </div>
            <div class="totals-row due-row">
              <span class="totals-label">Due</span>
              <span class="totals-value">৳${invoice.dueAmount.toLocaleString('en-BD', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
        
        <!-- Amount in Words -->
        <div class="amount-words">
          <div class="amount-words-box">
            <div class="amount-words-label">Amount in Words</div>
            <div class="amount-words-value">${amountInWords}</div>
          </div>
        </div>
        
        <!-- Signatures Section -->
        <div class="signatures-section">
          <div class="signature-box">
            <div class="signature-space"></div>
            <div class="signature-line"></div>
            <div class="signature-label">Customer Signature</div>
          </div>
          <div class="signature-box">
            ${representativeSignatureUrl ? `
            <div class="signature-space">
              <img src="${representativeSignatureUrl}" alt="Representative Signature" class="signature-image" />
            </div>
            ` : '<div class="signature-space"></div>'}
            <div class="signature-line"></div>
            <div class="signature-label">Representative Signature</div>
            ${sellerName ? `<div class="signature-name">(${sellerName})</div>` : ''}
          </div>
          <div class="signature-box">
            ${preparedBySignatureUrl ? `
            <div class="signature-space">
              <img src="${preparedBySignatureUrl}" alt="Prepared By Signature" class="signature-image" />
            </div>
            ` : '<div class="signature-space"></div>'}
            <div class="signature-line"></div>
            <div class="signature-label">Prepared By</div>
          </div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
          <div class="footer-text">Thank you for your business with Gazi Laboratories Ltd.</div>
          <div class="footer-contact">Email: gazilaboratories58@gmail.com | Phone: +880 1987-501700</div>
        </div>
      </div>
      
      <div class="print-actions">
        <button class="print-btn" onclick="window.print()">🖨️ Print Invoice</button>
        <button class="print-btn secondary" onclick="window.close()">✕ Close</button>
      </div>
    </body>
    </html>
  `;
}

export function openInvoiceWindow(data: InvoiceData): void {
  const html = generateInvoiceHTML(data);
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}

// Open Office Copy - includes Cost Price and Profit
export function openOfficeCopyWindow(data: InvoiceData): void {
  const html = generateInvoiceHTML({ 
    ...data, 
    copyType: 'OFFICE', 
    showTPRate: true,
    showCostProfit: true // Show Cost Price and Profit columns
  });
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}

// Open Customer Copy - TP Rate visible, billing based on TP, no Cost/Profit
export function openCustomerCopyWindow(data: InvoiceData): void {
  const html = generateInvoiceHTML({ 
    ...data, 
    copyType: 'CUSTOMER', 
    showTPRate: true, // Show TP Rate column
    showCostProfit: false // No Cost Price or Profit
  });
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}
