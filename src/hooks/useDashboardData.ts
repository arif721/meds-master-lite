import { useMemo } from 'react';
import { useProducts, useBatches, useCustomers, useInvoices, useInvoiceLines, useSellers, useStockAdjustments, usePayments, DbInvoiceLine } from './useDatabase';
import { useSamples, useSampleLines } from './useSamples';
import { useStores } from './useStores';
import { startOfDay, startOfMonth, startOfYear, subDays, parseISO, format, startOfWeek, endOfWeek, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval } from 'date-fns';

export type ChartGranularity = 'daily' | 'weekly' | 'monthly';

export function useDashboardData() {
  const { data: products = [], isLoading: productsLoading } = useProducts();
  const { data: batches = [], isLoading: batchesLoading } = useBatches();
  const { data: customers = [] } = useCustomers();
  const { data: invoices = [], isLoading: invoicesLoading } = useInvoices();
  const { data: allInvoiceLines = [] } = useInvoiceLines();
  const { data: sellers = [] } = useSellers();
  const { data: stores = [] } = useStores();
  const { data: payments = [] } = usePayments();
  const { data: samples = [] } = useSamples();
  const { data: sampleLines = [] } = useSampleLines();
  const { data: stockAdjustments = [] } = useStockAdjustments();

  const isLoading = productsLoading || batchesLoading || invoicesLoading;

  const today = useMemo(() => new Date(), []);
  const startOfToday = useMemo(() => startOfDay(today), [today]);
  const startOfThisMonth = useMemo(() => startOfMonth(today), [today]);
  const startOfThisYear = useMemo(() => startOfYear(today), [today]);

  const confirmedInvoices = useMemo(() =>
    invoices.filter(inv => inv.status !== 'DRAFT' && inv.status !== 'CANCELLED' && !inv.is_deleted),
    [invoices]
  );

  // Batch cost map
  const batchCostMap = useMemo(() => {
    const map = new Map<string, number>();
    batches.forEach(b => map.set(b.id, b.cost_price));
    return map;
  }, [batches]);

  // ---- KPI METRICS ----
  const kpiMetrics = useMemo(() => {
    const totalStockQty = batches.reduce((s, b) => s + b.quantity, 0);
    const totalStockCost = batches.reduce((s, b) => s + b.quantity * Number(b.cost_price), 0);
    const totalInventoryValue = totalStockCost;

    // Sales helpers
    const salesInPeriod = (start: Date) =>
      confirmedInvoices.filter(inv => new Date(inv.created_at) >= start);

    const todayInvoices = salesInPeriod(startOfToday);
    const monthInvoices = salesInPeriod(startOfThisMonth);
    const yearInvoices = salesInPeriod(startOfThisYear);

    const todaySales = todayInvoices.reduce((s, inv) => s + Number(inv.total), 0);
    const monthSales = monthInvoices.reduce((s, inv) => s + Number(inv.total), 0);
    const yearSales = yearInvoices.reduce((s, inv) => s + Number(inv.total), 0);
    const totalDue = confirmedInvoices.reduce((s, inv) => s + Number(inv.due), 0);

    // Profit calculation
    const calcProfit = (invs: typeof confirmedInvoices) => {
      let tpSales = 0, totalCost = 0, totalDiscount = 0;
      invs.forEach(inv => {
        const lines = allInvoiceLines.filter((l: DbInvoiceLine) => l.invoice_id === inv.id);
        lines.forEach((l: DbInvoiceLine) => {
          const cost = l.cost_price > 0 ? l.cost_price : (batchCostMap.get(l.batch_id || '') || 0);
          const tp = l.tp_rate > 0 ? l.tp_rate : cost;
          tpSales += tp * l.quantity;
          totalCost += cost * (l.quantity + l.free_quantity);
          const dv = l.discount_value || 0;
          if (l.discount_type === 'PERCENT') {
            totalDiscount += (tp * l.quantity) * dv / 100;
          } else {
            totalDiscount += dv;
          }
        });
        totalDiscount += inv.discount || 0;
      });
      return tpSales - totalDiscount - totalCost;
    };

    const todayProfit = calcProfit(todayInvoices);
    const monthProfit = calcProfit(monthInvoices);

    // Free items this month
    const monthFreeItems = monthInvoices.reduce((s, inv) => {
      const lines = allInvoiceLines.filter((l: DbInvoiceLine) => l.invoice_id === inv.id);
      return s + lines.reduce((ls, l: DbInvoiceLine) => ls + l.free_quantity, 0);
    }, 0);

    // Stock vs Sales ratio
    const avgDailySales = yearSales > 0 ? yearSales / Math.max(1, Math.ceil((today.getTime() - startOfThisYear.getTime()) / 86400000)) : 0;
    const stockSalesRatio = avgDailySales > 0 ? (totalInventoryValue / avgDailySales) * 100 : 0;

    // Low stock / expiry
    const lowStockProducts = products.filter(p => {
      const stock = batches.filter(b => b.product_id === p.id).reduce((s, b) => s + b.quantity, 0);
      return stock < 50 && stock > 0;
    });
    const nearExpiryBatches = batches.filter(b => b.quantity > 0 && b.expiry_date && (() => {
      const d = Math.ceil((new Date(b.expiry_date!).getTime() - today.getTime()) / 86400000);
      return d > 0 && d <= 60;
    })());
    const expiredBatches = batches.filter(b => b.quantity > 0 && b.expiry_date && new Date(b.expiry_date) < today);

    return {
      totalInventoryValue, totalStockQty, totalStockCost,
      todaySales, monthSales, yearSales, totalDue,
      todayProfit, monthProfit,
      monthFreeItems,
      stockSalesRatio,
      lowStockCount: lowStockProducts.length,
      nearExpiryCount: nearExpiryBatches.length,
      expiredCount: expiredBatches.length,
      lowStockProducts, nearExpiryBatches, expiredBatches,
    };
  }, [products, batches, confirmedInvoices, allInvoiceLines, batchCostMap, today, startOfToday, startOfThisMonth, startOfThisYear]);

  // ---- CHART DATA ----
  const getChartData = useMemo(() => (granularity: ChartGranularity) => {
    const now = new Date();
    let intervals: Date[];
    let formatStr: string;

    if (granularity === 'daily') {
      intervals = eachDayOfInterval({ start: subDays(now, 29), end: now });
      formatStr = 'dd MMM';
    } else if (granularity === 'weekly') {
      intervals = eachWeekOfInterval({ start: subDays(now, 90), end: now }, { weekStartsOn: 6 });
      formatStr = 'dd MMM';
    } else {
      intervals = eachMonthOfInterval({ start: startOfYear(now), end: now });
      formatStr = 'MMM yy';
    }

    return intervals.map(date => {
      const start = granularity === 'daily' ? startOfDay(date) :
        granularity === 'weekly' ? startOfWeek(date, { weekStartsOn: 6 }) : startOfMonth(date);
      const end = granularity === 'daily' ? new Date(start.getTime() + 86400000) :
        granularity === 'weekly' ? endOfWeek(date, { weekStartsOn: 6 }) : new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59);

      let sales = 0, tpSales = 0, totalCost = 0, totalDiscount = 0;
      confirmedInvoices.forEach(inv => {
        const d = new Date(inv.created_at);
        if (d >= start && d <= end) {
          sales += Number(inv.total);
          const lines = allInvoiceLines.filter((l: DbInvoiceLine) => l.invoice_id === inv.id);
          lines.forEach((l: DbInvoiceLine) => {
            const cost = l.cost_price > 0 ? l.cost_price : (batchCostMap.get(l.batch_id || '') || 0);
            const tp = l.tp_rate > 0 ? l.tp_rate : cost;
            tpSales += tp * l.quantity;
            totalCost += cost * (l.quantity + l.free_quantity);
            const dv = l.discount_value || 0;
            if (l.discount_type === 'PERCENT') totalDiscount += (tp * l.quantity) * dv / 100;
            else totalDiscount += dv;
          });
          totalDiscount += inv.discount || 0;
        }
      });
      const profit = tpSales - totalDiscount - totalCost;

      return { label: format(date, formatStr), sales, profit };
    });
  }, [confirmedInvoices, allInvoiceLines, batchCostMap]);

  // ---- STORE-WISE DATA ----
  const storeWiseData = useMemo(() => {
    return stores.slice(0, 10).map(store => {
      const storeInvoices = confirmedInvoices.filter(inv => inv.store_id === store.id);
      const sales = storeInvoices.reduce((s, inv) => s + Number(inv.total), 0);
      let tpSales = 0, totalCost = 0, totalDiscount = 0;
      storeInvoices.forEach(inv => {
        const lines = allInvoiceLines.filter((l: DbInvoiceLine) => l.invoice_id === inv.id);
        lines.forEach((l: DbInvoiceLine) => {
          const cost = l.cost_price > 0 ? l.cost_price : (batchCostMap.get(l.batch_id || '') || 0);
          const tp = l.tp_rate > 0 ? l.tp_rate : cost;
          tpSales += tp * l.quantity;
          totalCost += cost * (l.quantity + l.free_quantity);
          const dv = l.discount_value || 0;
          if (l.discount_type === 'PERCENT') totalDiscount += (tp * l.quantity) * dv / 100;
          else totalDiscount += dv;
        });
        totalDiscount += inv.discount || 0;
      });
      return { name: store.name.length > 15 ? store.name.slice(0, 15) + '…' : store.name, sales, profit: tpSales - totalDiscount - totalCost };
    }).filter(s => s.sales > 0).sort((a, b) => b.sales - a.sales);
  }, [stores, confirmedInvoices, allInvoiceLines, batchCostMap]);

  // ---- ALERTS ----
  const alerts = useMemo(() => {
    // Negative profit invoices
    const negProfitInvoices = confirmedInvoices.filter(inv => {
      const lines = allInvoiceLines.filter((l: DbInvoiceLine) => l.invoice_id === inv.id);
      let tpSales = 0, totalCost = 0, totalDiscount = 0;
      lines.forEach((l: DbInvoiceLine) => {
        const cost = l.cost_price > 0 ? l.cost_price : (batchCostMap.get(l.batch_id || '') || 0);
        const tp = l.tp_rate > 0 ? l.tp_rate : cost;
        tpSales += tp * l.quantity;
        totalCost += cost * (l.quantity + l.free_quantity);
        const dv = l.discount_value || 0;
        if (l.discount_type === 'PERCENT') totalDiscount += (tp * l.quantity) * dv / 100;
        else totalDiscount += dv;
      });
      totalDiscount += inv.discount || 0;
      return (tpSales - totalDiscount - totalCost) < 0;
    }).length;

    // High discount invoices (top 5)
    const highDiscountInvoices = [...confirmedInvoices]
      .sort((a, b) => Number(b.discount) - Number(a.discount))
      .slice(0, 5)
      .filter(inv => Number(inv.discount) > 0);

    // Samples last 7 days
    const last7Days = subDays(today, 7);
    const recentSamples = samples.filter(s => !s.is_deleted && s.status === 'CONFIRMED' && new Date(s.created_at) >= last7Days);

    // Pending payment invoices
    const pendingPayment = confirmedInvoices.filter(inv => Number(inv.due) > 0);
    const pendingAmount = pendingPayment.reduce((s, inv) => s + Number(inv.due), 0);

    return { negProfitInvoices, highDiscountInvoices, recentSamplesCount: recentSamples.length, pendingPaymentCount: pendingPayment.length, pendingAmount };
  }, [confirmedInvoices, allInvoiceLines, batchCostMap, samples, today]);

  // ---- QUICK INSIGHTS ----
  const insights = useMemo(() => {
    // Best selling product (qty)
    const productQtyMap = new Map<string, number>();
    confirmedInvoices.forEach(inv => {
      const lines = allInvoiceLines.filter((l: DbInvoiceLine) => l.invoice_id === inv.id);
      lines.forEach((l: DbInvoiceLine) => {
        productQtyMap.set(l.product_id, (productQtyMap.get(l.product_id) || 0) + l.quantity);
      });
    });
    let bestSellingProduct = { name: '—', qty: 0 };
    productQtyMap.forEach((qty, pid) => {
      if (qty > bestSellingProduct.qty) {
        const p = products.find(pr => pr.id === pid);
        bestSellingProduct = { name: p?.name || 'Unknown', qty };
      }
    });

    // Most profitable product
    const productProfitMap = new Map<string, number>();
    confirmedInvoices.forEach(inv => {
      const lines = allInvoiceLines.filter((l: DbInvoiceLine) => l.invoice_id === inv.id);
      lines.forEach((l: DbInvoiceLine) => {
        const cost = l.cost_price > 0 ? l.cost_price : (batchCostMap.get(l.batch_id || '') || 0);
        const tp = l.tp_rate > 0 ? l.tp_rate : cost;
        const lineProfit = (tp * l.quantity) - (cost * (l.quantity + l.free_quantity));
        productProfitMap.set(l.product_id, (productProfitMap.get(l.product_id) || 0) + lineProfit);
      });
    });
    let mostProfitableProduct = { name: '—', profit: 0 };
    productProfitMap.forEach((profit, pid) => {
      if (profit > mostProfitableProduct.profit) {
        const p = products.find(pr => pr.id === pid);
        mostProfitableProduct = { name: p?.name || 'Unknown', profit };
      }
    });

    // Top customer (sales)
    const customerSalesMap = new Map<string, number>();
    confirmedInvoices.forEach(inv => {
      if (inv.customer_id) customerSalesMap.set(inv.customer_id, (customerSalesMap.get(inv.customer_id) || 0) + Number(inv.total));
    });
    let topCustomer = { name: '—', sales: 0 };
    customerSalesMap.forEach((sales, cid) => {
      if (sales > topCustomer.sales) {
        const c = customers.find(cu => cu.id === cid) || stores.find(s => s.id === cid);
        topCustomer = { name: (c as any)?.name || 'Unknown', sales };
      }
    });

    // Top seller
    const sellerSalesMap = new Map<string, number>();
    confirmedInvoices.forEach(inv => {
      if (inv.seller_id) sellerSalesMap.set(inv.seller_id, (sellerSalesMap.get(inv.seller_id) || 0) + Number(inv.total));
    });
    let topSeller = { name: '—', sales: 0 };
    sellerSalesMap.forEach((sales, sid) => {
      if (sales > topSeller.sales) {
        const s = sellers.find(se => se.id === sid);
        topSeller = { name: s?.name || 'Unknown', sales };
      }
    });

    return { bestSellingProduct, mostProfitableProduct, topCustomer, topSeller };
  }, [confirmedInvoices, allInvoiceLines, products, customers, sellers, stores, batchCostMap]);

  // ---- INVENTORY INTELLIGENCE ----
  const inventoryIntel = useMemo(() => {
    const now = new Date();
    // Product last sold date
    const productLastSold = new Map<string, Date>();
    const productAvgDaily = new Map<string, number>();

    confirmedInvoices.forEach(inv => {
      const lines = allInvoiceLines.filter((l: DbInvoiceLine) => l.invoice_id === inv.id);
      lines.forEach((l: DbInvoiceLine) => {
        const d = new Date(inv.created_at);
        const existing = productLastSold.get(l.product_id);
        if (!existing || d > existing) productLastSold.set(l.product_id, d);
      });
    });

    // Avg daily sales (last 90 days)
    const last90 = subDays(now, 90);
    const last90Invoices = confirmedInvoices.filter(inv => new Date(inv.created_at) >= last90);
    const productQty90 = new Map<string, number>();
    last90Invoices.forEach(inv => {
      const lines = allInvoiceLines.filter((l: DbInvoiceLine) => l.invoice_id === inv.id);
      lines.forEach((l: DbInvoiceLine) => {
        productQty90.set(l.product_id, (productQty90.get(l.product_id) || 0) + l.quantity);
      });
    });
    productQty90.forEach((qty, pid) => productAvgDaily.set(pid, qty / 90));

    // Dead stock (30/60/90 days)
    const deadStock30 = products.filter(p => {
      const stock = batches.filter(b => b.product_id === p.id).reduce((s, b) => s + b.quantity, 0);
      const lastSold = productLastSold.get(p.id);
      return stock > 0 && (!lastSold || (now.getTime() - lastSold.getTime()) > 30 * 86400000);
    }).length;

    const deadStock60 = products.filter(p => {
      const stock = batches.filter(b => b.product_id === p.id).reduce((s, b) => s + b.quantity, 0);
      const lastSold = productLastSold.get(p.id);
      return stock > 0 && (!lastSold || (now.getTime() - lastSold.getTime()) > 60 * 86400000);
    }).length;

    const deadStock90 = products.filter(p => {
      const stock = batches.filter(b => b.product_id === p.id).reduce((s, b) => s + b.quantity, 0);
      const lastSold = productLastSold.get(p.id);
      return stock > 0 && (!lastSold || (now.getTime() - lastSold.getTime()) > 90 * 86400000);
    }).length;

    // Fast moving (top 5 by qty in 90 days)
    const fastMoving = Array.from(productQty90.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([pid, qty]) => ({
        name: products.find(p => p.id === pid)?.name || 'Unknown',
        qty: Math.round(qty),
      }));

    // Stock coverage days
    let totalCoverageDays = 0;
    let productsWithCoverage = 0;
    products.forEach(p => {
      const stock = batches.filter(b => b.product_id === p.id).reduce((s, b) => s + b.quantity, 0);
      const avgDaily = productAvgDaily.get(p.id) || 0;
      if (stock > 0 && avgDaily > 0) {
        totalCoverageDays += stock / avgDaily;
        productsWithCoverage++;
      }
    });
    const avgCoverageDays = productsWithCoverage > 0 ? Math.round(totalCoverageDays / productsWithCoverage) : 0;

    return { deadStock30, deadStock60, deadStock90, fastMoving, avgCoverageDays };
  }, [products, batches, confirmedInvoices, allInvoiceLines]);

  // ---- PAYMENTS OVERVIEW ----
  const paymentsOverview = useMemo(() => {
    const paidToday = payments.filter(p => new Date(p.created_at) >= startOfToday)
      .reduce((s, p) => s + Number(p.amount), 0);

    const dueToday = confirmedInvoices
      .filter(inv => new Date(inv.created_at).toDateString() === today.toDateString() && Number(inv.due) > 0)
      .reduce((s, inv) => s + Number(inv.due), 0);

    const overdueInvoices = confirmedInvoices.filter(inv => Number(inv.due) > 0).length;

    const lastPayment = payments.length > 0
      ? payments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
      : null;
    const lastPaymentCustomer = lastPayment
      ? (() => {
          const inv = invoices.find(i => i.id === lastPayment.invoice_id);
          const c = inv?.customer_id ? (customers.find(cu => cu.id === inv.customer_id) || stores.find(s => s.id === inv.store_id)) : null;
          return (c as any)?.name || 'Unknown';
        })()
      : '—';

    return {
      paidToday,
      dueToday,
      overdueInvoices,
      lastPaymentAmount: lastPayment ? Number(lastPayment.amount) : 0,
      lastPaymentCustomer,
    };
  }, [payments, confirmedInvoices, invoices, customers, stores, today, startOfToday]);

  // ---- SAMPLES OVERVIEW ----
  const samplesOverview = useMemo(() => {
    const monthSamples = samples.filter(s => !s.is_deleted && s.status === 'CONFIRMED' && new Date(s.created_at) >= startOfThisMonth);
    const monthSampleQty = monthSamples.length;
    const monthSampleValue = monthSamples.reduce((s, sam) => s + Number(sam.total_value), 0);

    // Top sampled product
    const prodMap = new Map<string, { name: string; qty: number }>();
    const monthSampleIds = monthSamples.map(s => s.id);
    sampleLines.filter(sl => monthSampleIds.includes(sl.sample_id)).forEach(sl => {
      const p = products.find(pr => pr.id === sl.product_id);
      const existing = prodMap.get(sl.product_id) || { name: p?.name || 'Unknown', qty: 0 };
      existing.qty += sl.quantity;
      prodMap.set(sl.product_id, existing);
    });
    let topSampledProduct = { name: '—', qty: 0 };
    prodMap.forEach(v => { if (v.qty > topSampledProduct.qty) topSampledProduct = v; });

    // Top receiver
    const receiverMap = new Map<string, number>();
    monthSamples.forEach(s => {
      const name = s.receiver_name || 'Unknown';
      receiverMap.set(name, (receiverMap.get(name) || 0) + 1);
    });
    let topReceiver = { name: '—', count: 0 };
    receiverMap.forEach((count, name) => { if (count > topReceiver.count) topReceiver = { name, count }; });

    return { monthSampleQty, monthSampleValue, topSampledProduct, topReceiver };
  }, [samples, sampleLines, products, startOfThisMonth]);

  // Recent invoices
  const recentInvoices = useMemo(() =>
    [...invoices].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5),
    [invoices]
  );

  return {
    isLoading,
    products, batches, customers, sellers, stores, invoices, payments,
    kpiMetrics,
    getChartData,
    storeWiseData,
    alerts,
    insights,
    inventoryIntel,
    paymentsOverview,
    samplesOverview,
    recentInvoices,
    confirmedInvoices,
    allInvoiceLines,
  };
}
