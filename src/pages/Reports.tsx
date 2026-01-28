import { useState, useMemo } from 'react';
import { FileText, Download, TrendingUp, Package, Users, AlertTriangle, Gift, RotateCcw, Trash2, DollarSign, Loader2 } from 'lucide-react';
import { ProfitLossReport } from '@/components/ProfitLossReport';
import { DateRangePreset, useProfitLoss, getDateRange } from '@/hooks/useProfitLoss';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/DataTable';
import { MetricCard } from '@/components/MetricCard';
import { useProducts, useBatches, useCustomers, useInvoices, useInvoiceLines, useCategories, useStockAdjustments } from '@/hooks/useDatabase';
import { formatCurrency, formatDate, isExpired, isExpiringSoon, getDaysUntilExpiry } from '@/lib/format';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { startOfDay, endOfDay, isWithinInterval, parseISO } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type ReportPeriod = 'today' | 'week' | 'month' | 'year' | 'all';

// Map local period to P&L preset
const periodToPreset: Record<ReportPeriod, DateRangePreset> = {
  today: 'today',
  week: 'week',
  month: 'month',
  year: 'year',
  all: 'all',
};

export default function Reports() {
  // Database hooks - all data from Supabase
  const { data: products = [], isLoading: productsLoading } = useProducts();
  const { data: batches = [], isLoading: batchesLoading } = useBatches();
  const { data: customers = [], isLoading: customersLoading } = useCustomers();
  const { data: invoices = [], isLoading: invoicesLoading } = useInvoices();
  const { data: invoiceLines = [], isLoading: linesLoading } = useInvoiceLines();
  const { data: categories = [] } = useCategories();
  const { data: stockAdjustments = [], isLoading: adjustmentsLoading } = useStockAdjustments();
  
  const [period, setPeriod] = useState<ReportPeriod>('month');
  
  const isLoading = productsLoading || batchesLoading || customersLoading || invoicesLoading || linesLoading || adjustmentsLoading;

  const dateFilter = useMemo(() => {
    const { start } = getDateRange(periodToPreset[period]);
    return start;
  }, [period]);

  // Filter confirmed invoices by date
  const filteredInvoices = useMemo(() => {
    return invoices.filter(
      (inv) => (inv.status === 'CONFIRMED' || inv.status === 'PAID' || inv.status === 'PARTIAL') && 
        new Date(inv.created_at) >= dateFilter
    );
  }, [invoices, dateFilter]);

  // Sales summary from filtered invoices
  const salesReport = useMemo(() => {
    const totalSales = filteredInvoices.reduce((sum, inv) => sum + Number(inv.total), 0);
    const totalPaid = filteredInvoices.reduce((sum, inv) => sum + Number(inv.paid), 0);
    const totalDue = filteredInvoices.reduce((sum, inv) => sum + Number(inv.due), 0);
    return { totalSales, totalPaid, totalDue, count: filteredInvoices.length };
  }, [filteredInvoices]);

  // Stock report by product
  const stockReport = useMemo(() => {
    return products
      .filter((p) => p.active)
      .map((product) => {
        const productBatches = batches.filter((b) => b.product_id === product.id && b.quantity > 0);
        const totalStock = productBatches.reduce((sum, b) => sum + b.quantity, 0);
        const totalValue = productBatches.reduce((sum, b) => sum + b.quantity * Number(b.cost_price), 0);
        const category = categories.find((c) => c.id === product.category_id);
        return {
          ...product,
          categoryName: category?.name || 'Unknown',
          totalStock,
          totalValue,
          batchCount: productBatches.length,
        };
      })
      .sort((a, b) => b.totalValue - a.totalValue);
  }, [products, batches, categories]);

  // Customer due report
  const customerDueReport = useMemo(() => {
    return customers
      .map((customer) => {
        const customerInvoices = invoices.filter(
          (inv) => inv.customer_id === customer.id && 
            (inv.status === 'CONFIRMED' || inv.status === 'PAID' || inv.status === 'PARTIAL')
        );
        const totalPurchases = customerInvoices.reduce((sum, inv) => sum + Number(inv.total), 0);
        const totalDue = customerInvoices.reduce((sum, inv) => sum + Number(inv.due), 0);
        return {
          ...customer,
          totalPurchases,
          totalDue,
          invoiceCount: customerInvoices.length,
        };
      })
      .filter((c) => c.totalDue > 0)
      .sort((a, b) => b.totalDue - a.totalDue);
  }, [customers, invoices]);

  // Expiry report
  const expiryReport = useMemo(() => {
    return batches
      .filter((b) => b.quantity > 0 && b.expiry_date)
      .map((batch) => {
        const product = products.find((p) => p.id === batch.product_id);
        const expiryDate = batch.expiry_date ? new Date(batch.expiry_date) : new Date();
        const daysLeft = getDaysUntilExpiry(expiryDate);
        const expired = isExpired(expiryDate);
        return {
          ...batch,
          productName: product?.name || 'Unknown',
          daysLeft,
          expired,
          value: batch.quantity * Number(batch.cost_price),
        };
      })
      .filter((b) => b.daysLeft <= 90 || b.expired)
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [batches, products]);

  // Free Items Report - based on invoice lines with free_quantity > 0
  const freeItemsReport = useMemo(() => {
    return filteredInvoices.flatMap((invoice) => {
      const customer = customers.find((c) => c.id === invoice.customer_id);
      const lines = invoiceLines.filter(line => line.invoice_id === invoice.id && line.free_quantity > 0);
      
      return lines.map((line) => {
        const product = products.find((p) => p.id === line.product_id);
        const batch = batches.find((b) => b.id === line.batch_id);
        return {
          invoiceNumber: invoice.invoice_number,
          date: invoice.created_at,
          customerName: customer?.name || 'Unknown',
          productName: product?.name || 'Unknown',
          batchNumber: batch?.batch_number || 'N/A',
          paidQuantity: line.quantity,
          freeQuantity: line.free_quantity,
          costValue: Number(line.cost_price) * line.free_quantity,
          marketValue: product ? product.sales_price * line.free_quantity : 0,
        };
      });
    });
  }, [filteredInvoices, customers, products, batches, invoiceLines]);

  // Sales Returns Report
  const returnsReport = useMemo(() => {
    const returns = stockAdjustments.filter(
      (adj) => adj.type === 'RETURN' && new Date(adj.created_at) >= dateFilter
    );
    return returns.map((ret) => {
      const product = products.find((p) => p.id === ret.product_id);
      const batch = batches.find((b) => b.id === ret.batch_id);
      const invoice = invoices.find((inv) => inv.id === ret.invoice_id);
      const customer = invoice ? customers.find((c) => c.id === invoice.customer_id) : null;
      return {
        ...ret,
        productName: product?.name || 'Unknown',
        batchNumber: batch?.batch_number || 'N/A',
        invoiceNumber: invoice?.invoice_number || 'N/A',
        customerName: customer?.name || 'Unknown',
        returnValue: ret.return_value || 0,
      };
    });
  }, [stockAdjustments, products, batches, invoices, customers, dateFilter]);

  // Damage & Expiry Report
  const damageReport = useMemo(() => {
    const damages = stockAdjustments.filter(
      (adj) => (adj.type === 'DAMAGE' || adj.type === 'EXPIRED') && new Date(adj.created_at) >= dateFilter
    );
    return damages.map((dmg) => {
      const product = products.find((p) => p.id === dmg.product_id);
      const batch = batches.find((b) => b.id === dmg.batch_id);
      return {
        ...dmg,
        productName: product?.name || 'Unknown',
        batchNumber: batch?.batch_number || 'N/A',
        costPrice: Number(batch?.cost_price) || 0,
        lossValue: (Number(batch?.cost_price) || 0) * dmg.quantity,
      };
    });
  }, [stockAdjustments, products, batches, dateFilter]);

  const getCategoryName = (categoryId: string) => {
    return categories.find((c) => c.id === categoryId)?.name || 'Unknown';
  };

  const exportToCSV = (data: Record<string, unknown>[], filename: string) => {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(','),
      ...data.map((row) =>
        headers.map((h) => JSON.stringify(row[h] ?? '')).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="text-muted-foreground">View and export business reports</p>
        </div>
        <Select value={period} onValueChange={(value: ReportPeriod) => setPeriod(value)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="year">This Year</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="profitloss" className="space-y-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="profitloss" className="gap-2">
            <DollarSign className="w-4 h-4" />
            Profit & Loss
          </TabsTrigger>
          <TabsTrigger value="sales" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            Sales
          </TabsTrigger>
          <TabsTrigger value="stock" className="gap-2">
            <Package className="w-4 h-4" />
            Stock
          </TabsTrigger>
          <TabsTrigger value="dues" className="gap-2">
            <Users className="w-4 h-4" />
            Dues
          </TabsTrigger>
          <TabsTrigger value="free" className="gap-2">
            <Gift className="w-4 h-4" />
            Free Items
          </TabsTrigger>
          <TabsTrigger value="returns" className="gap-2">
            <RotateCcw className="w-4 h-4" />
            Returns
          </TabsTrigger>
          <TabsTrigger value="damage" className="gap-2">
            <Trash2 className="w-4 h-4" />
            Damage/Expiry
          </TabsTrigger>
          <TabsTrigger value="expiry" className="gap-2">
            <AlertTriangle className="w-4 h-4" />
            Expiry Alert
          </TabsTrigger>
        </TabsList>

        {/* Profit & Loss Report */}
        <TabsContent value="profitloss" className="space-y-6">
          <ProfitLossReport period={periodToPreset[period]} />
        </TabsContent>

        {/* Sales Report */}
        <TabsContent value="sales" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MetricCard
              title="Total Sales"
              value={formatCurrency(salesReport.totalSales)}
              icon={<TrendingUp className="w-5 h-5" />}
            />
            <MetricCard
              title="Amount Received"
              value={formatCurrency(salesReport.totalPaid)}
              variant="success"
            />
            <MetricCard
              title="Pending Due"
              value={formatCurrency(salesReport.totalDue)}
              variant={salesReport.totalDue > 0 ? 'warning' : 'default'}
            />
            <MetricCard
              title="Invoices"
              value={salesReport.count}
              icon={<FileText className="w-5 h-5" />}
            />
          </div>

          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() =>
                exportToCSV(
                  filteredInvoices.map((inv) => ({
                    Invoice: inv.invoice_number,
                    Date: formatDate(inv.created_at),
                    Customer: customers.find((c) => c.id === inv.customer_id)?.name,
                    Total: inv.total,
                    Paid: inv.paid,
                    Due: inv.due,
                  })),
                  'sales-report'
                )
              }
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>

          <DataTable
            columns={[
              { key: 'invoice_number', header: 'Invoice' },
              {
                key: 'created_at',
                header: 'Date',
                render: (inv) => formatDate(inv.created_at),
              },
              {
                key: 'customer',
                header: 'Customer',
                render: (inv) => customers.find((c) => c.id === inv.customer_id)?.name || 'Unknown',
              },
              {
                key: 'total',
                header: 'Total',
                render: (inv) => formatCurrency(Number(inv.total)),
              },
              {
                key: 'paid',
                header: 'Paid',
                render: (inv) => formatCurrency(Number(inv.paid)),
              },
              {
                key: 'due',
                header: 'Due',
                render: (inv) => (
                  <span className={Number(inv.due) > 0 ? 'badge-warning' : 'badge-success'}>
                    {formatCurrency(Number(inv.due))}
                  </span>
                ),
              },
            ]}
            data={filteredInvoices.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())}
            keyExtractor={(inv) => inv.id}
            emptyMessage="No sales in this period"
          />
        </TabsContent>

        {/* Stock Report */}
        <TabsContent value="stock" className="space-y-6">
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() =>
                exportToCSV(
                  stockReport.map((item) => ({
                    Product: item.name,
                    Category: item.categoryName,
                    SKU: item.sku || '',
                    Unit: item.unit,
                    Stock: item.totalStock,
                    CostPrice: item.cost_price,
                    SalesPrice: item.sales_price,
                    TotalValue: item.totalValue,
                  })),
                  'stock-report'
                )
              }
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>

          <DataTable
            columns={[
              {
                key: 'name',
                header: 'Product',
                render: (item) => (
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.sku || 'No SKU'}</p>
                  </div>
                ),
              },
              {
                key: 'category',
                header: 'Category',
                render: (item) => <span className="badge-info">{item.categoryName}</span>,
              },
              { key: 'unit', header: 'Unit' },
              {
                key: 'totalStock',
                header: 'Stock',
                render: (item) => (
                  <span className={item.totalStock < 50 ? 'badge-warning' : 'badge-success'}>
                    {item.totalStock}
                  </span>
                ),
              },
              {
                key: 'cost_price',
                header: 'Cost Price',
                render: (item) => formatCurrency(item.cost_price),
              },
              {
                key: 'totalValue',
                header: 'Total Value',
                render: (item) => (
                  <span className="font-medium">{formatCurrency(item.totalValue)}</span>
                ),
              },
            ]}
            data={stockReport}
            keyExtractor={(item) => item.id}
            emptyMessage="No stock data"
          />
        </TabsContent>

        {/* Customer Dues */}
        <TabsContent value="dues" className="space-y-6">
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() =>
                exportToCSV(
                  customerDueReport.map((c) => ({
                    Customer: c.name,
                    Phone: c.phone,
                    Address: c.address || '',
                    TotalPurchases: c.totalPurchases,
                    TotalDue: c.totalDue,
                    Invoices: c.invoiceCount,
                  })),
                  'customer-dues'
                )
              }
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>

          <DataTable
            columns={[
              {
                key: 'name',
                header: 'Customer',
                render: (c) => (
                  <div>
                    <p className="font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.phone}</p>
                  </div>
                ),
              },
              { key: 'invoiceCount', header: 'Invoices' },
              {
                key: 'totalPurchases',
                header: 'Total Purchases',
                render: (c) => formatCurrency(c.totalPurchases),
              },
              {
                key: 'totalDue',
                header: 'Due Amount',
                render: (c) => (
                  <span className="badge-warning font-medium">{formatCurrency(c.totalDue)}</span>
                ),
              },
            ]}
            data={customerDueReport}
            keyExtractor={(c) => c.id}
            emptyMessage="No pending dues"
          />
        </TabsContent>

        {/* Free Items Report */}
        <TabsContent value="free" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              title="Total Free Items Given"
              value={freeItemsReport.reduce((sum, item) => sum + item.freeQuantity, 0)}
              icon={<Gift className="w-5 h-5" />}
            />
            <MetricCard
              title="Market Value"
              value={formatCurrency(freeItemsReport.reduce((sum, item) => sum + item.marketValue, 0))}
              variant="warning"
            />
            <MetricCard
              title="Invoices with Free Items"
              value={new Set(freeItemsReport.map((item) => item.invoiceNumber)).size}
            />
          </div>

          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() =>
                exportToCSV(
                  freeItemsReport.map((item) => ({
                    Invoice: item.invoiceNumber,
                    Date: formatDate(item.date),
                    Customer: item.customerName,
                    Product: item.productName,
                    Batch: item.batchNumber,
                    PaidQty: item.paidQuantity,
                    FreeQty: item.freeQuantity,
                    CostValue: item.costValue,
                    MarketValue: item.marketValue,
                  })),
                  'free-items-report'
                )
              }
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>

          <DataTable
            columns={[
              {
                key: 'invoiceNumber',
                header: 'Invoice',
                render: (item) => <span className="font-medium">{item.invoiceNumber}</span>,
              },
              {
                key: 'date',
                header: 'Date',
                render: (item) => formatDate(item.date),
              },
              { key: 'customerName', header: 'Customer' },
              {
                key: 'productName',
                header: 'Product',
                render: (item) => (
                  <div className="flex items-center gap-2">
                    <span className="badge-success">FREE</span>
                    <span>{item.productName}</span>
                  </div>
                ),
              },
              { key: 'batchNumber', header: 'Batch' },
              { 
                key: 'paidQuantity', 
                header: 'Paid Qty',
                render: (item) => item.paidQuantity,
              },
              { 
                key: 'freeQuantity', 
                header: 'Free Qty',
                render: (item) => <span className="badge-success">{item.freeQuantity}</span>,
              },
              {
                key: 'costValue',
                header: 'Cost Value',
                render: (item) => formatCurrency(item.costValue),
              },
              {
                key: 'marketValue',
                header: 'Market Value',
                render: (item) => formatCurrency(item.marketValue),
              },
            ]}
            data={freeItemsReport}
            keyExtractor={(item) => `${item.invoiceNumber}-${item.productName}-${item.batchNumber}`}
            emptyMessage="No free items given in this period"
          />
        </TabsContent>

        {/* Sales Returns Report */}
        <TabsContent value="returns" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MetricCard
              title="Total Returns"
              value={returnsReport.length}
              icon={<RotateCcw className="w-5 h-5" />}
            />
            <MetricCard
              title="Return Value"
              value={formatCurrency(returnsReport.reduce((sum, ret) => sum + ret.returnValue, 0))}
              variant="warning"
            />
            <MetricCard
              title="Restocked"
              value={returnsReport.filter((r) => r.return_action === 'RESTOCK').length}
              variant="success"
            />
            <MetricCard
              title="Scrapped"
              value={returnsReport.filter((r) => r.return_action === 'SCRAP').length}
              variant="danger"
            />
          </div>

          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() =>
                exportToCSV(
                  returnsReport.map((ret) => ({
                    Date: formatDate(ret.created_at),
                    Invoice: ret.invoiceNumber,
                    Customer: ret.customerName,
                    Product: ret.productName,
                    Batch: ret.batchNumber,
                    Quantity: ret.quantity,
                    ReturnValue: ret.returnValue,
                    Action: ret.return_action || 'RESTOCK',
                    Reason: ret.reason,
                  })),
                  'sales-returns-report'
                )
              }
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>

          <DataTable
            columns={[
              {
                key: 'created_at',
                header: 'Date',
                render: (ret) => formatDate(ret.created_at),
              },
              { key: 'invoiceNumber', header: 'Invoice' },
              { key: 'customerName', header: 'Customer' },
              {
                key: 'product',
                header: 'Product',
                render: (ret) => <span className="font-medium">{ret.productName}</span>,
              },
              { key: 'batchNumber', header: 'Batch' },
              { key: 'quantity', header: 'Qty' },
              {
                key: 'returnValue',
                header: 'Value',
                render: (ret) => formatCurrency(ret.returnValue),
              },
              {
                key: 'return_action',
                header: 'Action',
                render: (ret) => (
                  <span className={ret.return_action === 'RESTOCK' ? 'badge-success' : 'badge-warning'}>
                    {ret.return_action || 'RESTOCK'}
                  </span>
                ),
              },
            ]}
            data={returnsReport}
            keyExtractor={(ret) => ret.id}
            emptyMessage="No returns in this period"
          />
        </TabsContent>

        {/* Damage & Expiry Loss Report */}
        <TabsContent value="damage" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MetricCard
              title="Total Records"
              value={damageReport.length}
              icon={<Trash2 className="w-5 h-5" />}
            />
            <MetricCard
              title="Total Loss"
              value={formatCurrency(damageReport.reduce((sum, dmg) => sum + dmg.lossValue, 0))}
              variant="danger"
            />
            <MetricCard
              title="Damaged Items"
              value={damageReport.filter((d) => d.type === 'DAMAGE').length}
              variant="warning"
            />
            <MetricCard
              title="Expired Items"
              value={damageReport.filter((d) => d.type === 'EXPIRED').length}
              variant="danger"
            />
          </div>

          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() =>
                exportToCSV(
                  damageReport.map((dmg) => ({
                    Date: formatDate(dmg.created_at),
                    Type: dmg.type,
                    Product: dmg.productName,
                    Batch: dmg.batchNumber,
                    Quantity: dmg.quantity,
                    CostPrice: dmg.costPrice,
                    LossValue: dmg.lossValue,
                    Reason: dmg.reason,
                  })),
                  'damage-expiry-report'
                )
              }
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>

          <DataTable
            columns={[
              {
                key: 'created_at',
                header: 'Date',
                render: (dmg) => formatDate(dmg.created_at),
              },
              {
                key: 'type',
                header: 'Type',
                render: (dmg) => (
                  <span className={dmg.type === 'EXPIRED' ? 'badge-danger' : 'badge-warning'}>
                    {dmg.type}
                  </span>
                ),
              },
              {
                key: 'product',
                header: 'Product',
                render: (dmg) => <span className="font-medium">{dmg.productName}</span>,
              },
              { key: 'batchNumber', header: 'Batch' },
              { key: 'quantity', header: 'Qty' },
              {
                key: 'costPrice',
                header: 'Unit Cost',
                render: (dmg) => formatCurrency(dmg.costPrice),
              },
              {
                key: 'lossValue',
                header: 'Loss Value',
                render: (dmg) => (
                  <span className="text-destructive font-medium">{formatCurrency(dmg.lossValue)}</span>
                ),
              },
              {
                key: 'reason',
                header: 'Reason',
                render: (dmg) => <span className="text-muted-foreground truncate max-w-[150px] block">{dmg.reason}</span>,
              },
            ]}
            data={damageReport}
            keyExtractor={(dmg) => dmg.id}
            emptyMessage="No damage/expiry records in this period"
          />
        </TabsContent>

        {/* Expiry Report */}
        <TabsContent value="expiry" className="space-y-6">
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() =>
                exportToCSV(
                  expiryReport.map((b) => ({
                    Product: b.productName,
                    BatchNumber: b.batch_number,
                    ExpiryDate: b.expiry_date ? formatDate(b.expiry_date) : 'N/A',
                    DaysLeft: b.daysLeft,
                    Quantity: b.quantity,
                    Value: b.value,
                    Status: b.expired ? 'Expired' : 'Expiring Soon',
                  })),
                  'expiry-report'
                )
              }
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>

          <DataTable
            columns={[
              {
                key: 'product',
                header: 'Product',
                render: (b) => <span className="font-medium">{b.productName}</span>,
              },
              { key: 'batch_number', header: 'Batch Number' },
              {
                key: 'expiry_date',
                header: 'Expiry Date',
                render: (b) => b.expiry_date ? formatDate(b.expiry_date) : 'N/A',
              },
              {
                key: 'status',
                header: 'Status',
                render: (b) =>
                  b.expired ? (
                    <span className="badge-danger">Expired</span>
                  ) : b.daysLeft <= 30 ? (
                    <span className="badge-warning">{b.daysLeft} days</span>
                  ) : (
                    <span className="badge-info">{b.daysLeft} days</span>
                  ),
              },
              { key: 'quantity', header: 'Quantity' },
              {
                key: 'value',
                header: 'Value at Risk',
                render: (b) => formatCurrency(b.value),
              },
            ]}
            data={expiryReport}
            keyExtractor={(b) => b.id}
            emptyMessage="No expiring items"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
