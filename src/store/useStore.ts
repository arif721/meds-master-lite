import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product, ProductCategory, BatchLot, Customer, SalesInvoice, Payment, StockLedger, Quotation, StockAdjustment, SalesInvoiceLine, AuditLog, AuditAction, AuditEntityType, Seller } from '@/types';
import { categories as initialCategories, products as initialProducts, batches as initialBatches, customers as initialCustomers, invoices as initialInvoices, payments as initialPayments, stockLedger as initialStockLedger, sellers as initialSellers } from '@/data/mockData';
import { generateId, generateInvoiceNumber, generateQuotationNumber } from '@/lib/format';

interface AppState {
  // Data
  categories: ProductCategory[];
  products: Product[];
  batches: BatchLot[];
  customers: Customer[];
  sellers: Seller[];
  invoices: SalesInvoice[];
  payments: Payment[];
  stockLedger: StockLedger[];
  quotations: Quotation[];
  stockAdjustments: StockAdjustment[];
  auditLogs: AuditLog[];

  // Audit Log action
  addAuditLog: (log: Omit<AuditLog, 'id' | 'timestamp' | 'userId' | 'userName'>) => void;

  // Product actions
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;

  // Category actions
  addCategory: (name: string) => void;

  // Batch actions
  addBatch: (batch: Omit<BatchLot, 'id' | 'createdAt'>) => void;
  updateBatch: (id: string, batch: Partial<BatchLot>) => void;
  updateBatchQuantity: (id: string, quantity: number) => void;
  deleteBatch: (id: string) => void;

  // Customer actions
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt'>) => void;
  updateCustomer: (id: string, customer: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;

  // Seller actions
  addSeller: (seller: Omit<Seller, 'id' | 'createdAt'>) => void;
  updateSeller: (id: string, seller: Partial<Seller>) => void;
  deleteSeller: (id: string) => void;

  // Invoice actions
  addInvoice: (invoice: Omit<SalesInvoice, 'id' | 'invoiceNumber' | 'createdAt'>) => void;
  updateInvoice: (id: string, invoice: Partial<SalesInvoice>) => void;
  confirmInvoice: (id: string) => { success: boolean; error?: string; lowStockWarnings?: string[] };

  // Payment actions
  addPayment: (payment: Omit<Payment, 'id'>) => void;

  // Stock Ledger actions
  addStockEntry: (entry: Omit<StockLedger, 'id'>) => void;

  // Quotation actions
  addQuotation: (quotation: Omit<Quotation, 'id' | 'quotationNumber' | 'createdAt'>) => void;
  updateQuotation: (id: string, quotation: Partial<Quotation>) => void;
  convertQuotationToInvoice: (quotationId: string) => string | null;
  cancelQuotation: (id: string) => void;

  // Stock Adjustment actions
  addStockAdjustment: (adjustment: Omit<StockAdjustment, 'id' | 'createdAt'>) => void;
  processReturn: (invoiceId: string, productId: string, batchLotId: string, quantity: number, reason: string, returnAction: 'RESTOCK' | 'SCRAP') => void;

  // Computed helpers
  getProductStock: (productId: string) => number;
  getBatchStock: (batchId: string) => number;
  getCustomerDue: (customerId: string) => number;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial data
      categories: initialCategories,
      products: initialProducts,
      batches: initialBatches,
      customers: initialCustomers,
      sellers: initialSellers,
      invoices: initialInvoices,
      payments: initialPayments,
      stockLedger: initialStockLedger,
      quotations: [],
      stockAdjustments: [],
      auditLogs: [],

      // Audit Log action
      addAuditLog: (log) => set((state) => ({
        auditLogs: [...state.auditLogs, {
          ...log,
          id: generateId(),
          timestamp: new Date(),
          userId: 'admin-1',
          userName: 'Admin',
        }],
      })),

      // Product actions
      addProduct: (product) => {
        const id = generateId();
        set((state) => ({
          products: [...state.products, {
            ...product,
            id,
            createdAt: new Date(),
            updatedAt: new Date(),
          }],
        }));
        get().addAuditLog({
          action: 'CREATE',
          entityType: 'PRODUCT',
          entityId: id,
          entityName: product.name,
          details: `Created new product: ${product.name}`,
        });
      },

      updateProduct: (id, product) => {
        const state = get();
        const oldProduct = state.products.find((p) => p.id === id);
        set((state) => ({
          products: state.products.map((p) =>
            p.id === id ? { ...p, ...product, updatedAt: new Date() } : p
          ),
        }));
        if (oldProduct) {
          get().addAuditLog({
            action: 'UPDATE',
            entityType: 'PRODUCT',
            entityId: id,
            entityName: product.name || oldProduct.name,
            details: `Updated product: ${oldProduct.name}`,
            oldValue: JSON.stringify({ name: oldProduct.name, salesPrice: oldProduct.salesPrice, costPrice: oldProduct.costPrice }),
            newValue: JSON.stringify(product),
          });
        }
      },

      deleteProduct: (id) => {
        const state = get();
        const product = state.products.find((p) => p.id === id);
        set((state) => ({
          products: state.products.map((p) =>
            p.id === id ? { ...p, active: false } : p
          ),
        }));
        if (product) {
          get().addAuditLog({
            action: 'DELETE',
            entityType: 'PRODUCT',
            entityId: id,
            entityName: product.name,
            details: `Deleted product: ${product.name}`,
          });
        }
      },

      // Category actions
      addCategory: (name) => {
        const id = generateId();
        set((state) => ({
          categories: [...state.categories, { id, name }],
        }));
        get().addAuditLog({
          action: 'CREATE',
          entityType: 'CATEGORY',
          entityId: id,
          entityName: name,
          details: `Created new category: ${name}`,
        });
      },

      // Batch actions
      addBatch: (batch) => {
        const id = generateId();
        const state = get();
        const product = state.products.find((p) => p.id === batch.productId);
        set((state) => ({
          batches: [...state.batches, {
            ...batch,
            id,
            createdAt: new Date(),
          }],
        }));
        // Add stock ledger entry
        get().addStockEntry({
          date: new Date(),
          type: 'OPENING',
          productId: batch.productId,
          batchLotId: id,
          quantityIn: batch.quantity,
          quantityOut: 0,
          unitCost: batch.unitCost,
          reference: 'Opening Stock',
          createdBy: 'Admin',
        });
        get().addAuditLog({
          action: 'CREATE',
          entityType: 'BATCH',
          entityId: id,
          entityName: `${product?.name || 'Unknown'} - ${batch.lotNumber}`,
          details: `Added opening stock: ${batch.quantity} units @ ${batch.unitCost}`,
        });
      },

      updateBatch: (id, batchData) => {
        const state = get();
        const oldBatch = state.batches.find((b) => b.id === id);
        const product = state.products.find((p) => p.id === oldBatch?.productId);
        set((state) => ({
          batches: state.batches.map((b) =>
            b.id === id ? { ...b, ...batchData } : b
          ),
        }));
        if (oldBatch) {
          get().addAuditLog({
            action: 'UPDATE',
            entityType: 'BATCH',
            entityId: id,
            entityName: `${product?.name || 'Unknown'} - ${oldBatch.lotNumber}`,
            details: `Updated batch: ${oldBatch.lotNumber}`,
            oldValue: JSON.stringify({ lotNumber: oldBatch.lotNumber, quantity: oldBatch.quantity, unitCost: oldBatch.unitCost }),
            newValue: JSON.stringify(batchData),
          });
        }
      },

      updateBatchQuantity: (id, quantity) => set((state) => ({
        batches: state.batches.map((b) =>
          b.id === id ? { ...b, quantity } : b
        ),
      })),

      deleteBatch: (id) => {
        const state = get();
        const batch = state.batches.find((b) => b.id === id);
        const product = state.products.find((p) => p.id === batch?.productId);
        set((state) => ({
          batches: state.batches.filter((b) => b.id !== id),
        }));
        if (batch) {
          get().addAuditLog({
            action: 'DELETE',
            entityType: 'BATCH',
            entityId: id,
            entityName: `${product?.name || 'Unknown'} - ${batch.lotNumber}`,
            details: `Deleted batch: ${batch.lotNumber} (${batch.quantity} units)`,
          });
        }
      },
      addCustomer: (customer) => {
        const id = generateId();
        set((state) => ({
          customers: [...state.customers, {
            ...customer,
            id,
            createdAt: new Date(),
          }],
        }));
        get().addAuditLog({
          action: 'CREATE',
          entityType: 'CUSTOMER',
          entityId: id,
          entityName: customer.name,
          details: `Created new customer: ${customer.name}`,
        });
      },

      updateCustomer: (id, customer) => {
        const state = get();
        const oldCustomer = state.customers.find((c) => c.id === id);
        set((state) => ({
          customers: state.customers.map((c) =>
            c.id === id ? { ...c, ...customer } : c
          ),
        }));
        if (oldCustomer) {
          get().addAuditLog({
            action: 'UPDATE',
            entityType: 'CUSTOMER',
            entityId: id,
            entityName: customer.name || oldCustomer.name,
            details: `Updated customer: ${oldCustomer.name}`,
          });
        }
      },

      deleteCustomer: (id) => {
        const state = get();
        const customer = state.customers.find((c) => c.id === id);
        set((state) => ({
          customers: state.customers.filter((c) => c.id !== id),
        }));
        if (customer) {
          get().addAuditLog({
            action: 'DELETE',
            entityType: 'CUSTOMER',
            entityId: id,
            entityName: customer.name,
            details: `Deleted customer: ${customer.name}`,
          });
        }
      },

      // Seller actions
      addSeller: (seller) => {
        const id = generateId();
        set((state) => ({
          sellers: [...state.sellers, {
            ...seller,
            id,
            createdAt: new Date(),
          }],
        }));
        get().addAuditLog({
          action: 'CREATE',
          entityType: 'CUSTOMER', // Using CUSTOMER type for sellers in audit
          entityId: id,
          entityName: seller.name,
          details: `Created new seller: ${seller.name}`,
        });
      },

      updateSeller: (id, seller) => {
        const state = get();
        const oldSeller = state.sellers.find((s) => s.id === id);
        set((state) => ({
          sellers: state.sellers.map((s) =>
            s.id === id ? { ...s, ...seller } : s
          ),
        }));
        if (oldSeller) {
          get().addAuditLog({
            action: 'UPDATE',
            entityType: 'CUSTOMER',
            entityId: id,
            entityName: seller.name || oldSeller.name,
            details: `Updated seller: ${oldSeller.name}`,
          });
        }
      },

      deleteSeller: (id) => {
        const state = get();
        const seller = state.sellers.find((s) => s.id === id);
        set((state) => ({
          sellers: state.sellers.map((s) =>
            s.id === id ? { ...s, active: false } : s
          ),
        }));
        if (seller) {
          get().addAuditLog({
            action: 'DELETE',
            entityType: 'CUSTOMER',
            entityId: id,
            entityName: seller.name,
            details: `Deleted seller: ${seller.name}`,
          });
        }
      },

      // Invoice actions
      addInvoice: (invoice) => {
        const id = generateId();
        const invoiceNumber = generateInvoiceNumber();
        const state = get();
        const customer = state.customers.find((c) => c.id === invoice.customerId);
        set((state) => ({
          invoices: [...state.invoices, {
            ...invoice,
            id,
            invoiceNumber,
            createdAt: new Date(),
          }],
        }));
        get().addAuditLog({
          action: 'CREATE',
          entityType: 'INVOICE',
          entityId: id,
          entityName: invoiceNumber,
          details: `Created invoice for ${customer?.name || 'Unknown'}: ৳${invoice.totalAmount}`,
        });
      },

      updateInvoice: (id, invoice) => set((state) => ({
        invoices: state.invoices.map((inv) =>
          inv.id === id ? { ...inv, ...invoice } : inv
        ),
      })),

      confirmInvoice: (id) => {
        const state = get();
        const invoice = state.invoices.find((inv) => inv.id === id);
        
        // Already confirmed or not found
        if (!invoice) return { success: false, error: 'Invoice not found' };
        if (invoice.status === 'CONFIRMED') return { success: false, error: 'Invoice already confirmed' };

        const LOW_STOCK_THRESHOLD = 50;
        const lowStockWarnings: string[] = [];

        // Validate stock availability for all lines BEFORE deducting
        for (const line of invoice.lines) {
          const totalQuantity = line.quantity + (line.freeQuantity || 0);
          const batch = state.batches.find((b) => b.id === line.batchLotId);
          const product = state.products.find((p) => p.id === line.productId);
          const productName = product?.name || 'Unknown Product';
          
          if (!batch) {
            return { success: false, error: `Batch not found for ${productName}` };
          }
          
          if (batch.quantity < totalQuantity) {
            return { 
              success: false, 
              error: `Insufficient stock for ${productName}. Available: ${batch.quantity}, Required: ${totalQuantity} (Paid: ${line.quantity}, Free: ${line.freeQuantity || 0})` 
            };
          }

          // Check if stock will go below threshold after sale
          const remainingStock = batch.quantity - totalQuantity;
          if (remainingStock <= LOW_STOCK_THRESHOLD && remainingStock > 0) {
            lowStockWarnings.push(`${productName}: only ${remainingStock} units left`);
          } else if (remainingStock === 0) {
            lowStockWarnings.push(`${productName}: OUT OF STOCK after this sale`);
          }
        }

        // All validations passed - now deduct stock for each line
        invoice.lines.forEach((line) => {
          const totalQuantity = line.quantity + (line.freeQuantity || 0);
          const batch = state.batches.find((b) => b.id === line.batchLotId);
          const product = state.products.find((p) => p.id === line.productId);
          
          if (batch) {
            const newQuantity = batch.quantity - totalQuantity;
            // Prevent negative stock (extra safety)
            get().updateBatchQuantity(line.batchLotId, Math.max(0, newQuantity));

            // Add detailed stock ledger entry
            get().addStockEntry({
              date: new Date(),
              type: 'SALE',
              productId: line.productId,
              batchLotId: line.batchLotId,
              quantityIn: 0,
              quantityOut: totalQuantity,
              unitCost: batch.unitCost,
              reference: `${invoice.invoiceNumber} | Paid: ${line.quantity}${line.freeQuantity > 0 ? `, Free: ${line.freeQuantity}` : ''} | ${product?.name || 'Unknown'}`,
              createdBy: 'Admin',
            });
          }
        });

        // Update invoice status
        set((state) => ({
          invoices: state.invoices.map((inv) =>
            inv.id === id ? { ...inv, status: 'CONFIRMED' as const } : inv
          ),
        }));

        get().addAuditLog({
          action: 'CONFIRM',
          entityType: 'INVOICE',
          entityId: id,
          entityName: invoice.invoiceNumber,
          details: `Confirmed invoice ${invoice.invoiceNumber}: ৳${invoice.totalAmount}`,
        });

        return { success: true, lowStockWarnings };
      },

      // Payment actions
      addPayment: (payment) => {
        const id = generateId();
        set((state) => ({
          payments: [...state.payments, { ...payment, id }],
        }));

        // Update invoice paid/due amounts
        const state = get();
        const invoice = state.invoices.find((inv) => inv.id === payment.invoiceId);
        if (invoice) {
          const newPaidAmount = invoice.paidAmount + payment.amount;
          const newDueAmount = invoice.totalAmount - newPaidAmount;
          get().updateInvoice(payment.invoiceId, {
            paidAmount: newPaidAmount,
            dueAmount: Math.max(0, newDueAmount),
          });
          get().addAuditLog({
            action: 'CREATE',
            entityType: 'PAYMENT',
            entityId: id,
            entityName: `${invoice.invoiceNumber} Payment`,
            details: `Received ৳${payment.amount} via ${payment.paymentMethod} for ${invoice.invoiceNumber}`,
          });
        }
      },

      // Stock Ledger actions
      addStockEntry: (entry) => set((state) => ({
        stockLedger: [...state.stockLedger, { ...entry, id: generateId() }],
      })),

      // Quotation actions
      addQuotation: (quotation) => {
        const id = generateId();
        const quotationNumber = generateQuotationNumber();
        const state = get();
        const customer = state.customers.find((c) => c.id === quotation.customerId);
        set((state) => ({
          quotations: [...state.quotations, {
            ...quotation,
            id,
            quotationNumber,
            createdAt: new Date(),
          }],
        }));
        get().addAuditLog({
          action: 'CREATE',
          entityType: 'QUOTATION',
          entityId: id,
          entityName: quotationNumber,
          details: `Created quotation for ${customer?.name || 'Unknown'}: ৳${quotation.totalAmount}`,
        });
      },

      updateQuotation: (id, quotation) => set((state) => ({
        quotations: state.quotations.map((q) =>
          q.id === id ? { ...q, ...quotation } : q
        ),
      })),

      convertQuotationToInvoice: (quotationId) => {
        const state = get();
        const quotation = state.quotations.find((q) => q.id === quotationId);
        if (!quotation || quotation.status !== 'PENDING') return null;

        // Create invoice lines from quotation lines (need to select batches)
        const invoiceLines: SalesInvoiceLine[] = quotation.lines.map((line) => {
          // Find first available batch for the product
          const availableBatch = state.batches.find(
            (b) => b.productId === line.productId && b.quantity >= line.quantity
          );
          return {
            id: generateId(),
            invoiceId: '',
            productId: line.productId,
            batchLotId: availableBatch?.id || '',
            quantity: line.quantity,
            freeQuantity: 0,
            unitPrice: line.unitPrice,
            lineTotal: line.lineTotal,
          };
        });

        const invoiceId = generateId();
        const invoiceNumber = generateInvoiceNumber();

        // Add invoice
        set((state) => ({
          invoices: [...state.invoices, {
            id: invoiceId,
            invoiceNumber,
            date: new Date(),
            customerId: quotation.customerId,
            totalAmount: quotation.totalAmount,
            paidAmount: 0,
            dueAmount: quotation.totalAmount,
            status: 'DRAFT' as const,
            lines: invoiceLines,
            createdAt: new Date(),
          }],
        }));

        // Update quotation status
        set((state) => ({
          quotations: state.quotations.map((q) =>
            q.id === quotationId ? { ...q, status: 'CONVERTED' as const, convertedInvoiceId: invoiceId } : q
          ),
        }));

        get().addAuditLog({
          action: 'CONVERT',
          entityType: 'QUOTATION',
          entityId: quotationId,
          entityName: quotation.quotationNumber,
          details: `Converted ${quotation.quotationNumber} to invoice ${invoiceNumber}`,
        });

        return invoiceId;
      },

      cancelQuotation: (id) => {
        const state = get();
        const quotation = state.quotations.find((q) => q.id === id);
        set((state) => ({
          quotations: state.quotations.map((q) =>
            q.id === id ? { ...q, status: 'CANCELLED' as const } : q
          ),
        }));
        if (quotation) {
          get().addAuditLog({
            action: 'CANCEL',
            entityType: 'QUOTATION',
            entityId: id,
            entityName: quotation.quotationNumber,
            details: `Cancelled quotation ${quotation.quotationNumber}`,
          });
        }
      },

      // Stock Adjustment actions
      addStockAdjustment: (adjustment) => {
        const id = generateId();
        const state = get();
        const product = state.products.find((p) => p.id === adjustment.productId);
        set((state) => ({
          stockAdjustments: [...state.stockAdjustments, {
            ...adjustment,
            id,
            createdAt: new Date(),
          }],
        }));

        // Update batch quantity based on type and return action
        const batch = state.batches.find((b) => b.id === adjustment.batchLotId);
        if (batch) {
          if (adjustment.type === 'RETURN') {
            // Only restock if action is RESTOCK, not SCRAP
            if (adjustment.returnAction === 'RESTOCK') {
              get().updateBatchQuantity(adjustment.batchLotId, batch.quantity + adjustment.quantity);
              get().addStockEntry({
                date: new Date(),
                type: 'RETURN',
                productId: adjustment.productId,
                batchLotId: adjustment.batchLotId,
                quantityIn: adjustment.quantity,
                quantityOut: 0,
                unitCost: batch.unitCost,
                reference: `${adjustment.reason} (Restocked)`,
                createdBy: adjustment.createdBy,
              });
            } else {
              // SCRAP - log as damage, don't restock
              get().addStockEntry({
                date: new Date(),
                type: 'DAMAGE',
                productId: adjustment.productId,
                batchLotId: adjustment.batchLotId,
                quantityIn: 0,
                quantityOut: 0, // Already deducted from sale
                unitCost: batch.unitCost,
                reference: `${adjustment.reason} (Scrapped)`,
                createdBy: adjustment.createdBy,
              });
            }
          } else {
            // Damage/Expired/Adjustment decreases stock
            get().updateBatchQuantity(adjustment.batchLotId, Math.max(0, batch.quantity - adjustment.quantity));
            get().addStockEntry({
              date: new Date(),
              type: adjustment.type === 'EXPIRED' ? 'DAMAGE' : adjustment.type,
              productId: adjustment.productId,
              batchLotId: adjustment.batchLotId,
              quantityIn: 0,
              quantityOut: adjustment.quantity,
              unitCost: batch.unitCost,
              reference: adjustment.reason,
              createdBy: adjustment.createdBy,
            });
          }
        }

        get().addAuditLog({
          action: adjustment.type === 'RETURN' ? 'CREATE' : 'UPDATE',
          entityType: 'ADJUSTMENT',
          entityId: id,
          entityName: `${product?.name || 'Unknown'} - ${adjustment.type}`,
          details: `${adjustment.type}: ${adjustment.quantity} units of ${product?.name || 'Unknown'}. Reason: ${adjustment.reason}${adjustment.returnAction ? ` (${adjustment.returnAction})` : ''}`,
        });
      },

      processReturn: (invoiceId, productId, batchLotId, quantity, reason, returnAction) => {
        const state = get();
        const invoice = state.invoices.find((inv) => inv.id === invoiceId);
        if (!invoice) return;

        const line = invoice.lines.find((l) => l.productId === productId);
        const returnValue = quantity * (line?.unitPrice || 0);

        // Add stock adjustment with return action
        get().addStockAdjustment({
          date: new Date(),
          type: 'RETURN',
          productId,
          batchLotId,
          quantity,
          reason,
          invoiceId,
          returnAction,
          returnValue,
          createdBy: 'Admin',
        });

        // Reduce invoice total and due
        const newTotal = invoice.totalAmount - returnValue;
        const newDue = Math.max(0, invoice.dueAmount - returnValue);
        
        get().updateInvoice(invoiceId, {
          totalAmount: newTotal,
          dueAmount: newDue,
        });
      },

      // Computed helpers
      getProductStock: (productId) => {
        const state = get();
        return state.batches
          .filter((b) => b.productId === productId)
          .reduce((sum, b) => sum + b.quantity, 0);
      },

      getBatchStock: (batchId) => {
        const state = get();
        const batch = state.batches.find((b) => b.id === batchId);
        return batch?.quantity || 0;
      },

      getCustomerDue: (customerId) => {
        const state = get();
        return state.invoices
          .filter((inv) => inv.customerId === customerId && inv.status === 'CONFIRMED')
          .reduce((sum, inv) => sum + inv.dueAmount, 0);
      },
    }),
    {
      name: 'pharma-inventory-store',
    }
  )
);
