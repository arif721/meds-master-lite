// Payment Receipt Generation Utilities

import { Payment } from '@/types';
import { formatCurrency, formatDate } from './format';

// Generate Receipt Number
export function generateReceiptNumber(paymentId: string): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const suffix = paymentId.slice(-4).toUpperCase();
  return `REC-${year}${month}${day}-${suffix}`;
}

interface ReceiptData {
  payment: Payment;
  customerName: string;
  invoiceNumber: string;
  receivedBy?: string;
}

export function generateReceiptHTML(data: ReceiptData): string {
  const { payment, customerName, invoiceNumber, receivedBy = 'Admin' } = data;
  const receiptNumber = generateReceiptNumber(payment.id);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Payment Receipt ${receiptNumber}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Segoe UI', Arial, sans-serif; 
          background: #f0f4f8; 
          padding: 20px;
          min-height: 100vh;
        }
        .receipt-container {
          max-width: 500px;
          margin: 0 auto;
          background: white;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
          border-radius: 8px;
          overflow: hidden;
        }
        .top-bar {
          height: 8px;
          background: linear-gradient(90deg, #1e3a5f, #2d5a87);
        }
        .header {
          padding: 25px;
          text-align: center;
          border-bottom: 2px dashed #e2e8f0;
        }
        .logo-section {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 12px;
          margin-bottom: 15px;
        }
        .logo-section img {
          width: 50px;
          height: 50px;
        }
        .company-name {
          font-weight: bold;
          color: #1e3a5f;
          font-size: 18px;
        }
        .receipt-title {
          font-size: 24px;
          font-weight: bold;
          color: #1e3a5f;
          margin-bottom: 8px;
        }
        .receipt-number {
          font-size: 13px;
          color: #64748b;
        }
        .status-badge {
          display: inline-block;
          margin-top: 10px;
          padding: 6px 16px;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .content {
          padding: 25px;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid #f1f5f9;
          font-size: 14px;
        }
        .info-row:last-child {
          border-bottom: none;
        }
        .info-label {
          color: #64748b;
        }
        .info-value {
          color: #1e293b;
          font-weight: 500;
          text-align: right;
        }
        .amount-section {
          background: linear-gradient(135deg, #f8fafc, #f1f5f9);
          padding: 20px;
          margin: 20px 0;
          border-radius: 8px;
          text-align: center;
        }
        .amount-label {
          font-size: 13px;
          color: #64748b;
          margin-bottom: 5px;
        }
        .amount-value {
          font-size: 32px;
          font-weight: bold;
          color: #10b981;
        }
        .method-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          background: #e0f2fe;
          color: #0369a1;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
        }
        .footer {
          padding: 20px 25px;
          background: #f8fafc;
          text-align: center;
          border-top: 2px dashed #e2e8f0;
        }
        .footer-text {
          font-size: 12px;
          color: #64748b;
          line-height: 1.6;
        }
        .footer-company {
          font-weight: 600;
          color: #1e3a5f;
          margin-top: 8px;
        }
        .print-btn, .download-btn {
          display: inline-block;
          margin: 10px 5px;
          padding: 12px 25px;
          background: #1e3a5f;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
        }
        .print-btn:hover, .download-btn:hover {
          background: #2d4a6f;
        }
        .actions {
          text-align: center;
          padding: 20px;
        }
        @media print { 
          body { background: white; padding: 0; }
          .actions { display: none; }
          .receipt-container { box-shadow: none; }
        }
      </style>
    </head>
    <body>
      <div class="receipt-container">
        <div class="top-bar"></div>
        
        <div class="header">
          <div class="logo-section">
            <img src="/favicon.svg" alt="Gazi Laboratories" />
            <span class="company-name">GAZI LABORATORIES LTD.</span>
          </div>
          <div class="receipt-title">Payment Receipt</div>
          <div class="receipt-number">${receiptNumber}</div>
          <div class="status-badge">✓ Payment Confirmed</div>
        </div>
        
        <div class="content">
          <div class="info-row">
            <span class="info-label">Receipt Date</span>
            <span class="info-value">${formatDate(payment.date)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Customer Name</span>
            <span class="info-value">${customerName}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Invoice Number</span>
            <span class="info-value">${invoiceNumber}</span>
          </div>
          
          <div class="amount-section">
            <div class="amount-label">Amount Paid</div>
            <div class="amount-value">${formatCurrency(payment.amount)}</div>
          </div>
          
          <div class="info-row">
            <span class="info-label">Payment Method</span>
            <span class="info-value">
              <span class="method-badge">${payment.paymentMethod}</span>
            </span>
          </div>
          ${payment.referenceNote ? `
          <div class="info-row">
            <span class="info-label">Transaction Ref / TrxID</span>
            <span class="info-value">${payment.referenceNote}</span>
          </div>
          ` : ''}
          <div class="info-row">
            <span class="info-label">Received By</span>
            <span class="info-value">${receivedBy}</span>
          </div>
        </div>
        
        <div class="footer">
          <div class="footer-text">
            Thank you for your payment!<br>
            For queries: gazilaboratories58@gmail.com | +880 1987-501700
          </div>
          <div class="footer-company">
            Mamtaj Center, Islamiahat, Hathazari, Chattogram
          </div>
        </div>
      </div>
      
      <div class="actions">
        <button class="print-btn" onclick="window.print()">🖨️ Print Receipt</button>
      </div>
    </body>
    </html>
  `;
}

export function openReceiptWindow(data: ReceiptData): void {
  const html = generateReceiptHTML(data);
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}
