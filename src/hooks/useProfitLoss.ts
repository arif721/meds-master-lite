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
  totalSales: number; // Net Sales (TP Sales - Discounts)
  totalTPSales: number; // TP Rate × Paid Qty (before discounts)
  totalPaid: number;
  totalDue: number;
  totalCOGS: number; // Total Cost = Cost Price × (Paid + Free Qty)
  grossProfit: number; // Net Sales - Total Cost
  returnAdjustment: number;
  damageWriteOff: number;
  netProfit: number; // Gross Profit + Return Adj - Damage
  invoiceCount: number;
  profitMargin: number;
  // Discount Metrics
  totalLineDiscount: number;
  totalOverallDiscount: number;
  totalDiscount: number;
  // Free Giveaway Metrics (included in totalCOGS)
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

  // Calculate metrics with CORRECT COST logic
  // Total Cost = Cost Price × (Paid Qty + Free Qty)
  // Net Sales = TP Rate × Paid Qty - Discounts
  // Profit = Net Sales - Total Cost
  const metrics = useMemo((): ProfitLossMetrics => {
    let totalTPSales = 0; // TP Rate × Paid Qty (before discounts)
    let totalPaid = 0;
    let totalDue = 0;
    let totalCost = 0; // Cost Price × (Paid + Free Qty)
    let freeGiveawayQty = 0;
    let freeGiveawayCost = 0; // Cost of free items (included in totalCost)
    let totalLineDiscount = 0;
    let totalOverallDiscount = 0;

    filteredInvoices.forEach(invoice => {
      const lines = allInvoiceLines.filter((line: DbInvoiceLine) => line.invoice_id === invoice.id);

      // Calculate Cost and sales for this invoice
      let invoiceTotalCost = 0;
      let invoiceTPSales = 0;
      let invoiceFreeQty = 0;
      let invoiceFreeCost = 0;
      let invoiceLineDiscount = 0;

      lines.forEach((line: DbInvoiceLine) => {
        // Cost Price from invoice line (for P&L calculation)
        const costPrice = line.cost_price > 0 ? line.cost_price : (batchCostMap.get(line.batch_id || '') || 0);
        // TP Rate from invoice line (actual selling price)
        const tpRate = (line as any).tp_rate > 0 ? (line as any).tp_rate : costPrice;
        
        // Apply product/category filter if set
        if (filters.productId && line.product_id !== filters.productId) return;
        if (filters.categoryId) {
          const productCat = productCategoryMap.get(line.product_id);
          if (productCat !== filters.categoryId) return;
        }

        const soldQty = line.quantity || 0;
        const freeQty = line.free_quantity || 0;
        const totalQty = soldQty + freeQty;
        
        // CRITICAL: Total Cost = Cost Price × (Paid Qty + Free Qty)
        // Free items reduce profit via cost
        invoiceTotalCost += costPrice * totalQty;
        
        // TP Sales = TP Rate × Paid Qty (Free items don't add to sales)
        invoiceTPSales += tpRate * soldQty;
        
        // Calculate line discount (applied to TP subtotal)
        const discountType = (line as any).discount_type || 'AMOUNT';
        const discountValue = (line as any).discount_value || 0;
        const grossLineTotal = soldQty * tpRate;
        if (discountType === 'PERCENT') {
          invoiceLineDiscount += grossLineTotal * discountValue / 100;
        } else {
          invoiceLineDiscount += discountValue;
        }
        
        // Track free giveaway separately for display
        if (freeQty > 0) {
          invoiceFreeQty += freeQty;
          invoiceFreeCost += costPrice * freeQty;
        }
      });

      // Calculate net sales for this invoice (TP Sales - Discounts)
      // Invoice.total already has discounts applied, use it for filtered calculations
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
        totalTPSales += invoiceTPSales;
        // Prorate paid/due based on line total vs invoice total
        const ratio = invoice.total > 0 ? filteredLineTotal / invoice.total : 0;
        totalPaid += invoice.paid * ratio;
        totalDue += invoice.due * ratio;
      } else {
        totalTPSales += invoiceTPSales;
        totalPaid += invoice.paid;
        totalDue += invoice.due;
      }

      totalCost += invoiceTotalCost;
      freeGiveawayQty += invoiceFreeQty;
      freeGiveawayCost += invoiceFreeCost;
      totalLineDiscount += invoiceLineDiscount;
      totalOverallDiscount += invoice.discount || 0;
    });

    // Calculate return adjustments (returns that went back to stock reduce Cost)
    const { start, end } = getDateRange(filters.preset, filters.startDate, filters.endDate);
    let returnAdjustment = 0;
    let damageWriteOff = 0;

    stockAdjustments.forEach((adj: DbStockAdjustment) => {
      const adjDate = parseISO(adj.created_at);
      if (!isWithinInterval(adjDate, { start, end })) return;

      if (adj.type === 'RETURN') {
        // Returns that went back to RESTOCK reduce Cost
        if (adj.return_action === 'RESTOCK') {
          const costPrice = batchCostMap.get(adj.batch_id) || 0;
          returnAdjustment += costPrice * adj.quantity;
        }
        // SCRAP returns still count as loss (Cost not reversed)
      } else if (adj.type === 'DAMAGE' || adj.type === 'EXPIRED') {
        // Damage/expired is a write-off (loss)
        const costPrice = batchCostMap.get(adj.batch_id) || 0;
        damageWriteOff += costPrice * adj.quantity;
      }
    });

    // Net Sales = TP Sales - Total Discounts
    const netSales = totalTPSales - totalLineDiscount - totalOverallDiscount;
    // Gross Profit = Net Sales - Total Cost (includes free items)
    const grossProfit = netSales - totalCost;
    // Net Profit includes adjustments
    const netProfit = grossProfit + returnAdjustment - damageWriteOff;
    const profitMargin = netSales > 0 ? (netProfit / netSales) * 100 : 0;
    const totalDiscount = totalLineDiscount + totalOverallDiscount;

    return {
      totalSales: netSales, // Net Sales after discounts
      totalTPSales, // TP Sales before discounts
      totalPaid,
      totalDue,
      totalCOGS: totalCost, // Total Cost including free items
      grossProfit,
      returnAdjustment,
      damageWriteOff,
      netProfit,
      invoiceCount: filteredInvoices.length,
      profitMargin,
      // Discount metrics
      totalLineDiscount,
      totalOverallDiscount,
      totalDiscount,
      // Free giveaway metrics (included in totalCost)
      freeGiveawayQty,
      freeGiveawayCost,
    };
  }, [filteredInvoices, allInvoiceLines, batchCostMap, productCategoryMap, stockAdjustments, filters]);

  // Detailed invoice data with P&L
  // Total Cost = Cost Price × (Paid + Free Qty)
  const invoicesWithPL = useMemo((): InvoiceWithPL[] => {
    return filteredInvoices.map(invoice => {
      const lines = allInvoiceLines.filter((line: DbInvoiceLine) => line.invoice_id === invoice.id);
      const customer = customers.find(c => c.id === invoice.customer_id);
      const seller = sellers.find(s => s.id === invoice.seller_id);

      let totalCost = 0; // Cost Price × (Paid + Free Qty)
      let tpSales = 0; // TP Rate × Paid Qty
      let lineDiscounts = 0;
      let freeQty = 0;
      let freeCost = 0;

      lines.forEach((line: DbInvoiceLine) => {
        if (filters.productId && line.product_id !== filters.productId) return;
        if (filters.categoryId) {
          const productCat = productCategoryMap.get(line.product_id);
          if (productCat !== filters.categoryId) return;
        }

        const costPrice = line.cost_price > 0 ? line.cost_price : (batchCostMap.get(line.batch_id || '') || 0);
        const tpRate = (line as any).tp_rate > 0 ? (line as any).tp_rate : costPrice;
        
        const soldQty = line.quantity || 0;
        const lineFreeQty = line.free_quantity || 0;
        
        // CRITICAL: Total Cost includes both paid and free qty
        totalCost += costPrice * (soldQty + lineFreeQty);
        
        // TP Sales = TP Rate × Paid Qty (free items don't add to sales)
        tpSales += tpRate * soldQty;
        
        // Calculate line discount
        const discountType = (line as any).discount_type || 'AMOUNT';
        const discountValue = (line as any).discount_value || 0;
        if (discountType === 'PERCENT') {
          lineDiscounts += (tpRate * soldQty) * discountValue / 100;
        } else {
          lineDiscounts += discountValue;
        }
        
        // Track free separately for display
        if (lineFreeQty > 0) {
          freeQty += lineFreeQty;
          freeCost += costPrice * lineFreeQty;
        }
      });

      // Net Sales = TP Sales - Line Discounts - Overall Discount
      const overallDiscount = invoice.discount || 0;
      const netSales = tpSales - lineDiscounts - overallDiscount;
      
      // Profit = Net Sales - Total Cost
      const profit = netSales - totalCost;
      const profitMargin = netSales > 0 ? (profit / netSales) * 100 : 0;

      return {
        id: invoice.id,
        invoiceNumber: invoice.invoice_number,
        createdAt: invoice.created_at,
        customerName: customer?.name || 'Unknown',
        sellerName: seller?.name || 'N/A',
        total: netSales, // Net Sales after discounts
        paid: invoice.paid,
        due: invoice.due,
        cogs: totalCost, // Total Cost including free items
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
  // Total Cost = Cost Price × (Paid + Free Qty)
  const profitByProduct = useMemo(() => {
    const map = new Map<string, { id: string; name: string; sales: number; cogs: number; profit: number; qty: number; freeQty: number; freeCost: number }>();
    
    filteredInvoices.forEach(invoice => {
      const lines = allInvoiceLines.filter((line: DbInvoiceLine) => line.invoice_id === invoice.id);
      
      lines.forEach((line: DbInvoiceLine) => {
        const product = products.find(p => p.id === line.product_id);
        if (!product) return;

        const costPrice = line.cost_price > 0 ? line.cost_price : (batchCostMap.get(line.batch_id || '') || 0);
        const tpRate = (line as any).tp_rate > 0 ? (line as any).tp_rate : costPrice;
        const soldQty = line.quantity || 0;
        const freeQty = line.free_quantity || 0;
        
        // CRITICAL: Total Cost includes both paid and free qty
        const lineCost = costPrice * (soldQty + freeQty);
        
        // Calculate line discount
        const discountType = (line as any).discount_type || 'AMOUNT';
        const discountValue = (line as any).discount_value || 0;
        let lineDiscount = 0;
        if (discountType === 'PERCENT') {
          lineDiscount = (tpRate * soldQty) * discountValue / 100;
        } else {
          lineDiscount = discountValue;
        }
        
        // Net Sales for this line
        const lineSales = (tpRate * soldQty) - lineDiscount;
        const lineProfit = lineSales - lineCost;
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
        existing.sales += lineSales;
        existing.cogs += lineCost;
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