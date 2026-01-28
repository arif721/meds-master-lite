import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Store, Phone, MapPin, User, Download, Printer, Loader2, Package, TrendingUp, DollarSign, Receipt, ShoppingCart, CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable } from '@/components/DataTable';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useStore as useStoreById, PAYMENT_TERMS_LABELS } from '@/hooks/useStores';
import { useInvoices, useInvoiceLines, usePayments, useProducts } from '@/hooks/useDatabase';
import { formatCurrency, formatDateOnly, formatTimeWithSeconds } from '@/lib/format';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO, format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

type DatePreset = 'today' | 'this_week' | 'this_month' | 'custom';

export default function StoreDetails() {
  const { storeId } = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  
  const { data: store, isLoading: storeLoading } = useStoreById(storeId);
  const { data: allInvoices = [] } = useInvoices();
  const { data: allInvoiceLines = [] } = useInvoiceLines();
  const { data: allPayments = [] } = usePayments();
  const { data: products = [] } = useProducts();

  const [datePreset, setDatePreset] = useState<DatePreset>('this_month');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Calculate date range based on preset
  const dateRange = useMemo(() => {
    const now = new Date();
    switch (datePreset) {
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'this_week':
        return { start: startOfWeek(now, { weekStartsOn: 6 }), end: endOfWeek(now, { weekStartsOn: 6 }) };
      case 'this_month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'custom':
        return {
          start: customDateRange.from ? startOfDay(customDateRange.from) : startOfMonth(now),
          end: customDateRange.to ? endOfDay(customDateRange.to) : endOfMonth(now),
        };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  }, [datePreset, customDateRange]);

  // Filter invoices for this store (include all non-cancelled invoices)
  const storeInvoices = useMemo(() => {
    return allInvoices.filter(inv => inv.store_id === storeId && inv.status !== 'CANCELLED');
  }, [allInvoices, storeId]);
  
  // Confirmed invoices only (for calculations - exclude DRAFT)
  const confirmedStoreInvoices = useMemo(() => {
    return storeInvoices.filter(inv => inv.status !== 'DRAFT');
  }, [storeInvoices]);

  // Filter confirmed invoices by date range (for calculations)
  const rangeInvoices = useMemo(() => {
    return confirmedStoreInvoices.filter((inv) => {
      const invoiceDate = parseISO(inv.created_at);
      return isWithinInterval(invoiceDate, { start: dateRange.start, end: dateRange.end });
    });
  }, [confirmedStoreInvoices, dateRange]);

  // Get invoice lines for range invoices
  const rangeInvoiceIds = useMemo(() => rangeInvoices.map(inv => inv.id), [rangeInvoices]);
  const rangeInvoiceLines = useMemo(() => {
    return allInvoiceLines.filter(line => rangeInvoiceIds.includes(line.invoice_id));
  }, [allInvoiceLines, rangeInvoiceIds]);

  // Get payments for store invoices in range
  const rangePayments = useMemo(() => {
    return allPayments.filter((payment) => {
      const paymentDate = parseISO(payment.created_at);
      return rangeInvoiceIds.includes(payment.invoice_id) && 
             isWithinInterval(paymentDate, { start: dateRange.start, end: dateRange.end });
    });
  }, [allPayments, rangeInvoiceIds, dateRange]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const totalInvoices = rangeInvoices.length;
    const totalSales = rangeInvoices.reduce((sum, inv) => sum + Number(inv.total), 0);
    const totalPaid = rangePayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const totalDue = rangeInvoices.reduce((sum, inv) => sum + Number(inv.due), 0);
    const totalItemsDelivered = rangeInvoiceLines.reduce((sum, line) => 
      sum + Number(line.quantity) + Number(line.free_quantity), 0);
    const totalCogs = rangeInvoiceLines.reduce((sum, line) => 
      sum + (Number(line.cost_price) * Number(line.quantity)), 0);
    const profitLoss = totalSales - totalCogs;

    return {
      totalInvoices,
      totalSales,
      totalPaid,
      totalDue,
      totalItemsDelivered,
      profitLoss,
    };
  }, [rangeInvoices, rangePayments, rangeInvoiceLines]);

  // Top products analysis
  const topProducts = useMemo(() => {
    const productStats: Record<string, {
      productId: string;
      name: string;
      totalQty: number;
      revenue: number;
      cost: number;
      profit: number;
    }> = {};

    rangeInvoiceLines.forEach((line) => {
      const product = products.find(p => p.id === line.product_id);
      if (!product) return;

      if (!productStats[line.product_id]) {
        productStats[line.product_id] = {
          productId: line.product_id,
          name: product.name,
          totalQty: 0,
          revenue: 0,
          cost: 0,
          profit: 0,
        };
      }

      const qty = Number(line.quantity) + Number(line.free_quantity);
      const revenue = Number(line.total);
      const cost = Number(line.cost_price) * Number(line.quantity);

      productStats[line.product_id].totalQty += qty;
      productStats[line.product_id].revenue += revenue;
      productStats[line.product_id].cost += cost;
      productStats[line.product_id].profit += (revenue - cost);
    });

    const totalRevenue = Object.values(productStats).reduce((sum, p) => sum + p.revenue, 0);

    return Object.values(productStats)
      .map(p => ({ ...p, share: totalRevenue > 0 ? (p.revenue / totalRevenue) * 100 : 0 }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [rangeInvoiceLines, products]);

  const mostSoldProduct = topProducts[0];

  // Filtered invoices for Invoices tab
  const filteredInvoices = useMemo(() => {
    return storeInvoices.filter((inv) => {
      // Search filter
      if (invoiceSearch && !inv.invoice_number.toLowerCase().includes(invoiceSearch.toLowerCase())) {
        return false;
      }
      // Status filter
      if (statusFilter !== 'all' && inv.status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [storeInvoices, invoiceSearch, statusFilter]);

  // Products summary for Products tab
  // Products summary for Products tab (only confirmed invoices)
  const productsSummary = useMemo(() => {
    const confirmedInvoiceIds = confirmedStoreInvoices.map(inv => inv.id);
    const storeLines = allInvoiceLines.filter(line => confirmedInvoiceIds.includes(line.invoice_id));
    
    const productStats: Record<string, {
      productId: string;
      name: string;
      totalSoldQty: number;
      totalFreeQty: number;
      totalDelivered: number;
      revenue: number;
      cogs: number;
      profit: number;
    }> = {};

    storeLines.forEach((line) => {
      const product = products.find(p => p.id === line.product_id);
      if (!product) return;

      if (!productStats[line.product_id]) {
        productStats[line.product_id] = {
          productId: line.product_id,
          name: product.name,
          totalSoldQty: 0,
          totalFreeQty: 0,
          totalDelivered: 0,
          revenue: 0,
          cogs: 0,
          profit: 0,
        };
      }

      productStats[line.product_id].totalSoldQty += Number(line.quantity);
      productStats[line.product_id].totalFreeQty += Number(line.free_quantity);
      productStats[line.product_id].totalDelivered += Number(line.quantity) + Number(line.free_quantity);
      productStats[line.product_id].revenue += Number(line.total);
      productStats[line.product_id].cogs += Number(line.cost_price) * Number(line.quantity);
      productStats[line.product_id].profit += Number(line.total) - (Number(line.cost_price) * Number(line.quantity));
    });

    return Object.values(productStats).sort((a, b) => b.revenue - a.revenue);
  }, [confirmedStoreInvoices, allInvoiceLines, products]);

  // Statement data
  const statementData = useMemo(() => {
    const entries: {
      id: string;
      date: string;
      type: 'INVOICE' | 'PAYMENT' | 'RETURN' | 'ADJUSTMENT';
      reference: string;
      debit: number;
      credit: number;
    }[] = [];

    // Add invoices as debits
    rangeInvoices.forEach((inv) => {
      entries.push({
        id: `inv-${inv.id}`,
        date: inv.created_at,
        type: 'INVOICE',
        reference: inv.invoice_number,
        debit: Number(inv.total),
        credit: 0,
      });
    });

    // Add payments as credits
    rangePayments.forEach((payment) => {
      const invoice = allInvoices.find(inv => inv.id === payment.invoice_id);
      entries.push({
        id: `pay-${payment.id}`,
        date: payment.created_at,
        type: 'PAYMENT',
        reference: invoice?.invoice_number || 'Unknown',
        debit: 0,
        credit: Number(payment.amount),
      });
    });

    // Sort by date
    entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate running balance
    let balance = 0;
    const ledger = entries.map((entry) => {
      balance += entry.debit - entry.credit;
      return { ...entry, balance };
    });

    const openingBalance = 0; // Could be calculated from previous periods
    const totalSales = entries.filter(e => e.type === 'INVOICE').reduce((sum, e) => sum + e.debit, 0);
    const totalPayments = entries.filter(e => e.type === 'PAYMENT').reduce((sum, e) => sum + e.credit, 0);
    const closingBalance = openingBalance + totalSales - totalPayments;

    return {
      ledger,
      summary: {
        openingBalance,
        totalSales,
        totalPayments,
        closingBalance,
      },
    };
  }, [rangeInvoices, rangePayments, allInvoices]);

  // Export functions
  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]);
    const rows = data.map(row => headers.map(h => row[h]));
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printStatement = () => {
    window.print();
  };

  if (storeLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold">Store not found</h2>
        <Button variant="link" onClick={() => navigate('/stores')}>
          Go back to stores
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/stores')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Store className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{store.name}</h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {store.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3" /> {store.phone}
                  </span>
                )}
                {store.contact_person && (
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" /> {store.contact_person}
                  </span>
                )}
                {store.address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {store.address}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{PAYMENT_TERMS_LABELS[store.payment_terms]}</Badge>
          <Badge variant="outline">Credit: {formatCurrency(store.credit_limit)}</Badge>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="products">Products Summary</TabsTrigger>
          <TabsTrigger value="statement">Statement</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Date Range Selector */}
          <div className="flex flex-wrap gap-2 items-center">
            <Button
              variant={datePreset === 'today' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDatePreset('today')}
            >
              Today
            </Button>
            <Button
              variant={datePreset === 'this_week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDatePreset('this_week')}
            >
              This Week
            </Button>
            <Button
              variant={datePreset === 'this_month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDatePreset('this_month')}
            >
              This Month
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={datePreset === 'custom' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDatePreset('custom')}
                >
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  Custom
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={{ from: customDateRange.from, to: customDateRange.to }}
                  onSelect={(range) => {
                    setCustomDateRange({ from: range?.from, to: range?.to });
                    setDatePreset('custom');
                  }}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            <span className="text-sm text-muted-foreground ml-4">
              {format(dateRange.start, 'dd MMM yyyy')} - {format(dateRange.end, 'dd MMM yyyy')}
            </span>
          </div>

          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summaryMetrics.totalInvoices}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summaryMetrics.totalSales)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
                <DollarSign className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{formatCurrency(summaryMetrics.totalPaid)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Due</CardTitle>
                <DollarSign className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{formatCurrency(summaryMetrics.totalDue)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Items Delivered</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summaryMetrics.totalItemsDelivered}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Profit/Loss</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={cn("text-2xl font-bold", summaryMetrics.profitLoss >= 0 ? "text-primary" : "text-destructive")}>
                  {formatCurrency(summaryMetrics.profitLoss)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Most Sold Product Highlight */}
          {mostSoldProduct && (
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  Most Sold Product
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xl font-bold">{mostSoldProduct.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {mostSoldProduct.totalQty} units delivered
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold">{formatCurrency(mostSoldProduct.revenue)}</p>
                    <p className="text-sm text-primary">Profit: {formatCurrency(mostSoldProduct.profit)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Top Products Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Top Products</CardTitle>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => exportToCSV(topProducts.map(p => ({
                  Product: p.name,
                  'Qty Delivered': p.totalQty,
                  Revenue: p.revenue,
                  Cost: p.cost,
                  Profit: p.profit,
                  'Share %': p.share.toFixed(1),
                })), `store-${store.name}-top-products`)}
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  { key: 'name', header: 'Product', render: (p) => p.name },
                  { key: 'totalQty', header: 'Qty Delivered', render: (p) => p.totalQty },
                  { key: 'revenue', header: 'Revenue', render: (p) => formatCurrency(p.revenue) },
                  { key: 'cost', header: 'Cost', render: (p) => formatCurrency(p.cost) },
                  { key: 'profit', header: 'Profit', render: (p) => (
                    <span className={p.profit >= 0 ? 'text-primary' : 'text-destructive'}>
                      {formatCurrency(p.profit)}
                    </span>
                  )},
                  { key: 'share', header: '% Share', render: (p) => `${p.share.toFixed(1)}%` },
                ]}
                data={topProducts}
                keyExtractor={(p) => p.productId}
                emptyMessage="No products sold in this period"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-4">
          <div className="flex flex-wrap gap-4 items-center">
            <Input
              placeholder="Search invoice..."
              value={invoiceSearch}
              onChange={(e) => setInvoiceSearch(e.target.value)}
              className="max-w-xs"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="PARTIAL">Partial</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DataTable
            columns={[
              {
                key: 'date',
                header: 'Date & Time',
                render: (inv) => (
                  <div>
                    <p className="font-medium">{formatDateOnly(inv.created_at)}</p>
                    <p className="text-xs text-muted-foreground">{formatTimeWithSeconds(inv.created_at)}</p>
                  </div>
                ),
              },
              { key: 'invoice_number', header: 'Invoice No', render: (inv) => inv.invoice_number },
              { key: 'total', header: 'Total', render: (inv) => formatCurrency(inv.total) },
              { key: 'paid', header: 'Paid', render: (inv) => formatCurrency(inv.paid) },
              { key: 'due', header: 'Due', render: (inv) => (
                <span className={Number(inv.due) > 0 ? 'text-destructive' : 'text-primary'}>
                  {formatCurrency(inv.due)}
                </span>
              )},
              { key: 'status', header: 'Status', render: (inv) => (
                <Badge variant={inv.status === 'PAID' ? 'default' : inv.status === 'PARTIAL' ? 'secondary' : 'outline'}>
                  {inv.status}
                </Badge>
              )},
            ]}
            data={filteredInvoices}
            keyExtractor={(inv) => inv.id}
            emptyMessage="No invoices found"
          />
        </TabsContent>

        {/* Products Summary Tab */}
        <TabsContent value="products" className="space-y-4">
          <div className="flex justify-end">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => exportToCSV(productsSummary.map(p => ({
                Product: p.name,
                'Sold Qty': p.totalSoldQty,
                'Free Qty': p.totalFreeQty,
                'Total Delivered': p.totalDelivered,
                Revenue: p.revenue,
                COGS: p.cogs,
                Profit: p.profit,
              })), `store-${store.name}-products-summary`)}
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>

          <DataTable
            columns={[
              { key: 'name', header: 'Product', render: (p) => p.name },
              { key: 'totalSoldQty', header: 'Sold Qty', render: (p) => p.totalSoldQty },
              { key: 'totalFreeQty', header: 'Free Qty', render: (p) => p.totalFreeQty },
              { key: 'totalDelivered', header: 'Total Delivered', render: (p) => p.totalDelivered },
              { key: 'revenue', header: 'Revenue', render: (p) => formatCurrency(p.revenue) },
              { key: 'cogs', header: 'COGS', render: (p) => formatCurrency(p.cogs) },
              { key: 'profit', header: 'Profit', render: (p) => (
                <span className={p.profit >= 0 ? 'text-primary' : 'text-destructive'}>
                  {formatCurrency(p.profit)}
                </span>
              )},
            ]}
            data={productsSummary}
            keyExtractor={(p) => p.productId}
            emptyMessage="No products sold to this store"
          />
        </TabsContent>

        {/* Statement Tab */}
        <TabsContent value="statement" className="space-y-4 print:space-y-2">
          <div className="flex justify-between items-center print:hidden">
            <div className="flex flex-wrap gap-2 items-center">
              <Button
                variant={datePreset === 'today' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDatePreset('today')}
              >
                Today
              </Button>
              <Button
                variant={datePreset === 'this_week' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDatePreset('this_week')}
              >
                This Week
              </Button>
              <Button
                variant={datePreset === 'this_month' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDatePreset('this_month')}
              >
                This Month
              </Button>
              <span className="text-sm text-muted-foreground ml-4">
                {format(dateRange.start, 'dd MMM yyyy')} - {format(dateRange.end, 'dd MMM yyyy')}
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={printStatement}>
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => exportToCSV(statementData.ledger.map(e => ({
                  Date: formatDateOnly(e.date),
                  Time: formatTimeWithSeconds(e.date),
                  Type: e.type,
                  Reference: e.reference,
                  Debit: e.debit,
                  Credit: e.credit,
                  Balance: e.balance,
                })), `store-${store.name}-statement`)}
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Statement Summary */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">Opening Balance</p>
                <p className="text-xl font-bold">{formatCurrency(statementData.summary.openingBalance)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">Total Sales</p>
                <p className="text-xl font-bold text-primary">{formatCurrency(statementData.summary.totalSales)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">Total Payments</p>
                <p className="text-xl font-bold text-primary">{formatCurrency(statementData.summary.totalPayments)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">Closing Balance / Due</p>
                <p className={cn("text-xl font-bold", statementData.summary.closingBalance > 0 ? "text-destructive" : "text-primary")}>
                  {formatCurrency(statementData.summary.closingBalance)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Ledger Table */}
          <Card>
            <CardHeader>
              <CardTitle>Ledger</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={[
                  {
                    key: 'date',
                    header: 'Date & Time',
                    render: (e) => (
                      <div>
                        <p className="font-medium">{formatDateOnly(e.date)}</p>
                        <p className="text-xs text-muted-foreground">{formatTimeWithSeconds(e.date)}</p>
                      </div>
                    ),
                  },
                  {
                    key: 'type',
                    header: 'Type',
                    render: (e) => (
                      <Badge variant={e.type === 'INVOICE' ? 'outline' : 'default'}>
                        {e.type}
                      </Badge>
                    ),
                  },
                  { key: 'reference', header: 'Reference No', render: (e) => e.reference },
                  {
                    key: 'debit',
                    header: 'Debit (Sales)',
                    render: (e) => e.debit > 0 ? formatCurrency(e.debit) : '-',
                  },
                  {
                    key: 'credit',
                    header: 'Credit (Payments)',
                    render: (e) => e.credit > 0 ? (
                      <span className="text-primary">{formatCurrency(e.credit)}</span>
                    ) : '-',
                  },
                  {
                    key: 'balance',
                    header: 'Balance',
                    render: (e) => (
                      <span className={e.balance > 0 ? 'text-destructive font-medium' : 'text-primary font-medium'}>
                        {formatCurrency(e.balance)}
                      </span>
                    ),
                  },
                ]}
                data={statementData.ledger}
                keyExtractor={(e) => e.id}
                emptyMessage="No transactions in this period"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
