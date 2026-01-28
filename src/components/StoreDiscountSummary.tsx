import { useState, useMemo } from 'react';
import { Download, PercentIcon, DollarSign, TrendingDown, Gift, Store as StoreIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useInvoices, useInvoiceLines, useProducts, DbInvoice, DbInvoiceLine } from '@/hooks/useDatabase';
import { useStores } from '@/hooks/useStores';
import { formatCurrency, formatDateOnly } from '@/lib/format';
import { startOfMonth, endOfMonth, startOfDay, endOfDay, isWithinInterval, parseISO, format } from 'date-fns';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type DatePreset = 'this_month' | 'last_month' | 'custom';

export function StoreDiscountSummary() {
  const { data: invoices = [] } = useInvoices();
  const { data: invoiceLines = [] } = useInvoiceLines();
  const { data: stores = [] } = useStores();
  const { data: products = [] } = useProducts();

  const [datePreset, setDatePreset] = useState<DatePreset>('this_month');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [selectedStoreId, setSelectedStoreId] = useState<string>('all');

  // Calculate date range
  const dateRange = useMemo(() => {
    const now = new Date();
    switch (datePreset) {
      case 'this_month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'last_month':
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      case 'custom':
        return {
          start: customDateRange.from ? startOfDay(customDateRange.from) : startOfMonth(now),
          end: customDateRange.to ? endOfDay(customDateRange.to) : endOfMonth(now),
        };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  }, [datePreset, customDateRange]);

  // Filter invoices by date and store
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (inv.status === 'DRAFT' || inv.status === 'CANCELLED') return false;
      
      const invoiceDate = parseISO(inv.created_at);
      if (!isWithinInterval(invoiceDate, { start: dateRange.start, end: dateRange.end })) return false;
      
      if (selectedStoreId !== 'all' && inv.store_id !== selectedStoreId) return false;
      
      return true;
    });
  }, [invoices, dateRange, selectedStoreId]);

  // Calculate store-wise discount summary
  const storeDiscountSummary = useMemo(() => {
    const storeMap = new Map<string, {
      storeId: string;
      storeName: string;
      totalSales: number;
      totalDiscount: number;
      overallDiscountAmount: number;
      lineDiscountAmount: number;
      lineDiscountPercent: number;
      percentDiscountCount: number;
      amountDiscountCount: number;
      invoiceCount: number;
      freeQty: number;
      freeCost: number;
    }>();

    filteredInvoices.forEach((invoice) => {
      const storeId = invoice.store_id || 'no-store';
      const store = stores.find(s => s.id === storeId);
      const storeName = store?.name || 'No Store';
      
      if (!storeMap.has(storeId)) {
        storeMap.set(storeId, {
          storeId,
          storeName,
          totalSales: 0,
          totalDiscount: 0,
          overallDiscountAmount: 0,
          lineDiscountAmount: 0,
          lineDiscountPercent: 0,
          percentDiscountCount: 0,
          amountDiscountCount: 0,
          invoiceCount: 0,
          freeQty: 0,
          freeCost: 0,
        });
      }

      const stats = storeMap.get(storeId)!;
      stats.totalSales += Number(invoice.total);
      stats.overallDiscountAmount += Number(invoice.discount);
      stats.invoiceCount += 1;

      // Calculate line-level discounts
      const lines = invoiceLines.filter((l) => l.invoice_id === invoice.id);
      lines.forEach((line) => {
        const discountValue = Number(line.discount_value) || 0;
        const discountType = (line as any).discount_type || 'AMOUNT';
        const mrp = Number(line.unit_price) || 0;
        const qty = Number(line.quantity) || 0;
        const freeQty = Number(line.free_quantity) || 0;
        const tpRate = Number(line.tp_rate) || Number(line.cost_price) || 0;

        if (discountValue > 0) {
          if (discountType === 'PERCENT') {
            const discountAmount = (qty * mrp * discountValue) / 100;
            stats.lineDiscountPercent += discountAmount;
            stats.percentDiscountCount += 1;
          } else {
            stats.lineDiscountAmount += discountValue;
            stats.amountDiscountCount += 1;
          }
        }

        // Track free items
        if (freeQty > 0) {
          stats.freeQty += freeQty;
          stats.freeCost += freeQty * tpRate;
        }
      });
    });

    // Calculate totals
    storeMap.forEach((stats) => {
      stats.totalDiscount = stats.overallDiscountAmount + stats.lineDiscountAmount + stats.lineDiscountPercent;
    });

    return Array.from(storeMap.values()).sort((a, b) => b.totalDiscount - a.totalDiscount);
  }, [filteredInvoices, invoiceLines, stores]);

  // Top discounted products
  const topDiscountedProducts = useMemo(() => {
    const productMap = new Map<string, {
      productId: string;
      productName: string;
      totalDiscount: number;
      discountCount: number;
    }>();

    filteredInvoices.forEach((invoice) => {
      const lines = invoiceLines.filter((l) => l.invoice_id === invoice.id);
      lines.forEach((line) => {
        const discountValue = Number(line.discount_value) || 0;
        if (discountValue === 0) return;

        const product = products.find(p => p.id === line.product_id);
        if (!product) return;

        const discountType = (line as any).discount_type || 'AMOUNT';
        const mrp = Number(line.unit_price) || 0;
        const qty = Number(line.quantity) || 0;
        
        let discountAmount = discountValue;
        if (discountType === 'PERCENT') {
          discountAmount = (qty * mrp * discountValue) / 100;
        }

        if (!productMap.has(line.product_id)) {
          productMap.set(line.product_id, {
            productId: line.product_id,
            productName: product.name,
            totalDiscount: 0,
            discountCount: 0,
          });
        }

        const stats = productMap.get(line.product_id)!;
        stats.totalDiscount += discountAmount;
        stats.discountCount += 1;
      });
    });

    return Array.from(productMap.values())
      .sort((a, b) => b.totalDiscount - a.totalDiscount)
      .slice(0, 10);
  }, [filteredInvoices, invoiceLines, products]);

  // Monthly discount recipients
  const discountRecipients = useMemo(() => {
    return storeDiscountSummary
      .filter(s => s.totalDiscount > 0)
      .map(s => ({
        storeName: s.storeName,
        totalSales: s.totalSales,
        totalDiscount: s.totalDiscount,
        invoiceCount: s.invoiceCount,
        discountPercent: s.totalSales > 0 ? (s.totalDiscount / (s.totalSales + s.totalDiscount)) * 100 : 0,
      }))
      .sort((a, b) => b.totalDiscount - a.totalDiscount);
  }, [storeDiscountSummary]);

  // Overall totals
  const totals = useMemo(() => {
    return storeDiscountSummary.reduce(
      (acc, s) => ({
        totalSales: acc.totalSales + s.totalSales,
        totalDiscount: acc.totalDiscount + s.totalDiscount,
        overallDiscount: acc.overallDiscount + s.overallDiscountAmount,
        lineDiscountAmount: acc.lineDiscountAmount + s.lineDiscountAmount,
        lineDiscountPercent: acc.lineDiscountPercent + s.lineDiscountPercent,
        percentCount: acc.percentCount + s.percentDiscountCount,
        amountCount: acc.amountCount + s.amountDiscountCount,
        freeQty: acc.freeQty + s.freeQty,
        freeCost: acc.freeCost + s.freeCost,
      }),
      { 
        totalSales: 0, 
        totalDiscount: 0, 
        overallDiscount: 0, 
        lineDiscountAmount: 0, 
        lineDiscountPercent: 0,
        percentCount: 0,
        amountCount: 0,
        freeQty: 0,
        freeCost: 0,
      }
    );
  }, [storeDiscountSummary]);

  const exportToCSV = () => {
    const headers = ['Store', 'Total Sales', 'Total Discount', 'Overall Discount', 'Line Discount (৳)', 'Line Discount (%)', 'Invoice Count'];
    const rows = storeDiscountSummary.map(s => [
      s.storeName,
      s.totalSales,
      s.totalDiscount,
      s.overallDiscountAmount,
      s.lineDiscountAmount,
      s.lineDiscountPercent,
      s.invoiceCount,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `store-discount-summary-${format(dateRange.start, 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <Select value={datePreset} onValueChange={(v) => setDatePreset(v as DatePreset)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="this_month">This Month</SelectItem>
            <SelectItem value="last_month">Last Month</SelectItem>
            <SelectItem value="custom">Custom Range</SelectItem>
          </SelectContent>
        </Select>

        {datePreset === 'custom' && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <CalendarIcon className="w-4 h-4" />
                {customDateRange.from ? format(customDateRange.from, 'dd MMM') : 'Start'} - {customDateRange.to ? format(customDateRange.to, 'dd MMM') : 'End'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={{ from: customDateRange.from, to: customDateRange.to }}
                onSelect={(range) => setCustomDateRange({ from: range?.from, to: range?.to })}
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        )}

        <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Stores" />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="all">All Stores</SelectItem>
            {stores.filter(s => s.active).map((store) => (
              <SelectItem key={store.id} value={store.id}>
                {store.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="text-sm text-muted-foreground">
          {format(dateRange.start, 'dd MMM yyyy')} - {format(dateRange.end, 'dd MMM yyyy')}
        </span>

        <Button variant="outline" size="sm" onClick={exportToCSV} className="ml-auto">
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales (Paid)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.totalSales)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Discount Given</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatCurrency(totals.totalDiscount)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Discount Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount (৳):</span>
                <span className="font-medium">{formatCurrency(totals.lineDiscountAmount)} ({totals.amountCount})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Percent (%):</span>
                <span className="font-medium">{formatCurrency(totals.lineDiscountPercent)} ({totals.percentCount})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Overall:</span>
                <span className="font-medium">{formatCurrency(totals.overallDiscount)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Free Giveaways</CardTitle>
            <Gift className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.freeQty} units</div>
            <p className="text-xs text-muted-foreground">Cost: {formatCurrency(totals.freeCost)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Store-wise Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Store-wise Discount Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Store</TableHead>
                <TableHead className="text-right">Total Sales</TableHead>
                <TableHead className="text-right">Total Discount</TableHead>
                <TableHead className="text-right">Discount %</TableHead>
                <TableHead className="text-right">Invoices</TableHead>
                <TableHead className="text-right">Free Qty</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {storeDiscountSummary.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No data for this period
                  </TableCell>
                </TableRow>
              ) : (
                storeDiscountSummary.map((store) => {
                  const discountPercent = store.totalSales > 0 
                    ? (store.totalDiscount / (store.totalSales + store.totalDiscount)) * 100 
                    : 0;
                  return (
                    <TableRow key={store.storeId}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <StoreIcon className="w-4 h-4 text-muted-foreground" />
                          {store.storeName}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(store.totalSales)}</TableCell>
                      <TableCell className="text-right text-destructive">{formatCurrency(store.totalDiscount)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={discountPercent > 10 ? 'destructive' : 'secondary'}>
                          {discountPercent.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{store.invoiceCount}</TableCell>
                      <TableCell className="text-right">
                        {store.freeQty > 0 && (
                          <span className="text-primary">{store.freeQty}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Top Discounted Products */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top Discounted Products</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Total Discount</TableHead>
                <TableHead className="text-right">Discount Count</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topDiscountedProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    No discounted products
                  </TableCell>
                </TableRow>
              ) : (
                topDiscountedProducts.map((product) => (
                  <TableRow key={product.productId}>
                    <TableCell className="font-medium">{product.productName}</TableCell>
                    <TableCell className="text-right text-destructive">{formatCurrency(product.totalDiscount)}</TableCell>
                    <TableCell className="text-right">{product.discountCount}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Monthly Discount Recipients */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">এই মাসে কাকে কত Discount দিলাম</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Store</TableHead>
                <TableHead className="text-right">Total Sales</TableHead>
                <TableHead className="text-right">Discount Given</TableHead>
                <TableHead className="text-right">Discount %</TableHead>
                <TableHead className="text-right">Invoice Count</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {discountRecipients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No discounts given this period
                  </TableCell>
                </TableRow>
              ) : (
                discountRecipients.map((recipient, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{recipient.storeName}</TableCell>
                    <TableCell className="text-right">{formatCurrency(recipient.totalSales)}</TableCell>
                    <TableCell className="text-right text-destructive font-medium">{formatCurrency(recipient.totalDiscount)}</TableCell>
                    <TableCell className="text-right">{recipient.discountPercent.toFixed(1)}%</TableCell>
                    <TableCell className="text-right">{recipient.invoiceCount}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
