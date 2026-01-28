// Return Receipt Generator

import { formatCurrency, formatDate, generateId } from './format';

interface ReturnReceiptData {
  returnId: string;
  date: Date;
  invoiceNumber: string;
  customerName: string;
  productName: string;
  batchLotNumber: string;
  quantity: number;
  unitPrice: number;
  returnValue: number;
  reason: string;
  returnAction: 'RESTOCK' | 'SCRAP';
}

export function generateReturnReceiptNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `RET-${year}${month}${day}-${random}`;
}

export function generateReturnReceiptHTML(data: ReturnReceiptData): string {
  const receiptNumber = generateReturnReceiptNumber();
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Return Receipt ${receiptNumber}</title>
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
        .receipt-container {
          max-width: 210mm;
          margin: 0 auto;
          background: white;
          box-shadow: 0 4px 25px rgba(0,0,0,0.12);
          position: relative;
        }
        
        .top-bar {
          height: 8px;
          background: linear-gradient(90deg, #dc2626 0%, #ef4444 100%);
        }
        
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
        .receipt-title {
          font-size: 32px;
          font-weight: 700;
          color: #dc2626;
          letter-spacing: -0.5px;
          margin-bottom: 12px;
        }
        .receipt-meta {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .receipt-meta-row {
          display: flex;
          gap: 8px;
          font-size: 13px;
        }
        .receipt-meta-label {
          color: #64748b;
          min-width: 120px;
        }
        .receipt-meta-value {
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
        
        .info-section {
          padding: 25px 40px;
        }
        .info-header {
          display: inline-block;
          background: #dc2626;
          color: white;
          padding: 6px 16px;
          font-weight: 600;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 15px;
          border-radius: 2px;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid #f1f5f9;
        }
        .info-label {
          color: #64748b;
          font-size: 13px;
        }
        .info-value {
          color: #1e293b;
          font-weight: 600;
          font-size: 13px;
          text-align: right;
        }
        .info-value.highlight {
          color: #dc2626;
          font-size: 16px;
        }
        
        .status-badge {
          display: inline-block;
          padding: 8px 20px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 14px;
          text-transform: uppercase;
        }
        .status-restock {
          background: #dcfce7;
          color: #166534;
        }
        .status-scrap {
          background: #fef3c7;
          color: #92400e;
        }
        
        .summary-box {
          margin: 0 40px 25px;
          background: #fef2f2;
          border: 2px solid #dc2626;
          border-radius: 8px;
          padding: 20px;
          text-align: center;
        }
        .summary-label {
          font-size: 12px;
          color: #64748b;
          margin-bottom: 5px;
        }
        .summary-value {
          font-size: 28px;
          font-weight: 700;
          color: #dc2626;
        }
        
        .signatures-section {
          display: flex;
          justify-content: space-between;
          padding: 30px 40px 20px;
          gap: 30px;
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
        
        .footer {
          background: #fee2e2;
          padding: 25px 40px;
        }
        .footer-title {
          font-size: 18px;
          font-weight: 700;
          color: #dc2626;
          margin-bottom: 8px;
        }
        .footer-text {
          font-size: 12px;
          color: #475569;
        }
        
        .print-actions {
          text-align: center;
          padding: 20px;
        }
        .print-btn {
          display: inline-block;
          padding: 12px 30px;
          background: #dc2626;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
        }
        .print-btn:hover {
          background: #b91c1c;
        }
        
        @media print { 
          body { 
            background: white; 
            padding: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-actions { display: none; }
          .receipt-container { 
            box-shadow: none;
            max-width: 100%;
          }
        }
      </style>
    </head>
    <body>
      <div class="receipt-container">
        <div class="top-bar"></div>
        
        <div class="header">
          <div class="header-left">
            <div class="receipt-title">Return Receipt</div>
            <div class="receipt-meta">
              <div class="receipt-meta-row">
                <span class="receipt-meta-label">Receipt No:</span>
                <span class="receipt-meta-value">${receiptNumber}</span>
              </div>
              <div class="receipt-meta-row">
                <span class="receipt-meta-label">Return Date:</span>
                <span class="receipt-meta-value">${formatDate(data.date)}</span>
              </div>
              <div class="receipt-meta-row">
                <span class="receipt-meta-label">Original Invoice:</span>
                <span class="receipt-meta-value">${data.invoiceNumber}</span>
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
        
        <div class="info-section">
          <div class="info-header">Return Details</div>
          <div class="info-grid">
            <div>
              <div class="info-row">
                <span class="info-label">Customer</span>
                <span class="info-value">${data.customerName}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Product</span>
                <span class="info-value">${data.productName}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Batch/Lot</span>
                <span class="info-value">${data.batchLotNumber}</span>
              </div>
            </div>
            <div>
              <div class="info-row">
                <span class="info-label">Quantity Returned</span>
                <span class="info-value highlight">${data.quantity}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Unit Price</span>
                <span class="info-value">${formatCurrency(data.unitPrice)}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Return Action</span>
                <span class="info-value">
                  <span class="status-badge ${data.returnAction === 'RESTOCK' ? 'status-restock' : 'status-scrap'}">
                    ${data.returnAction}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="info-section">
          <div class="info-header">Reason</div>
          <p style="color: #475569; padding: 10px 0;">${data.reason}</p>
        </div>
        
        <div class="summary-box">
          <div class="summary-label">Credit Amount</div>
          <div class="summary-value">${formatCurrency(data.returnValue)}</div>
        </div>
        
        <div class="signatures-section">
          <div class="signature-box">
            <div class="signature-space"></div>
            <div class="signature-line"></div>
            <div class="signature-label">Customer Signature</div>
          </div>
          <div class="signature-box">
            <div class="signature-space"></div>
            <div class="signature-line"></div>
            <div class="signature-label">Received By</div>
          </div>
          <div class="signature-box">
            <div class="signature-space"></div>
            <div class="signature-line"></div>
            <div class="signature-label">Authorized By</div>
          </div>
        </div>
        
        <div class="footer">
          <div class="footer-title">Return Processed</div>
          <div class="footer-text">
            This return has been processed. Customer account has been credited with the above amount.
          </div>
        </div>
      </div>
      
      <div class="print-actions">
        <button class="print-btn" onclick="window.print()">🖨️ Print Receipt</button>
      </div>
    </body>
    </html>
  `;
}

export function openReturnReceiptWindow(data: ReturnReceiptData): void {
  const html = generateReturnReceiptHTML(data);
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}
