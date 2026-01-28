// Professional Invoice PDF Generator

import { SalesInvoice } from '@/types';
import { formatCurrency, formatDate } from './format';

interface InvoiceData {
  invoice: SalesInvoice;
  customerName: string;
  customerAddress?: string;
  customerPhone?: string;
  sellerName?: string;
  getProductName: (productId: string) => string;
}

export function generateInvoiceHTML(data: InvoiceData): string {
  const { invoice, customerName, customerAddress, customerPhone, sellerName, getProductName } = data;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Invoice ${invoice.invoiceNumber}</title>
      <style>
        @page {
          size: A4;
          margin: 20mm;
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
          font-size: 13px;
          line-height: 1.5;
        }
        .invoice-container {
          max-width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          background: white;
          box-shadow: 0 4px 25px rgba(0,0,0,0.12);
          position: relative;
        }
        
        /* === TOP BAR === */
        .top-bar {
          height: 8px;
          background: linear-gradient(90deg, #1e3a5f 0%, #2d5a87 100%);
        }
        
        /* === HEADER SECTION === */
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 30px 40px 20px;
          border-bottom: 1px solid #e2e8f0;
        }
        .header-left {
          flex: 1;
        }
        .invoice-title {
          font-size: 36px;
          font-weight: 700;
          color: #1e3a5f;
          letter-spacing: -0.5px;
          margin-bottom: 12px;
        }
        .invoice-meta {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .invoice-meta-row {
          display: flex;
          gap: 8px;
          font-size: 13px;
        }
        .invoice-meta-label {
          color: #64748b;
          min-width: 90px;
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
          flex-direction: column;
          align-items: flex-end;
          gap: 8px;
        }
        .logo-container img {
          width: 60px;
          height: 60px;
        }
        .company-name {
          font-size: 14px;
          font-weight: 700;
          color: #1e3a5f;
        }
        .company-country {
          font-size: 12px;
          color: #64748b;
        }
        
        /* === BILLING SECTION === */
        .billing-section {
          display: flex;
          padding: 25px 40px;
          gap: 0;
        }
        .billing-box {
          flex: 1;
          min-width: 0;
        }
        .billing-box:first-child {
          padding-right: 20px;
          border-right: 1px solid #e2e8f0;
        }
        .billing-box:last-child {
          padding-left: 20px;
        }
        .billing-header {
          display: inline-block;
          background: #1e3a5f;
          color: white;
          padding: 6px 16px;
          font-weight: 600;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 15px;
          border-radius: 2px;
        }
        .billing-content {
          font-size: 13px;
          line-height: 1.7;
        }
        .billing-name {
          font-weight: 700;
          color: #1e3a5f;
          font-size: 14px;
          margin-bottom: 6px;
        }
        .billing-detail {
          color: #475569;
        }
        .billing-phone {
          color: #1e3a5f;
          font-weight: 500;
          margin-top: 4px;
        }
        
        /* === ITEMS TABLE === */
        .table-container {
          padding: 0 40px 25px;
        }
        .items-table {
          width: 100%;
          border-collapse: collapse;
        }
        .items-table thead th {
          background: #1e3a5f;
          color: white;
          padding: 12px 15px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .items-table thead th:first-child {
          text-align: left;
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
          padding: 14px 15px;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
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
        .free-badge {
          display: inline-block;
          background: #059669;
          color: white;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
        }
        .free-line {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 4px;
        }
        .free-qty {
          font-size: 11px;
          color: #059669;
          font-weight: 500;
        }
        .text-green {
          color: #059669;
          font-weight: 500;
        }
        
        /* === SUMMARY SECTION === */
        .summary-section {
          display: flex;
          justify-content: space-between;
          padding: 0 40px 25px;
          gap: 40px;
        }
        .payment-info {
          flex: 1;
          max-width: 280px;
        }
        .payment-header {
          display: inline-block;
          background: #1e3a5f;
          color: white;
          padding: 6px 16px;
          font-weight: 600;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 15px;
          border-radius: 2px;
        }
        .payment-row {
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
          font-size: 13px;
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
          min-width: 220px;
          background: #f8fafc;
          border-radius: 6px;
          padding: 15px 20px;
          border: 1px solid #e2e8f0;
        }
        .totals-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          font-size: 13px;
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
        .totals-row.due-row {
          background: #1e3a5f;
          margin: 10px -20px -15px;
          padding: 12px 20px;
          border-radius: 0 0 6px 6px;
        }
        .totals-row.due-row .totals-label,
        .totals-row.due-row .totals-value {
          color: white;
          font-weight: 700;
          font-size: 14px;
        }
        
        /* === SIGNATURES SECTION === */
        .signatures-section {
          display: flex;
          justify-content: space-between;
          padding: 30px 40px 20px;
          gap: 30px;
          margin-top: 20px;
        }
        .signature-box {
          flex: 1;
          text-align: center;
        }
        .signature-space {
          height: 50px;
        }
        .signature-line {
          border-top: 1.5px solid #334155;
          width: 100%;
          margin-bottom: 10px;
        }
        .signature-label {
          font-size: 11px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .signature-name {
          font-size: 10px;
          color: #94a3b8;
          margin-top: 2px;
        }
        
        /* === FOOTER === */
        .footer {
          background: linear-gradient(135deg, #e0f2fe 0%, #dbeafe 100%);
          padding: 25px 40px;
          margin-top: auto;
        }
        .footer-title {
          font-size: 22px;
          font-weight: 700;
          color: #1e3a5f;
          margin-bottom: 8px;
        }
        .footer-text {
          font-size: 12px;
          color: #475569;
          line-height: 1.6;
        }
        .footer-contact {
          margin-top: 8px;
          font-size: 11px;
          color: #64748b;
        }
        
        /* === PRINT BUTTON === */
        .print-actions {
          text-align: center;
          padding: 20px;
        }
        .print-btn {
          display: inline-block;
          padding: 12px 30px;
          background: #1e3a5f;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          margin: 0 5px;
        }
        .print-btn:hover {
          background: #2d4a6f;
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
          .totals-row.due-row {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <div class="top-bar"></div>
        
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
                <span class="invoice-meta-label">Invoice Date:</span>
                <span class="invoice-meta-value">${formatDate(invoice.date)}</span>
              </div>
            </div>
          </div>
          <div class="header-right">
            <div class="logo-container">
              <img src="/favicon.svg" alt="Gazi Laboratories" />
              <div class="company-name">GAZI LABORATORIES LTD.</div>
              <div class="company-country">Bangladesh</div>
            </div>
          </div>
        </div>
        
        <!-- Billing Section -->
        <div class="billing-section">
          <div class="billing-box">
            <div class="billing-header">Bill From</div>
            <div class="billing-content">
              <div class="billing-name">Gazi Laboratories Ltd.</div>
              <div class="billing-detail">Mamtaj Center (1st Floor)</div>
              <div class="billing-detail">Islamiahat, Hathazari, Chattogram</div>
              <div class="billing-phone">+880 1987-501700</div>
            </div>
          </div>
          <div class="billing-box">
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
                <th>Description</th>
                <th class="align-right">Rate</th>
                <th class="align-center">Qty</th>
                <th class="align-right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.lines.map((line) => `
                <tr>
                  <td class="product-name">
                    ${getProductName(line.productId)}
                    ${line.freeQuantity > 0 ? `
                      <div class="free-line">
                        <span class="free-badge">FREE</span>
                        <span class="free-qty">+${line.freeQuantity} free</span>
                      </div>
                    ` : ''}
                  </td>
                  <td class="align-right currency">৳${line.unitPrice.toLocaleString('en-BD', { minimumFractionDigits: 2 })}</td>
                  <td class="align-center">${line.quantity}${line.freeQuantity > 0 ? ` <span class="text-green">(+${line.freeQuantity})</span>` : ''}</td>
                  <td class="align-right total-cell currency">৳${line.lineTotal.toLocaleString('en-BD', { minimumFractionDigits: 2 })}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        
        <!-- Summary Section -->
        <div class="summary-section">
          <div class="payment-info">
            <div class="payment-header">Payment Info</div>
            <div class="payment-row">
              <span class="payment-label">Status</span>
              <span class="payment-value status">${invoice.status === 'CONFIRMED' ? 'Confirmed' : 'Draft'}</span>
            </div>
            <div class="payment-row">
              <span class="payment-label">Paid Amount</span>
              <span class="payment-value currency">৳${invoice.paidAmount.toLocaleString('en-BD', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
          <div class="totals-box">
            <div class="totals-row">
              <span class="totals-label">Subtotal</span>
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
        
        <!-- Signatures Section -->
        <div class="signatures-section">
          <div class="signature-box">
            <div class="signature-space"></div>
            <div class="signature-line"></div>
            <div class="signature-label">Customer Signature</div>
          </div>
          <div class="signature-box">
            <div class="signature-space"></div>
            <div class="signature-line"></div>
            <div class="signature-label">Representative Signature</div>
            ${sellerName ? `<div class="signature-name">(${sellerName})</div>` : ''}
          </div>
          <div class="signature-box">
            <div class="signature-space"></div>
            <div class="signature-line"></div>
            <div class="signature-label">Prepared By</div>
          </div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
          <div class="footer-title">Thank you!</div>
          <div class="footer-text">
            Thank you for your business with Gazi Laboratories Ltd.
          </div>
          <div class="footer-contact">
            Email: gazilaboratories58@gmail.com | Phone: +880 1987-501700
          </div>
        </div>
      </div>
      
      <div class="print-actions">
        <button class="print-btn" onclick="window.print()">🖨️ Print Invoice</button>
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
