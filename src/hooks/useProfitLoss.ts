import { useMemo } from 'react';
import { useInvoices, useInvoiceLines, useBatches, useProducts, useCustomers, useSellers, useCategories, useStockAdjustments, DbInvoiceLine, DbStockAdjustment } from './useDatabase';
import { startOfDay, endOfDay, startOfWeek, startOfMonth, startOfYear, isWithinInterval, parseISO } from 'date-fns';

export type DateRangePreset = 'today' | 'week' | 'month' | 'year' | 'all' | 'custom';

export type ProfitLossFilters = {
  preset: DateRangePreset;
  startDate?: Date;
  endDate?: Date;
  customerId?: string;
  sellerId?: string;
  productId?: string;
  categoryId?: string;
};

export type ProfitLossMetrics = {
  totalSales: number;
  totalPaid: number;
  totalDue: number;
  totalCOGS: number;
  grossProfit: number;
  returnAdjustment: number;
  damageWriteOff: number;
  netProfit: number;
  invoiceCount: number;
  profitMargin: number;
  // Free Giveaway Metrics (separate, not included in P&L)
  freeGiveawayQty: number;
  freeGiveawayCost: number;
};

export type InvoiceWithPL = {
  id: string;
  invoiceNumber: string;
  createdAt: string;
  customerName: string;
  sellerName: string;
  total: number;
  paid: number;
  due: number;
  cogs: number;
  profit: number;
  profitMargin: number;
  freeQty: number;
  freeCost: number;
};

// Helper to get date range based on preset
export function getDateRange(preset: DateRangePreset, startDate?: Date, endDate?: Date): { start: Date; end: Date } {
  const now = new Date();
  switch (preset) {
    case 'today':
      return { start: startOfDay(now), end: endOfDay(now) };
    case 'week':
      return { start: startOfWeek(now, { weekStartsOn: 6 }), end: endOfDay(now) }; // Week starts Saturday
    case 'month':
      return { start: startOfMonth(now), end: endOfDay(now) };
    case 'year':
      return { start: startOfYear(now), end: endOfDay(now) };
    case 'custom':
      return {
        start: startDate ? startOfDay(startDate) : new Date(0),
        end: endDate ? endOfDay(endDate) : endOfDay(now),
      };
    case 'all':
    default:
      return { start: new Date(0), end: endOfDay(now) };
  }
}

// Main P&L Hook
export function useProfitLoss(filters: ProfitLossFilters) {
  const { data: invoices = [] } = useInvoices();
  const { data: allInvoiceLines = [] } = useInvoiceLines();
  const { data: batches = [] } = useBatches();
  const { data: products = [] } = useProducts();
  const { data: customers = [] } = useCustomers();
  const { data: sellers = [] } = useSellers();
  const { data: categories = [] } = useCategories();
  const { data: stockAdjustments = [] } = useStockAdjustments();

  // Get batch cost lookup
  const batchCostMap = useMemo(() => {
    const map = new Map<string, number>();
    batches.forEach(batch => {
      map.set(batch.id, batch.cost_price);
    });
    return map;
  }, [batches]);

  // Get product to category mapping
  const productCategoryMap = useMemo(() => {
    const map = new Map<string, string | null>();
    products.forEach(product => {
      map.set(product.id, product.category_id);
    });
    return map;
  }, [products]);

  // Filter invoices based on filters
  const filteredInvoices = useMemo(() => {
    const { start, end } = getDateRange(filters.preset, filters.startDate, filters.endDate);

    return invoices.filter(invoice => {
      // Only CONFIRMED invoices for P&L
      if (invoice.status !== 'CONFIRMED' && invoice.status !== 'PAID' && invoice.status !== 'PARTIAL') {
        return false;
      }

      // Date filter
      const invoiceDate = parseISO(invoice.created_at);
      if (!isWithinInterval(invoiceDate, { start, end })) {
        return false;
      }

      // Customer filter
      if (filters.customerId && invoice.customer_id !== filters.customerId) {
        return false;
      }

      // Seller filter
      if (filters.sellerId && invoice.seller_id !== filters.sellerId) {
        return false;
      }

      return true;
    });
  }, [invoices, filters]);

  // Calculate metrics with CORRECT COGS logic (sold qty only, NOT free qty)
  const metrics = useMemo((): ProfitLossMetrics => {
    let totalSales = 0;
    let totalPaid = 0;
    let totalDue = 0;
    let totalCOGS = 0;
    let freeGiveawayQty = 0;
    let freeGiveawayCost = 0;

    filteredInvoices.forEach(invoice => {
      const lines = allInvoiceLines.filter((line: DbInvoiceLine) => line.invoice_id === invoice.id);

      // Calculate COGS and Free Giveaway for this invoice
      let invoiceCOGS = 0;
      let invoiceFreeQty = 0;
      let invoiceFreeCost = 0;

      lines.forEach((line: DbInvoiceLine) => {
        // If cost_price is stored in line, use it. Otherwise fetch from batch
        const costPrice = line.cost_price > 0 ? line.cost_price : (batchCostMap.get(line.batch_id || '') || 0);
        
        // Apply product/category filter if set
        if (filters.productId && line.product_id !== filters.productId) return;
        if (filters.categoryId) {
          const productCat = productCategoryMap.get(line.product_id);
          if (productCat !== filters.categoryId) return;
        }

        // CRITICAL: COGS is ONLY from paid/sold quantity (line.quantity)
        // Free quantity is EXCLUDED from COGS calculation
        const soldQty = line.quantity || 0;
        const freeQty = line.free_quantity || 0;
        
        invoiceCOGS += costPrice * soldQty;
        
        // Track free giveaway separately (not in P&L totals)
        if (freeQty > 0) {
          invoiceFreeQty += freeQty;
          invoiceFreeCost += costPrice * freeQty;
        }
      });

      // If product/category filter is active, only count filtered lines' sales
      if (filters.productId || filters.categoryId) {
        let filteredLineTotal = 0;
        lines.forEach((line: DbInvoiceLine) => {
          if (filters.productId && line.product_id !== filters.productId) return;
          if (filters.categoryId) {
            const productCat = productCategoryMap.get(line.product_id);
            if (productCat !== filters.categoryId) return;
          }
          filteredLineTotal += line.total;
        });
        totalSales += filteredLineTotal;
        // Prorate paid/due based on line total vs invoice total
        const ratio = invoice.total > 0 ? filteredLineTotal / invoice.total : 0;
        totalPaid += invoice.paid * ratio;
        totalDue += invoice.due * ratio;
      } else {
        totalSales += invoice.total;
        totalPaid += invoice.paid;
        totalDue += invoice.due;
      }

      totalCOGS += invoiceCOGS;
      freeGiveawayQty += invoiceFreeQty;
      freeGiveawayCost += invoiceFreeCost;
    });

    // Calculate return adjustments (returns that went back to stock reduce COGS)
    const { start, end } = getDateRange(filters.preset, filters.startDate, filters.endDate);
    let returnAdjustment = 0;
    let damageWriteOff = 0;

    stockAdjustments.forEach((adj: DbStockAdjustment) => {
      const adjDate = parseISO(adj.created_at);
      if (!isWithinInterval(adjDate, { start, end })) return;

      if (adj.type === 'RETURN') {
        // Returns that went back to RESTOCK reduce COGS
        if (adj.return_action === 'RESTOCK') {
          const costPrice = batchCostMap.get(adj.batch_id) || 0;
          returnAdjustment += costPrice * adj.quantity;
        }
        // SCRAP returns still count as loss (COGS not reversed)
      } else if (adj.type === 'DAMAGE' || adj.type === 'EXPIRED') {
        // Damage/expired is a write-off (loss)
        const costPrice = batchCostMap.get(adj.batch_id) || 0;
        damageWriteOff += costPrice * adj.quantity;
      }
    });

    const grossProfit = totalSales - totalCOGS;
    const netProfit = grossProfit + returnAdjustment - damageWriteOff;
    const profitMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;

    return {
      totalSales,
      totalPaid,
      totalDue,
      totalCOGS,
      grossProfit,
      returnAdjustment,
      damageWriteOff,
      netProfit,
      invoiceCount: filteredInvoices.length,
      profitMargin,
      // Free giveaway metrics (separate from P&L)
      freeGiveawayQty,
      freeGiveawayCost,
    };
  }, [filteredInvoices, allInvoiceLines, batchCostMap, productCategoryMap, stockAdjustments, filters]);

  // Detailed invoice data with P&L
  const invoicesWithPL = useMemo((): InvoiceWithPL[] => {
    return filteredInvoices.map(invoice => {
      const lines = allInvoiceLines.filter((line: DbInvoiceLine) => line.invoice_id === invoice.id);
      const customer = customers.find(c => c.id === invoice.customer_id);
      const seller = sellers.find(s => s.id === invoice.seller_id);

      let cogs = 0;
      let freeQty = 0;
      let freeCost = 0;
      let filteredTotal = invoice.total;

      if (filters.productId || filters.categoryId) {
        filteredTotal = 0;
      }

      lines.forEach((line: DbInvoiceLine) => {
        if (filters.productId && line.product_id !== filters.productId) return;
        if (filters.categoryId) {
          const productCat = productCategoryMap.get(line.product_id);
          if (productCat !== filters.categoryId) return;
        }

        const costPrice = line.cost_price > 0 ? line.cost_price : (batchCostMap.get(line.batch_id || '') || 0);
        
        // COGS only from sold qty
        const soldQty = line.quantity || 0;
        cogs += costPrice * soldQty;
        
        // Track free separately
        const lineFreeQty = line.free_quantity || 0;
        if (lineFreeQty > 0) {
          freeQty += lineFreeQty;
          freeCost += costPrice * lineFreeQty;
        }

        if (filters.productId || filters.categoryId) {
          filteredTotal += line.total;
        }
      });

      const profit = filteredTotal - cogs;
      const profitMargin = filteredTotal > 0 ? (profit / filteredTotal) * 100 : 0;

      return {
        id: invoice.id,
        invoiceNumber: invoice.invoice_number,
        createdAt: invoice.created_at,
        customerName: customer?.name || 'Unknown',
        sellerName: seller?.name || 'N/A',
        total: filteredTotal,
        paid: invoice.paid,
        due: invoice.due,
        cogs,
        profit,
        profitMargin,
        freeQty,
        freeCost,
      };
    });
  }, [filteredInvoices, allInvoiceLines, customers, sellers, batchCostMap, productCategoryMap, filters]);

  // P&L by Customer
  const profitByCustomer = useMemo(() => {
    const map = new Map<string, { name: string; sales: number; cogs: number; profit: number; freeQty: number; freeCost: number }>();
    
    invoicesWithPL.forEach(inv => {
      const existing = map.get(inv.customerName) || { name: inv.customerName, sales: 0, cogs: 0, profit: 0, freeQty: 0, freeCost: 0 };
      existing.sales += inv.total;
      existing.cogs += inv.cogs;
      existing.profit += inv.profit;
      existing.freeQty += inv.freeQty;
      existing.freeCost += inv.freeCost;
      map.set(inv.customerName, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.profit - a.profit);
  }, [invoicesWithPL]);

  // P&L by Seller
  const profitBySeller = useMemo(() => {
    const map = new Map<string, { name: string; sales: number; cogs: number; profit: number; freeQty: number; freeCost: number }>();
    
    invoicesWithPL.forEach(inv => {
      const existing = map.get(inv.sellerName) || { name: inv.sellerName, sales: 0, cogs: 0, profit: 0, freeQty: 0, freeCost: 0 };
      existing.sales += inv.total;
      existing.cogs += inv.cogs;
      existing.profit += inv.profit;
      existing.freeQty += inv.freeQty;
      existing.freeCost += inv.freeCost;
      map.set(inv.sellerName, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.profit - a.profit);
  }, [invoicesWithPL]);

  // P&L by Product
  const profitByProduct = useMemo(() => {
    const map = new Map<string, { id: string; name: string; sales: number; cogs: number; profit: number; qty: number; freeQty: number; freeCost: number }>();
    
    filteredInvoices.forEach(invoice => {
      const lines = allInvoiceLines.filter((line: DbInvoiceLine) => line.invoice_id === invoice.id);
      
      lines.forEach((line: DbInvoiceLine) => {
        const product = products.find(p => p.id === line.product_id);
        if (!product) return;

        const costPrice = line.cost_price > 0 ? line.cost_price : (batchCostMap.get(line.batch_id || '') || 0);
        const soldQty = line.quantity || 0;
        const freeQty = line.free_quantity || 0;
        
        // COGS only from sold qty
        const lineCogs = costPrice * soldQty;
        const lineProfit = line.total - lineCogs;
        const lineFreeCost = costPrice * freeQty;

        const existing = map.get(line.product_id) || { 
          id: line.product_id, 
          name: product.name, 
          sales: 0, 
          cogs: 0, 
          profit: 0, 
          qty: 0,
          freeQty: 0,
          freeCost: 0
        };
        existing.sales += line.total;
        existing.cogs += lineCogs;
        existing.profit += lineProfit;
        existing.qty += soldQty;
        existing.freeQty += freeQty;
        existing.freeCost += lineFreeCost;
        map.set(line.product_id, existing);
      });
    });

    return Array.from(map.values()).sort((a, b) => b.profit - a.profit);
  }, [filteredInvoices, allInvoiceLines, products, batchCostMap]);

  // P&L by Category
  const profitByCategory = useMemo(() => {
    const map = new Map<string, { id: string; name: string; sales: number; cogs: number; profit: number; freeQty: number; freeCost: number }>();
    
    profitByProduct.forEach(product => {
      const p = products.find(pr => pr.id === product.id);
      const categoryId = p?.category_id || 'uncategorized';
      const category = categories.find(c => c.id === categoryId);
      const categoryName = category?.name || 'Uncategorized';

      const existing = map.get(categoryId) || { id: categoryId, name: categoryName, sales: 0, cogs: 0, profit: 0, freeQty: 0, freeCost: 0 };
      existing.sales += product.sales;
      existing.cogs += product.cogs;
      existing.profit += product.profit;
      existing.freeQty += product.freeQty;
      existing.freeCost += product.freeCost;
      map.set(categoryId, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.profit - a.profit);
  }, [profitByProduct, products, categories]);

  return {
    metrics,
    invoicesWithPL,
    profitByCustomer,
    profitBySeller,
    profitByProduct,
    profitByCategory,
    isLoading: false,
  };
}