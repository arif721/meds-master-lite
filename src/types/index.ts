// Core data models for Pharma Inventory & Sales Management

export type ProductCategory = {
  id: string;
  name: string;
};

// Product unit types
export type ProductUnit = 'Pcs' | 'Bottle' | 'Strip' | 'Tube' | 'Vial';

// Categories that require batch/expiry tracking
export const BATCH_REQUIRED_CATEGORIES = ['Tablet', 'Capsule', 'Syrup', 'Drop', 'Ointment', 'Injection'];
export const NO_BATCH_CATEGORIES = ['Device'];

export type Product = {
  id: string;
  name: string;
  categoryId: string;
  unit: ProductUnit;
  salesPrice: number;
  costPrice: number;
  sku?: string;
  barcode?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type BatchLot = {
  id: string;
  productId: string;
  lotNumber: string;
  expiryDate: Date;
  unitCost: number;
  quantity: number;
  createdAt: Date;
};

export type StockLedgerType = 'OPENING' | 'SALE' | 'RETURN' | 'DAMAGE' | 'ADJUSTMENT';

export type StockLedger = {
  id: string;
  date: Date;
  type: StockLedgerType;
  productId: string;
  batchLotId: string;
  quantityIn: number;
  quantityOut: number;
  unitCost: number;
  reference?: string;
  createdBy: string;
};

// Commission type for sellers
export type CommissionType = 'FIXED' | 'PERCENTAGE';

// Seller type
export type Seller = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  area?: string; // Assigned territory/route
  commissionType: CommissionType;
  commissionRate: number; // Fixed amount or percentage
  active: boolean;
  createdAt: Date;
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
  address?: string;
  createdAt: Date;
};

export type InvoiceStatus = 'DRAFT' | 'CONFIRMED';

export type SalesInvoice = {
  id: string;
  invoiceNumber: string;
  date: Date;
  customerId: string;
  sellerId?: string;
  storeId?: string;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  status: InvoiceStatus;
  lines: SalesInvoiceLine[];
  createdAt: Date;
};

export type SalesInvoiceLine = {
  id: string;
  invoiceId: string;
  productId: string;
  batchLotId: string;
  quantity: number; // Paid quantity
  freeQuantity: number; // Free promotional quantity (default 0)
  unitPrice: number;
  lineTotal: number; // Paid Quantity × Unit Price (free items excluded)
};

// Return action type
export type ReturnAction = 'RESTOCK' | 'SCRAP';

export type PaymentMethod = 'Cash' | 'Bank' | 'bKash' | 'Nagad';

export type Payment = {
  id: string;
  invoiceId: string;
  customerId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  referenceNote?: string;
  date: Date;
};

// Quotation types
export type QuotationStatus = 'PENDING' | 'CONVERTED' | 'CANCELLED';

export type Quotation = {
  id: string;
  quotationNumber: string;
  date: Date;
  validUntil: Date;
  customerId: string;
  totalAmount: number;
  status: QuotationStatus;
  lines: QuotationLine[];
  convertedInvoiceId?: string;
  createdAt: Date;
};

export type QuotationLine = {
  id: string;
  quotationId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

// Stock Adjustment types
export type AdjustmentType = 'RETURN' | 'DAMAGE' | 'EXPIRED' | 'ADJUSTMENT';

export type StockAdjustment = {
  id: string;
  date: Date;
  type: AdjustmentType;
  productId: string;
  batchLotId: string;
  quantity: number;
  reason: string;
  invoiceId?: string; // For returns linked to invoice
  returnAction?: ReturnAction; // For returns: RESTOCK or SCRAP
  returnValue?: number; // Value of returned items
  createdBy: string;
  createdAt: Date;
};

// Audit Log types
export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'CONFIRM' | 'CANCEL' | 'CONVERT';

export type AuditEntityType = 
  | 'PRODUCT' 
  | 'CATEGORY' 
  | 'BATCH' 
  | 'CUSTOMER' 
  | 'INVOICE' 
  | 'PAYMENT' 
  | 'QUOTATION' 
  | 'ADJUSTMENT';

export type AuditLog = {
  id: string;
  timestamp: Date;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  entityName: string;
  userId: string;
  userName: string;
  details: string;
  oldValue?: string;
  newValue?: string;
};

// Dashboard metrics
export type DashboardMetrics = {
  totalInventoryValue: number;
  totalStockQuantity: number;
  todaySales: number;
  monthSales: number;
  yearSales: number;
  totalDue: number;
  lowStockCount: number;
  nearExpiryCount: number;
};
