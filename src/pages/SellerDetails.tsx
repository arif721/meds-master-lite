import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Phone, MapPin, Download, Package, TrendingUp, DollarSign, Receipt, Store, CalendarIcon } from 'lucide-react';
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
import { useSellers, useInvoices, useInvoiceLines, useProducts } from '@/hooks/useDatabase';
import { useStores } from '@/hooks/useStores';
import { formatCurrency, formatDateOnly, formatTimeWithSeconds } from '@/lib/format';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO, format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

type DatePreset = 'today' | 'this_week' | 'this_month' | 'custom';

export default function SellerDetails() {
  const { sellerId } = useParams<{ sellerId: string }>();
  const navigate = useNavigate();
  
  const { data: sellers = [] } = useSellers();
  const { data: allInvoices = [] } = useInvoices();
  const { data: allInvoiceLines = [] } = useInvoiceLines();
  const { data: products = [] } = useProducts();
  const { data: stores = [] } = useStores();

  const seller = sellers.find(s => s.id === sellerId);

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

  // Filter invoices for this seller
  const sellerInvoices = useMemo(() => {
    return allInvoices.filter(inv => inv.seller_id === sellerId && inv.status !== 'DRAFT' && inv.status !== 'CANCELLED');
  }, [allInvoices, sellerId]);

  // Filter invoices by date range
  const rangeInvoices = useMemo(() => {
    return sellerInvoices.filter((inv) => {
      const invoiceDate = parseISO(inv.created_at);
      return isWithinInterval(invoiceDate, { start: dateRange.start, end: dateRange.end });
    });
  }, [sellerInvoices, dateRange]);

  // Get invoice lines for range invoices
  const rangeInvoiceIds = useMemo(() => rangeInvoices.map(inv => inv.id), [rangeInvoices]);
  const rangeInvoiceLines = useMemo(() => {
    return allInvoiceLines.filter(line => rangeInvoiceIds.includes(line.invoice_id));
  }, [allInvoiceLines, rangeInvoiceIds]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const totalInvoices = rangeInvoices.length;
    const totalSales = rangeInvoices.reduce((sum, inv) => sum + Number(inv.total), 0);
    const totalDue = rangeInvoices.reduce((sum, inv) => sum + Number(inv.due), 0);
    const totalCogs = rangeInvoiceLines.reduce((sum, line) => 
      sum + (Number(line.cost_price) * Number(line.quantity)), 0);
    const profitLoss = totalSales - totalCogs;

    return {
      totalInvoices,
      totalSales,
      totalDue,
      profitLoss,
    };
  }, [rangeInvoices, rangeInvoiceLines]);

  // Top stores for this seller
  const topStores = useMemo(() => {
    const storeStats: Record<string, {
      storeId: string;
      name: string;
      invoiceCount: number;
      totalSales: number;
      profit: number;
    }> = {};

    rangeInvoices.forEach((inv) => {
      if (!inv.store_id) return;
      const store = stores.find(s => s.id === inv.store_id);
      if (!store) return;

      if (!storeStats[inv.store_id]) {
        storeStats[inv.store_id] = {
          storeId: inv.store_id,
          name: store.name,
          invoiceCount: 0,
          totalSales: 0,
          profit: 0,
        };
      }

      storeStats[inv.store_id].invoiceCount += 1;
      storeStats[inv.store_id].totalSales += Number(inv.total);
    });

    // Add profit calculation
    rangeInvoiceLines.forEach((line) => {
      const invoice = rangeInvoices.find(inv => inv.id === line.invoice_id);
      if (!invoice?.store_id || !storeStats[invoice.store_id]) return;
      
      const revenue = Number(line.total);
      const cost = Number(line.cost_price) * Number(line.quantity);
      storeStats[invoice.store_id].profit += (revenue - cost);
    });

    return Object.values(storeStats).sort((a, b) => b.totalSales - a.totalSales).slice(0, 10);
  }, [rangeInvoices, rangeInvoiceLines, stores]);

  // Top products for this seller
  const topProducts = useMemo(() => {
    const productStats: Record<string, {
      productId: string;
      name: string;
      totalQty: number;
      revenue: number;
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
          profit: 0,
        };
      }

      const qty = Number(line.quantity) + Number(line.free_quantity);
      const revenue = Number(line.total);
      const cost = Number(line.cost_price) * Number(line.quantity);

      productStats[line.product_id].totalQty += qty;
      productStats[line.product_id].revenue += revenue;
      productStats[line.product_id].profit += (revenue - cost);
    });

    return Object.values(productStats).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [rangeInvoiceLines, products]);

  // Filtered invoices for Invoices tab
  const filteredInvoices = useMemo(() => {
    return sellerInvoices.filter((inv) => {
      if (invoiceSearch && !inv.invoice_number.toLowerCase().includes(invoiceSearch.toLowerCase())) {
        return false;
      }
      if (statusFilter !== 'all' && inv.status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [sellerInvoices, invoiceSearch, statusFilter]);

  // Products summary for this seller
  const productsSummary = useMemo(() => {
    const sellerInvoiceIds = sellerInvoices.map(inv => inv.id);
    const sellerLines = allInvoiceLines.filter(line => sellerInvoiceIds.includes(line.invoice_id));
    
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

    sellerLines.forEach((line) => {
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
  }, [sellerInvoices, allInvoiceLines, products]);

  // Stores summary for this seller
  const storesSummary = useMemo(() => {
    const storeStats: Record<string, {
      storeId: string;
      name: string;
      invoiceCount: number;
      totalSales: number;
      totalDue: number;
      profit: number;
    }> = {};

    sellerInvoices.forEach((inv) => {
      if (!inv.store_id) return;
      const store = stores.find(s => s.id === inv.store_id);
      if (!store) return;

      if (!storeStats[inv.store_id]) {
        storeStats[inv.store_id] = {
          storeId: inv.store_id,
          name: store.name,
          invoiceCount: 0,
          totalSales: 0,
          totalDue: 0,
          profit: 0,
        };
      }

      storeStats[inv.store_id].invoiceCount += 1;
      storeStats[inv.store_id].totalSales += Number(inv.total);
      storeStats[inv.store_id].totalDue += Number(inv.due);
    });

    // Add profit calculation
    const sellerInvoiceIds = sellerInvoices.map(inv => inv.id);
    const sellerLines = allInvoiceLines.filter(line => sellerInvoiceIds.includes(line.invoice_id));

    sellerLines.forEach((line) => {
      const invoice = sellerInvoices.find(inv => inv.id === line.invoice_id);
      if (!invoice?.store_id || !storeStats[invoice.store_id]) return;
      
      const revenue = Number(line.total);
      const cost = Number(line.cost_price) * Number(line.quantity);
      storeStats[invoice.store_id].profit += (revenue - cost);
    });

    return Object.values(storeStats).sort((a, b) => b.totalSales - a.totalSales);
  }, [sellerInvoices, allInvoiceLines, stores]);

  // Export function
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

  if (!seller) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold">Seller not found</h2>
        <Button variant="link" onClick={() => navigate('/settings')}>
          Go back to settings
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{seller.name}</h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {seller.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3" /> {seller.phone}
                  </span>
                )}
                {seller.address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {seller.address}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        <Badge variant={seller.active ? 'default' : 'secondary'}>
          {seller.active ? 'Active' : 'Inactive'}
        </Badge>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="products">Products Summary</TabsTrigger>
          <TabsTrigger value="stores">Stores Summary</TabsTrigger>
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
          <div className="grid gap-4 md:grid-cols-4">
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
                <CardTitle className="text-sm font-medium">Total Due</CardTitle>
                <DollarSign className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{formatCurrency(summaryMetrics.totalDue)}</div>
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

          {/* Top Stores & Products */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Store className="w-5 h-5" />
                  Top Stores
                </CardTitle>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => exportToCSV(topStores.map(s => ({
                    Store: s.name,
                    Invoices: s.invoiceCount,
                    Sales: s.totalSales,
                    Profit: s.profit,
                  })), `seller-${seller.name}-top-stores`)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  CSV
                </Button>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={[
                    { key: 'name', header: 'Store', render: (s) => s.name },
                    { key: 'invoiceCount', header: 'Invoices', render: (s) => s.invoiceCount },
                    { key: 'totalSales', header: 'Sales', render: (s) => formatCurrency(s.totalSales) },
                    { key: 'profit', header: 'Profit', render: (s) => (
                      <span className={s.profit >= 0 ? 'text-primary' : 'text-destructive'}>
                        {formatCurrency(s.profit)}
                      </span>
                    )},
                  ]}
                  data={topStores}
                  keyExtractor={(s) => s.storeId}
                  emptyMessage="No stores in this period"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Top Products
                </CardTitle>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => exportToCSV(topProducts.map(p => ({
                    Product: p.name,
                    Qty: p.totalQty,
                    Revenue: p.revenue,
                    Profit: p.profit,
                  })), `seller-${seller.name}-top-products`)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  CSV
                </Button>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={[
                    { key: 'name', header: 'Product', render: (p) => p.name },
                    { key: 'totalQty', header: 'Qty', render: (p) => p.totalQty },
                    { key: 'revenue', header: 'Revenue', render: (p) => formatCurrency(p.revenue) },
                    { key: 'profit', header: 'Profit', render: (p) => (
                      <span className={p.profit >= 0 ? 'text-primary' : 'text-destructive'}>
                        {formatCurrency(p.profit)}
                      </span>
                    )},
                  ]}
                  data={topProducts}
                  keyExtractor={(p) => p.productId}
                  emptyMessage="No products sold in this period"
                />
              </CardContent>
            </Card>
          </div>
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
              { 
                key: 'store', 
                header: 'Store', 
                render: (inv) => stores.find(s => s.id === inv.store_id)?.name || 'N/A'
              },
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
              })), `seller-${seller.name}-products-summary`)}
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
            emptyMessage="No products sold by this seller"
          />
        </TabsContent>

        {/* Stores Summary Tab */}
        <TabsContent value="stores" className="space-y-4">
          <div className="flex justify-end">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => exportToCSV(storesSummary.map(s => ({
                Store: s.name,
                Invoices: s.invoiceCount,
                Sales: s.totalSales,
                Due: s.totalDue,
                Profit: s.profit,
              })), `seller-${seller.name}-stores-summary`)}
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>

          <DataTable
            columns={[
              { key: 'name', header: 'Store', render: (s) => s.name },
              { key: 'invoiceCount', header: 'Invoices', render: (s) => s.invoiceCount },
              { key: 'totalSales', header: 'Total Sales', render: (s) => formatCurrency(s.totalSales) },
              { key: 'totalDue', header: 'Total Due', render: (s) => (
                <span className={s.totalDue > 0 ? 'text-destructive' : 'text-primary'}>
                  {formatCurrency(s.totalDue)}
                </span>
              )},
              { key: 'profit', header: 'Profit', render: (s) => (
                <span className={s.profit >= 0 ? 'text-primary' : 'text-destructive'}>
                  {formatCurrency(s.profit)}
                </span>
              )},
            ]}
            data={storesSummary}
            keyExtractor={(s) => s.storeId}
            emptyMessage="No stores for this seller"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
