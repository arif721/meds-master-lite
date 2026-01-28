import { ProductCategory, Product, BatchLot, Customer, SalesInvoice, Payment, StockLedger, Seller } from '@/types';

// Sellers - Demo
export const sellers: Seller[] = [
  { id: 'seller-1', name: 'রহিম উদ্দিন', phone: '01711-111111', area: 'হাটহাজারী', commissionType: 'PERCENTAGE', commissionRate: 5, active: true, createdAt: new Date() },
  { id: 'seller-2', name: 'করিম হোসেন', phone: '01722-222222', area: 'রাউজান', commissionType: 'PERCENTAGE', commissionRate: 5, active: true, createdAt: new Date() },
  { id: 'seller-3', name: 'জামাল আহমেদ', phone: '01733-333333', area: 'পটিয়া', commissionType: 'FIXED', commissionRate: 100, active: true, createdAt: new Date() },
];

// Product Categories - Keep basic categories as they are system defaults
export const categories: ProductCategory[] = [
  { id: 'cat-1', name: 'Tablet' },
  { id: 'cat-2', name: 'Capsule' },
  { id: 'cat-3', name: 'Syrup' },
  { id: 'cat-4', name: 'Drop' },
  { id: 'cat-5', name: 'Ointment' },
  { id: 'cat-6', name: 'Injection' },
  { id: 'cat-7', name: 'Device' },
];

// Products - Demo pharmaceutical products
export const products: Product[] = [
  { id: 'prod-1', name: 'G-Astakof Syrup 100ml', categoryId: 'cat-3', unit: 'Bottle', costPrice: 60, salesPrice: 80, sku: 'SYR-ASTAKOF-100', active: true, createdAt: new Date(), updatedAt: new Date() },
  { id: 'prod-2', name: 'G-Astakof Syrup 200ml', categoryId: 'cat-3', unit: 'Bottle', costPrice: 110, salesPrice: 140, sku: 'SYR-ASTAKOF-200', active: true, createdAt: new Date(), updatedAt: new Date() },
  { id: 'prod-3', name: 'G-Karmo Syrup 100ml', categoryId: 'cat-3', unit: 'Bottle', costPrice: 55, salesPrice: 70, sku: 'SYR-KARMO-100', active: true, createdAt: new Date(), updatedAt: new Date() },
  { id: 'prod-4', name: 'G-Karmo Syrup 200ml', categoryId: 'cat-3', unit: 'Bottle', costPrice: 95, salesPrice: 120, sku: 'SYR-KARMO-200', active: true, createdAt: new Date(), updatedAt: new Date() },
  { id: 'prod-5', name: 'G-Karmo Syrup 450ml', categoryId: 'cat-3', unit: 'Bottle', costPrice: 145, salesPrice: 180, sku: 'SYR-KARMO-450', active: true, createdAt: new Date(), updatedAt: new Date() },
  { id: 'prod-6', name: 'G-Eritoseb Syrup 200ml', categoryId: 'cat-3', unit: 'Bottle', costPrice: 80, salesPrice: 100, sku: 'SYR-ERITOSEB-200', active: true, createdAt: new Date(), updatedAt: new Date() },
  { id: 'prod-7', name: 'G-Eritoseb Syrup 450ml', categoryId: 'cat-3', unit: 'Bottle', costPrice: 145, salesPrice: 180, sku: 'SYR-ERITOSEB-450', active: true, createdAt: new Date(), updatedAt: new Date() },
  { id: 'prod-8', name: 'G-Livit Syrup 100ml', categoryId: 'cat-3', unit: 'Bottle', costPrice: 65, salesPrice: 80, sku: 'SYR-LIVIT-100', active: true, createdAt: new Date(), updatedAt: new Date() },
  { id: 'prod-9', name: 'G-Livit Syrup 200ml', categoryId: 'cat-3', unit: 'Bottle', costPrice: 95, salesPrice: 120, sku: 'SYR-LIVIT-200', active: true, createdAt: new Date(), updatedAt: new Date() },
  { id: 'prod-10', name: 'G-Livit Syrup 450ml', categoryId: 'cat-3', unit: 'Bottle', costPrice: 150, salesPrice: 190, sku: 'SYR-LIVIT-450', active: true, createdAt: new Date(), updatedAt: new Date() },
  { id: 'prod-11', name: 'G-Doshmul Syrup 200ml', categoryId: 'cat-3', unit: 'Bottle', costPrice: 145, salesPrice: 180, sku: 'SYR-DOSHMUL-200', active: true, createdAt: new Date(), updatedAt: new Date() },
  { id: 'prod-12', name: 'G-Doshmul Syrup 450ml', categoryId: 'cat-3', unit: 'Bottle', costPrice: 280, salesPrice: 350, sku: 'SYR-DOSHMUL-450', active: true, createdAt: new Date(), updatedAt: new Date() },
  { id: 'prod-13', name: 'G-Seb Syrup 100ml', categoryId: 'cat-3', unit: 'Bottle', costPrice: 65, salesPrice: 80, sku: 'SYR-SEB-100', active: true, createdAt: new Date(), updatedAt: new Date() },
  { id: 'prod-14', name: 'G-Seb Syrup 450ml', categoryId: 'cat-3', unit: 'Bottle', costPrice: 220, salesPrice: 280, sku: 'SYR-SEB-450', active: true, createdAt: new Date(), updatedAt: new Date() },
  { id: 'prod-15', name: 'G-Vit Syrup 450ml', categoryId: 'cat-3', unit: 'Bottle', costPrice: 280, salesPrice: 350, sku: 'SYR-VIT-450', active: true, createdAt: new Date(), updatedAt: new Date() },
  { id: 'prod-16', name: 'Minasin Syrup 100ml', categoryId: 'cat-3', unit: 'Bottle', costPrice: 65, salesPrice: 80, sku: 'SYR-MINASIN-100', active: true, createdAt: new Date(), updatedAt: new Date() },
  { id: 'prod-17', name: 'G-Dicitra Syrup 100ml', categoryId: 'cat-3', unit: 'Bottle', costPrice: 55, salesPrice: 70, sku: 'SYR-DICITRA-100', active: true, createdAt: new Date(), updatedAt: new Date() },
  { id: 'prod-18', name: 'G-Dicitra Syrup 200ml', categoryId: 'cat-3', unit: 'Bottle', costPrice: 90, salesPrice: 110, sku: 'SYR-DICITRA-200', active: true, createdAt: new Date(), updatedAt: new Date() },
  { id: 'prod-19', name: 'G-Dicitra Syrup 450ml', categoryId: 'cat-3', unit: 'Bottle', costPrice: 145, salesPrice: 180, sku: 'SYR-DICITRA-450', active: true, createdAt: new Date(), updatedAt: new Date() },
  { id: 'prod-20', name: 'G-Panax Syrup 100ml', categoryId: 'cat-3', unit: 'Bottle', costPrice: 72, salesPrice: 90, sku: 'SYR-PANAX-100', active: true, createdAt: new Date(), updatedAt: new Date() },
  { id: 'prod-21', name: 'G-Panax Syrup 200ml', categoryId: 'cat-3', unit: 'Bottle', costPrice: 150, salesPrice: 190, sku: 'SYR-PANAX-200', active: true, createdAt: new Date(), updatedAt: new Date() },
  { id: 'prod-22', name: 'G-Panax Syrup 450ml', categoryId: 'cat-3', unit: 'Bottle', costPrice: 280, salesPrice: 350, sku: 'SYR-PANAX-450', active: true, createdAt: new Date(), updatedAt: new Date() },
  { id: 'prod-23', name: 'Calcin Capsule 30pcs', categoryId: 'cat-2', unit: 'Pcs', costPrice: 280, salesPrice: 350, sku: 'CAP-CALCIN-30', active: true, createdAt: new Date(), updatedAt: new Date() },
  { id: 'prod-24', name: 'G-Cap Gastrinal Capsule 100pcs', categoryId: 'cat-2', unit: 'Pcs', costPrice: 600, salesPrice: 750, sku: 'CAP-GASTRINAL-100', active: true, createdAt: new Date(), updatedAt: new Date() },
  { id: 'prod-25', name: 'G-Craz Capsule 30pcs', categoryId: 'cat-2', unit: 'Pcs', costPrice: 360, salesPrice: 450, sku: 'CAP-CRAZ-30', active: true, createdAt: new Date(), updatedAt: new Date() },
  { id: 'prod-26', name: 'Telejamati Solid 100g', categoryId: 'cat-5', unit: 'Tube', costPrice: 520, salesPrice: 650, sku: 'SLD-TELEJAMATI-100', active: true, createdAt: new Date(), updatedAt: new Date() },
  { id: 'prod-27', name: 'Telejamati Solid 200g', categoryId: 'cat-5', unit: 'Tube', costPrice: 1080, salesPrice: 1350, sku: 'SLD-TELEJAMATI-200', active: true, createdAt: new Date(), updatedAt: new Date() },
  { id: 'prod-28', name: 'Power Plus Solid 100g', categoryId: 'cat-5', unit: 'Tube', costPrice: 480, salesPrice: 600, sku: 'SLD-POWERPLUS-100', active: true, createdAt: new Date(), updatedAt: new Date() },
  { id: 'prod-29', name: 'Power Plus Solid 200g', categoryId: 'cat-5', unit: 'Tube', costPrice: 1040, salesPrice: 1300, sku: 'SLD-POWERPLUS-200', active: true, createdAt: new Date(), updatedAt: new Date() },
  { id: 'prod-30', name: 'Arde Khorma Solid 100g', categoryId: 'cat-5', unit: 'Tube', costPrice: 175, salesPrice: 220, sku: 'SLD-KHORMA-100', active: true, createdAt: new Date(), updatedAt: new Date() },
  { id: 'prod-31', name: 'G-Alkushi Powder 100g', categoryId: 'cat-5', unit: 'Tube', costPrice: 175, salesPrice: 220, sku: 'PWD-ALKUSHI-100', active: true, createdAt: new Date(), updatedAt: new Date() },
  { id: 'prod-32', name: 'G-Ashwagandha Powder 100g', categoryId: 'cat-5', unit: 'Tube', costPrice: 240, salesPrice: 300, sku: 'PWD-ASHWAGANDHA-100', active: true, createdAt: new Date(), updatedAt: new Date() },
  { id: 'prod-33', name: 'G-Hemotox Capsule 30pcs', categoryId: 'cat-2', unit: 'Pcs', costPrice: 175, salesPrice: 220, sku: 'CAP-HEMOTOX-30', active: true, createdAt: new Date(), updatedAt: new Date() },
  { id: 'prod-34', name: 'G-Ashavit Capsule 30pcs', categoryId: 'cat-2', unit: 'Pcs', costPrice: 145, salesPrice: 180, sku: 'CAP-ASHAVIT-30', active: true, createdAt: new Date(), updatedAt: new Date() },
  { id: 'prod-35', name: 'Senior A to Z Capsule 30pcs', categoryId: 'cat-2', unit: 'Pcs', costPrice: 255, salesPrice: 320, sku: 'CAP-SENIORATOZ-30', active: true, createdAt: new Date(), updatedAt: new Date() },
  { id: 'prod-36', name: 'Hot 20 Capsule 9pcs', categoryId: 'cat-2', unit: 'Pcs', costPrice: 360, salesPrice: 450, sku: 'CAP-HOT20-9', active: true, createdAt: new Date(), updatedAt: new Date() },
  { id: 'prod-37', name: 'Glucose D Powder 100g', categoryId: 'cat-5', unit: 'Tube', costPrice: 48, salesPrice: 60, sku: 'PWD-GLUCOSE-100', active: true, createdAt: new Date(), updatedAt: new Date() },
  { id: 'prod-38', name: 'Glucose D Powder 200g', categoryId: 'cat-5', unit: 'Tube', costPrice: 68, salesPrice: 85, sku: 'PWD-GLUCOSE-200', active: true, createdAt: new Date(), updatedAt: new Date() },
  { id: 'prod-39', name: 'G-Arjun Powder 50g', categoryId: 'cat-5', unit: 'Tube', costPrice: 160, salesPrice: 200, sku: 'PWD-ARJUN-50', active: true, createdAt: new Date(), updatedAt: new Date() },
  { id: 'prod-40', name: 'G-Fabigul Powder 30g', categoryId: 'cat-5', unit: 'Tube', costPrice: 60, salesPrice: 75, sku: 'PWD-FABIGUL-30', active: true, createdAt: new Date(), updatedAt: new Date() },
  { id: 'prod-41', name: 'G-Fabigul Powder 100g', categoryId: 'cat-5', unit: 'Tube', costPrice: 240, salesPrice: 300, sku: 'PWD-FABIGUL-100', active: true, createdAt: new Date(), updatedAt: new Date() },
  { id: 'prod-42', name: 'G-Honey 100g', categoryId: 'cat-5', unit: 'Bottle', costPrice: 96, salesPrice: 120, sku: 'HNY-GHONEY-100', active: true, createdAt: new Date(), updatedAt: new Date() },
  { id: 'prod-43', name: 'G-Honey 200g', categoryId: 'cat-5', unit: 'Bottle', costPrice: 200, salesPrice: 250, sku: 'HNY-GHONEY-200', active: true, createdAt: new Date(), updatedAt: new Date() },
  { id: 'prod-44', name: 'G-Honey 450g', categoryId: 'cat-5', unit: 'Bottle', costPrice: 480, salesPrice: 600, sku: 'HNY-GHONEY-450', active: true, createdAt: new Date(), updatedAt: new Date() },
];

// Demo Batches with expiry dates
const futureDate = (months: number) => {
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  return date;
};

export const batches: BatchLot[] = [
  { id: 'batch-1', productId: 'prod-1', lotNumber: 'LOT-2024-001', expiryDate: futureDate(18), quantity: 100, unitCost: 60, createdAt: new Date() },
  { id: 'batch-2', productId: 'prod-2', lotNumber: 'LOT-2024-002', expiryDate: futureDate(24), quantity: 80, unitCost: 110, createdAt: new Date() },
  { id: 'batch-3', productId: 'prod-3', lotNumber: 'LOT-2024-003', expiryDate: futureDate(12), quantity: 120, unitCost: 55, createdAt: new Date() },
  { id: 'batch-4', productId: 'prod-4', lotNumber: 'LOT-2024-004', expiryDate: futureDate(6), quantity: 50, unitCost: 95, createdAt: new Date() },
  { id: 'batch-5', productId: 'prod-5', lotNumber: 'LOT-2024-005', expiryDate: futureDate(15), quantity: 60, unitCost: 145, createdAt: new Date() },
  { id: 'batch-6', productId: 'prod-8', lotNumber: 'LOT-2024-006', expiryDate: futureDate(20), quantity: 90, unitCost: 65, createdAt: new Date() },
  { id: 'batch-7', productId: 'prod-10', lotNumber: 'LOT-2024-007', expiryDate: futureDate(3), quantity: 40, unitCost: 150, createdAt: new Date() },
  { id: 'batch-8', productId: 'prod-15', lotNumber: 'LOT-2024-008', expiryDate: futureDate(1), quantity: 30, unitCost: 280, createdAt: new Date() },
  { id: 'batch-9', productId: 'prod-23', lotNumber: 'LOT-2024-009', expiryDate: futureDate(24), quantity: 200, unitCost: 280, createdAt: new Date() },
  { id: 'batch-10', productId: 'prod-24', lotNumber: 'LOT-2024-010', expiryDate: futureDate(18), quantity: 150, unitCost: 600, createdAt: new Date() },
  { id: 'batch-11', productId: 'prod-26', lotNumber: 'LOT-2024-011', expiryDate: futureDate(36), quantity: 25, unitCost: 520, createdAt: new Date() },
  { id: 'batch-12', productId: 'prod-42', lotNumber: 'LOT-2024-012', expiryDate: futureDate(24), quantity: 100, unitCost: 96, createdAt: new Date() },
];

// Customers - Demo
export const customers: Customer[] = [
  { id: 'cust-1', name: 'আল-আমিন ফার্মেসি', phone: '01811-111111', address: 'হাটহাজারী বাজার, চট্টগ্রাম', createdAt: new Date() },
  { id: 'cust-2', name: 'সুস্থ জীবন ফার্মেসি', phone: '01822-222222', address: 'রাউজান বাজার, চট্টগ্রাম', createdAt: new Date() },
  { id: 'cust-3', name: 'আরোগ্য মেডিকেল হল', phone: '01833-333333', address: 'পটিয়া, চট্টগ্রাম', createdAt: new Date() },
  { id: 'cust-4', name: 'নিউ লাইফ ফার্মেসি', phone: '01844-444444', address: 'ফটিকছড়ি, চট্টগ্রাম', createdAt: new Date() },
  { id: 'cust-5', name: 'গ্রিন মেডিকেল স্টোর', phone: '01855-555555', address: 'সীতাকুণ্ড, চট্টগ্রাম', createdAt: new Date() },
];

// Sales Invoices - Demo
export const invoices: SalesInvoice[] = [
  {
    id: 'inv-1',
    invoiceNumber: 'INV-2024-0001',
    date: new Date(),
    customerId: 'cust-1',
    sellerId: 'seller-1',
    totalAmount: 1600,
    paidAmount: 1000,
    dueAmount: 600,
    status: 'CONFIRMED',
    lines: [
      { id: 'line-1', invoiceId: 'inv-1', productId: 'prod-1', batchLotId: 'batch-1', quantity: 10, freeQuantity: 0, unitPrice: 80, lineTotal: 800 },
      { id: 'line-2', invoiceId: 'inv-1', productId: 'prod-3', batchLotId: 'batch-3', quantity: 10, freeQuantity: 2, unitPrice: 80, lineTotal: 800 },
    ],
    createdAt: new Date(),
  },
  {
    id: 'inv-2',
    invoiceNumber: 'INV-2024-0002',
    date: new Date(),
    customerId: 'cust-2',
    sellerId: 'seller-2',
    totalAmount: 2400,
    paidAmount: 2400,
    dueAmount: 0,
    status: 'CONFIRMED',
    lines: [
      { id: 'line-3', invoiceId: 'inv-2', productId: 'prod-23', batchLotId: 'batch-9', quantity: 5, freeQuantity: 0, unitPrice: 350, lineTotal: 1750 },
      { id: 'line-4', invoiceId: 'inv-2', productId: 'prod-42', batchLotId: 'batch-12', quantity: 5, freeQuantity: 1, unitPrice: 130, lineTotal: 650 },
    ],
    createdAt: new Date(),
  },
];

// Payments - Demo
export const payments: Payment[] = [
  { id: 'pay-1', invoiceId: 'inv-1', customerId: 'cust-1', amount: 1000, paymentMethod: 'Cash', date: new Date() },
  { id: 'pay-2', invoiceId: 'inv-2', customerId: 'cust-2', amount: 2400, paymentMethod: 'bKash', referenceNote: 'TRX-123456', date: new Date() },
];

// Stock Ledger entries - Demo opening stock
export const stockLedger: StockLedger[] = [
  { id: 'sl-1', date: new Date(), type: 'OPENING', productId: 'prod-1', batchLotId: 'batch-1', quantityIn: 100, quantityOut: 0, unitCost: 60, createdBy: 'Admin' },
  { id: 'sl-2', date: new Date(), type: 'OPENING', productId: 'prod-2', batchLotId: 'batch-2', quantityIn: 80, quantityOut: 0, unitCost: 110, createdBy: 'Admin' },
  { id: 'sl-3', date: new Date(), type: 'OPENING', productId: 'prod-3', batchLotId: 'batch-3', quantityIn: 120, quantityOut: 0, unitCost: 55, createdBy: 'Admin' },
  { id: 'sl-4', date: new Date(), type: 'OPENING', productId: 'prod-4', batchLotId: 'batch-4', quantityIn: 50, quantityOut: 0, unitCost: 95, createdBy: 'Admin' },
  { id: 'sl-5', date: new Date(), type: 'OPENING', productId: 'prod-5', batchLotId: 'batch-5', quantityIn: 60, quantityOut: 0, unitCost: 145, createdBy: 'Admin' },
  { id: 'sl-6', date: new Date(), type: 'OPENING', productId: 'prod-8', batchLotId: 'batch-6', quantityIn: 90, quantityOut: 0, unitCost: 65, createdBy: 'Admin' },
  { id: 'sl-7', date: new Date(), type: 'OPENING', productId: 'prod-10', batchLotId: 'batch-7', quantityIn: 40, quantityOut: 0, unitCost: 150, createdBy: 'Admin' },
  { id: 'sl-8', date: new Date(), type: 'OPENING', productId: 'prod-15', batchLotId: 'batch-8', quantityIn: 30, quantityOut: 0, unitCost: 280, createdBy: 'Admin' },
  { id: 'sl-9', date: new Date(), type: 'OPENING', productId: 'prod-23', batchLotId: 'batch-9', quantityIn: 200, quantityOut: 0, unitCost: 280, createdBy: 'Admin' },
  { id: 'sl-10', date: new Date(), type: 'OPENING', productId: 'prod-24', batchLotId: 'batch-10', quantityIn: 150, quantityOut: 0, unitCost: 600, createdBy: 'Admin' },
  { id: 'sl-11', date: new Date(), type: 'OPENING', productId: 'prod-26', batchLotId: 'batch-11', quantityIn: 25, quantityOut: 0, unitCost: 520, createdBy: 'Admin' },
  { id: 'sl-12', date: new Date(), type: 'OPENING', productId: 'prod-42', batchLotId: 'batch-12', quantityIn: 100, quantityOut: 0, unitCost: 96, createdBy: 'Admin' },
];
