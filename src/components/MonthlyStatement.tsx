import { useState, useMemo } from 'react';
import { Calendar, Download, FileText, Loader2, TrendingUp, TrendingDown, Package, CreditCard, AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { formatCurrency, formatDate } from '@/lib/format';
import { startOfMonth, endOfMonth, format, subMonths } from 'date-fns';
import * as XLSX from 'xlsx';

interface StatementData {
  // Sales Summary
  salesSummary: {
    totalInvoices: number;
    totalSalesAmount: number;
    totalPaid: number;
    totalDue: number;
  };
  // Profit & Loss
  profitLoss: {
    totalRevenue: number;
    totalCOGS: number;
    grossProfit: number;
    freeItemsCost: number;
    netProfit: number;
  };
  // Payments Summary
  paymentsSummary: {
    totalReceived: number;
    byMethod: Record<string, number>;
  };
  // Inventory Summary
  inventorySummary: {
    openingStockValue: number;
    stockAddedValue: number;
    stockSoldValue: number;
    closingStockValue: number;
    lowStockCount: number;
    expiringSoonCount: number;
    expiredCount: number;
  };
  // Returns & Damages
  returnsDamages: {
    returnedQty: number;
    returnedValue: number;
    damagedQty: number;
    damagedValue: number;
  };
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function MonthlyStatement() {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [isGenerating, setIsGenerating] = useState(false);
  const [statementData, setStatementData] = useState<StatementData | null>(null);

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => currentYear - i);
  }, []);

  const dateRange = useMemo(() => {
    const date = new Date(selectedYear, selectedMonth, 1);
    return {
      start: startOfMonth(date),
      end: endOfMonth(date),
      label: format(date, 'MMMM yyyy'),
    };
  }, [selectedMonth, selectedYear]);

  const generateStatement = async () => {
    setIsGenerating(true);
    try {
      const startDate = dateRange.start.toISOString();
      const endDate = dateRange.end.toISOString();
      const prevMonthEnd = subMonths(dateRange.start, 0).toISOString();

      // Fetch all required data in parallel
      const [
        invoicesRes,
        invoiceLinesRes,
        paymentsRes,
        batchesRes,
        stockLedgerRes,
        adjustmentsRes,
        productsRes,
      ] = await Promise.all([
        supabase.from('invoices').select('*').gte('created_at', startDate).lte('created_at', endDate).eq('is_deleted', false),
        supabase.from('invoice_lines').select('*, invoices!inner(created_at, is_deleted)').gte('invoices.created_at', startDate).lte('invoices.created_at', endDate),
        supabase.from('payments').select('*').gte('created_at', startDate).lte('created_at', endDate).eq('is_deleted', false),
        supabase.from('batches').select('*').eq('is_deleted', false),
        supabase.from('stock_ledger').select('*').gte('created_at', startDate).lte('created_at', endDate),
        supabase.from('stock_adjustments').select('*').gte('created_at', startDate).lte('created_at', endDate),
        supabase.from('products').select('*').eq('is_deleted', false),
      ]);

      const invoices = invoicesRes.data || [];
      const invoiceLines = invoiceLinesRes.data || [];
      const payments = paymentsRes.data || [];
      const batches = batchesRes.data || [];
      const stockLedger = stockLedgerRes.data || [];
      const adjustments = adjustmentsRes.data || [];
      const products = productsRes.data || [];

      // Calculate Sales Summary
      const confirmedInvoices = invoices.filter(inv => inv.status !== 'DRAFT' && inv.status !== 'CANCELLED');
      const salesSummary = {
        totalInvoices: confirmedInvoices.length,
        totalSalesAmount: confirmedInvoices.reduce((sum, inv) => sum + Number(inv.total), 0),
        totalPaid: confirmedInvoices.reduce((sum, inv) => sum + Number(inv.paid), 0),
        totalDue: confirmedInvoices.reduce((sum, inv) => sum + Number(inv.due), 0),
      };

      // Calculate Profit & Loss
      const validInvoiceIds = new Set(confirmedInvoices.map(inv => inv.id));
      const validLines = invoiceLines.filter((line: any) => validInvoiceIds.has(line.invoice_id));
      
      const totalRevenue = validLines.reduce((sum, line) => sum + (line.quantity * line.unit_price), 0);
      const totalCOGS = validLines.reduce((sum, line) => sum + (line.quantity * line.cost_price), 0);
      const freeItemsCost = validLines.reduce((sum, line) => sum + (line.free_quantity * line.cost_price), 0);
      const grossProfit = totalRevenue - totalCOGS;
      
      // Account for returns in net profit
      const returnAdjustments = adjustments.filter(adj => adj.type === 'RETURN');
      const returnValue = returnAdjustments.reduce((sum, adj) => sum + (adj.return_value || 0), 0);
      const netProfit = grossProfit + returnValue;

      const profitLoss = {
        totalRevenue,
        totalCOGS,
        grossProfit,
        freeItemsCost,
        netProfit,
      };

      // Calculate Payments Summary
      const paymentsByMethod: Record<string, number> = {};
      payments.forEach(payment => {
        const method = payment.method || 'OTHER';
        paymentsByMethod[method] = (paymentsByMethod[method] || 0) + Number(payment.amount);
      });

      const paymentsSummary = {
        totalReceived: payments.reduce((sum, p) => sum + Number(p.amount), 0),
        byMethod: paymentsByMethod,
      };

      // Calculate Inventory Summary
      const productCostMap = new Map(products.map(p => [p.id, Number(p.cost_price)]));
      
      // Opening stock = stock at start of month (sum of batches created before month start)
      const openingBatches = batches.filter(b => new Date(b.created_at) < dateRange.start);
      const openingStockValue = openingBatches.reduce((sum, b) => sum + (b.quantity * Number(b.cost_price)), 0);
      
      // Stock added during month
      const addedLedger = stockLedger.filter(l => ['OPENING', 'PURCHASE', 'RETURN'].includes(l.type));
      const stockAddedValue = addedLedger.reduce((sum, l) => {
        const cost = productCostMap.get(l.product_id) || 0;
        return sum + (l.quantity * cost);
      }, 0);
      
      // Stock sold during month
      const soldLedger = stockLedger.filter(l => ['SALE', 'FREE'].includes(l.type));
      const stockSoldValue = soldLedger.reduce((sum, l) => {
        const cost = productCostMap.get(l.product_id) || 0;
        return sum + (Math.abs(l.quantity) * cost);
      }, 0);
      
      // Closing stock = current batch quantities
      const closingStockValue = batches.reduce((sum, b) => sum + (b.quantity * Number(b.cost_price)), 0);
      
      // Low stock, expiring, expired counts
      const today = new Date();
      const thirtyDaysLater = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
      
      const lowStockProducts = products.filter(p => {
        const productBatches = batches.filter(b => b.product_id === p.id);
        const totalQty = productBatches.reduce((sum, b) => sum + b.quantity, 0);
        return totalQty < 50; // Low stock threshold
      });
      
      const expiringSoonBatches = batches.filter(b => 
        b.expiry_date && 
        new Date(b.expiry_date) > today && 
        new Date(b.expiry_date) <= thirtyDaysLater &&
        b.quantity > 0
      );
      
      const expiredBatches = batches.filter(b => 
        b.expiry_date && 
        new Date(b.expiry_date) < today &&
        b.quantity > 0
      );

      const inventorySummary = {
        openingStockValue,
        stockAddedValue,
        stockSoldValue,
        closingStockValue,
        lowStockCount: lowStockProducts.length,
        expiringSoonCount: expiringSoonBatches.length,
        expiredCount: expiredBatches.length,
      };

      // Calculate Returns & Damages
      const returns = adjustments.filter(adj => adj.type === 'RETURN');
      const damages = adjustments.filter(adj => ['DAMAGE', 'EXPIRED', 'LOST'].includes(adj.type));

      const returnsDamages = {
        returnedQty: returns.reduce((sum, adj) => sum + adj.quantity, 0),
        returnedValue: returns.reduce((sum, adj) => sum + (adj.return_value || 0), 0),
        damagedQty: damages.reduce((sum, adj) => sum + adj.quantity, 0),
        damagedValue: damages.reduce((sum, adj) => {
          const product = products.find(p => p.id === adj.product_id);
          return sum + (adj.quantity * (product?.cost_price || 0));
        }, 0),
      };

      setStatementData({
        salesSummary,
        profitLoss,
        paymentsSummary,
        inventorySummary,
        returnsDamages,
      });

      toast({ title: 'Statement Generated', description: `Monthly statement for ${dateRange.label} is ready.` });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to generate statement', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadPDF = () => {
    if (!statementData) return;

    const html = generateStatementHTML(statementData, dateRange.label);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 500);
    }
  };

  const exportCSV = () => {
    if (!statementData) return;

    // Create workbook with multiple sheets
    const wb = XLSX.utils.book_new();

    // Sales Summary sheet
    const salesData = [
      ['Monthly Statement - Sales Summary', dateRange.label],
      [''],
      ['Metric', 'Value'],
      ['Total Invoices', statementData.salesSummary.totalInvoices],
      ['Total Sales Amount', statementData.salesSummary.totalSalesAmount],
      ['Total Paid', statementData.salesSummary.totalPaid],
      ['Total Due', statementData.salesSummary.totalDue],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(salesData), 'Sales Summary');

    // Profit & Loss sheet
    const plData = [
      ['Monthly Statement - Profit & Loss', dateRange.label],
      [''],
      ['Metric', 'Value'],
      ['Total Revenue', statementData.profitLoss.totalRevenue],
      ['Total COGS', statementData.profitLoss.totalCOGS],
      ['Gross Profit', statementData.profitLoss.grossProfit],
      ['Free Items Cost (Separate)', statementData.profitLoss.freeItemsCost],
      ['Net Profit', statementData.profitLoss.netProfit],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(plData), 'Profit & Loss');

    // Payments sheet
    const paymentsData = [
      ['Monthly Statement - Payments', dateRange.label],
      [''],
      ['Payment Method', 'Amount'],
      ...Object.entries(statementData.paymentsSummary.byMethod).map(([method, amount]) => [method, amount]),
      [''],
      ['Total Received', statementData.paymentsSummary.totalReceived],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(paymentsData), 'Payments');

    // Inventory sheet
    const invData = [
      ['Monthly Statement - Inventory', dateRange.label],
      [''],
      ['Metric', 'Value'],
      ['Opening Stock Value', statementData.inventorySummary.openingStockValue],
      ['Stock Added', statementData.inventorySummary.stockAddedValue],
      ['Stock Sold', statementData.inventorySummary.stockSoldValue],
      ['Closing Stock Value', statementData.inventorySummary.closingStockValue],
      ['Low Stock Items', statementData.inventorySummary.lowStockCount],
      ['Expiring Soon', statementData.inventorySummary.expiringSoonCount],
      ['Expired', statementData.inventorySummary.expiredCount],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(invData), 'Inventory');

    // Returns & Damages sheet
    const rdData = [
      ['Monthly Statement - Returns & Damages', dateRange.label],
      [''],
      ['Metric', 'Quantity', 'Value'],
      ['Returns', statementData.returnsDamages.returnedQty, statementData.returnsDamages.returnedValue],
      ['Damages/Expired/Lost', statementData.returnsDamages.damagedQty, statementData.returnsDamages.damagedValue],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rdData), 'Returns & Damages');

    XLSX.writeFile(wb, `monthly-statement-${format(dateRange.start, 'yyyy-MM')}.xlsx`);
    toast({ title: 'Exported', description: 'Statement exported to Excel with multiple sheets.' });
  };

  return (
    <div className="space-y-6">
      {/* Month Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Monthly Statement Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Month</label>
              <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {MONTHS.map((month, idx) => (
                    <SelectItem key={idx} value={idx.toString()}>{month}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Year</label>
              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={generateStatement} disabled={isGenerating}>
              {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
              Generate Statement
            </Button>
            {statementData && (
              <>
                <Button variant="outline" onClick={downloadPDF}>
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
                <Button variant="outline" onClick={exportCSV}>
                  <Download className="w-4 h-4 mr-2" />
                  Export Excel
                </Button>
              </>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Selected Period: <strong>{format(dateRange.start, 'dd MMM yyyy')}</strong> to <strong>{format(dateRange.end, 'dd MMM yyyy')}</strong>
          </p>
        </CardContent>
      </Card>

      {/* Statement Results */}
      {statementData && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Sales Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="w-4 h-4 text-primary" />
                Sales Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Invoices</span>
                <Badge variant="secondary">{statementData.salesSummary.totalInvoices}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Sales</span>
                <span className="font-semibold">{formatCurrency(statementData.salesSummary.totalSalesAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Paid</span>
                <span className="text-primary font-semibold">{formatCurrency(statementData.salesSummary.totalPaid)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Due</span>
                <span className="text-destructive font-semibold">{formatCurrency(statementData.salesSummary.totalDue)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Profit & Loss */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="w-4 h-4 text-primary" />
                Profit & Loss
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Revenue</span>
                <span className="font-semibold">{formatCurrency(statementData.profitLoss.totalRevenue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">COGS</span>
                <span className="font-semibold">{formatCurrency(statementData.profitLoss.totalCOGS)}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gross Profit</span>
                <span className={`font-semibold ${statementData.profitLoss.grossProfit >= 0 ? 'text-primary' : 'text-destructive'}`}>
                  {formatCurrency(statementData.profitLoss.grossProfit)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  Free Items Cost <Badge variant="outline" className="text-xs">Separate</Badge>
                </span>
                <span className="text-muted-foreground">{formatCurrency(statementData.profitLoss.freeItemsCost)}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="font-medium">Net Profit</span>
                <span className={`font-bold ${statementData.profitLoss.netProfit >= 0 ? 'text-primary' : 'text-destructive'}`}>
                  {formatCurrency(statementData.profitLoss.netProfit)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Payments Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="w-4 h-4 text-primary" />
                Payments Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="font-medium">Total Received</span>
                <span className="font-bold text-primary">{formatCurrency(statementData.paymentsSummary.totalReceived)}</span>
              </div>
              <Separator />
              {Object.entries(statementData.paymentsSummary.byMethod).map(([method, amount]) => (
                <div key={method} className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Badge variant="outline">{method}</Badge>
                  </span>
                  <span>{formatCurrency(amount)}</span>
                </div>
              ))}
              {Object.keys(statementData.paymentsSummary.byMethod).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">No payments recorded</p>
              )}
            </CardContent>
          </Card>

          {/* Inventory Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="w-4 h-4 text-primary" />
                Inventory Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Opening Stock</span>
                <span>{formatCurrency(statementData.inventorySummary.openingStockValue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Stock Added</span>
                <span className="text-primary">+{formatCurrency(statementData.inventorySummary.stockAddedValue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Stock Sold</span>
                <span className="text-destructive">-{formatCurrency(statementData.inventorySummary.stockSoldValue)}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="font-medium">Closing Stock</span>
                <span className="font-bold">{formatCurrency(statementData.inventorySummary.closingStockValue)}</span>
              </div>
              <div className="flex gap-2 pt-2">
                <Badge variant={statementData.inventorySummary.lowStockCount > 0 ? 'destructive' : 'secondary'}>
                  Low Stock: {statementData.inventorySummary.lowStockCount}
                </Badge>
                <Badge variant={statementData.inventorySummary.expiringSoonCount > 0 ? 'outline' : 'secondary'} className={statementData.inventorySummary.expiringSoonCount > 0 ? 'border-warning text-warning' : ''}>
                  Expiring: {statementData.inventorySummary.expiringSoonCount}
                </Badge>
                <Badge variant={statementData.inventorySummary.expiredCount > 0 ? 'destructive' : 'secondary'}>
                  Expired: {statementData.inventorySummary.expiredCount}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Returns & Damages */}
          <Card className="md:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <RotateCcw className="w-4 h-4 text-warning" />
                Returns & Damages
                <Badge variant="outline" className="ml-2 text-xs">Separate from P&L</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <RotateCcw className="w-4 h-4" /> Returns
                  </h4>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Quantity Returned</span>
                    <Badge variant="secondary">{statementData.returnsDamages.returnedQty} units</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Return Value</span>
                    <span className="font-semibold">{formatCurrency(statementData.returnsDamages.returnedValue)}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-destructive" /> Damages/Expired/Lost
                  </h4>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Quantity</span>
                    <Badge variant="destructive">{statementData.returnsDamages.damagedQty} units</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Value Lost</span>
                    <span className="font-semibold text-destructive">{formatCurrency(statementData.returnsDamages.damagedValue)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function generateStatementHTML(data: StatementData, monthLabel: string): string {
  const generatedAt = format(new Date(), 'dd MMM yyyy, hh:mm a');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Monthly Statement - ${monthLabel}</title>
      <style>
        @page { size: A4; margin: 15mm; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Segoe UI', Arial, sans-serif; 
          font-size: 11px; 
          line-height: 1.4;
          color: #1e293b;
          background: #f8fafc;
          padding: 20px;
        }
        .container {
          max-width: 210mm;
          margin: 0 auto;
          background: white;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
          background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);
          color: white;
          padding: 25px 30px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .header h1 { font-size: 22px; font-weight: 600; }
        .header .meta { text-align: right; font-size: 11px; opacity: 0.9; }
        .header .company { font-size: 14px; font-weight: 600; margin-bottom: 4px; }
        .content { padding: 25px 30px; }
        .section { margin-bottom: 20px; }
        .section-title {
          font-size: 13px;
          font-weight: 600;
          color: #1e3a5f;
          margin-bottom: 10px;
          padding-bottom: 5px;
          border-bottom: 2px solid #e2e8f0;
        }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .card {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 15px;
        }
        .card-title {
          font-weight: 600;
          color: #1e3a5f;
          margin-bottom: 10px;
          font-size: 12px;
        }
        .row {
          display: flex;
          justify-content: space-between;
          padding: 5px 0;
          border-bottom: 1px dotted #e2e8f0;
        }
        .row:last-child { border-bottom: none; }
        .row-label { color: #64748b; }
        .row-value { font-weight: 600; }
        .row-value.positive { color: #059669; }
        .row-value.negative { color: #dc2626; }
        .highlight {
          background: #f0f9ff;
          padding: 10px;
          border-radius: 6px;
          margin-top: 10px;
        }
        .footer {
          text-align: center;
          padding: 15px;
          background: #f8fafc;
          font-size: 10px;
          color: #64748b;
          border-top: 1px solid #e2e8f0;
        }
        .badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 500;
        }
        .badge-success { background: #dcfce7; color: #166534; }
        .badge-warning { background: #fef3c7; color: #92400e; }
        .badge-danger { background: #fee2e2; color: #991b1b; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div>
            <h1>Monthly Statement</h1>
            <div style="margin-top: 5px; font-size: 16px;">${monthLabel}</div>
          </div>
          <div class="meta">
            <div class="company">Gazi Laboratories Limited</div>
            <div>Mamtaj Center, Islamiahat</div>
            <div>Hathazari, Chattogram</div>
            <div style="margin-top: 8px;">Generated: ${generatedAt}</div>
          </div>
        </div>
        
        <div class="content">
          <div class="grid">
            <div class="card">
              <div class="card-title">📊 Sales Summary</div>
              <div class="row">
                <span class="row-label">Total Invoices</span>
                <span class="row-value">${data.salesSummary.totalInvoices}</span>
              </div>
              <div class="row">
                <span class="row-label">Total Sales</span>
                <span class="row-value">৳${data.salesSummary.totalSalesAmount.toLocaleString()}</span>
              </div>
              <div class="row">
                <span class="row-label">Total Paid</span>
                <span class="row-value positive">৳${data.salesSummary.totalPaid.toLocaleString()}</span>
              </div>
              <div class="row">
                <span class="row-label">Total Due</span>
                <span class="row-value negative">৳${data.salesSummary.totalDue.toLocaleString()}</span>
              </div>
            </div>
            
            <div class="card">
              <div class="card-title">💰 Profit & Loss</div>
              <div class="row">
                <span class="row-label">Revenue</span>
                <span class="row-value">৳${data.profitLoss.totalRevenue.toLocaleString()}</span>
              </div>
              <div class="row">
                <span class="row-label">COGS</span>
                <span class="row-value">৳${data.profitLoss.totalCOGS.toLocaleString()}</span>
              </div>
              <div class="row">
                <span class="row-label">Gross Profit</span>
                <span class="row-value ${data.profitLoss.grossProfit >= 0 ? 'positive' : 'negative'}">৳${data.profitLoss.grossProfit.toLocaleString()}</span>
              </div>
              <div class="row">
                <span class="row-label">Free Items Cost (Separate)</span>
                <span class="row-value">৳${data.profitLoss.freeItemsCost.toLocaleString()}</span>
              </div>
              <div class="highlight">
                <div class="row" style="border: none;">
                  <span class="row-label" style="font-weight: 600;">Net Profit</span>
                  <span class="row-value ${data.profitLoss.netProfit >= 0 ? 'positive' : 'negative'}" style="font-size: 14px;">৳${data.profitLoss.netProfit.toLocaleString()}</span>
                </div>
              </div>
            </div>
            
            <div class="card">
              <div class="card-title">💳 Payments Summary</div>
              <div class="row">
                <span class="row-label" style="font-weight: 600;">Total Received</span>
                <span class="row-value positive">৳${data.paymentsSummary.totalReceived.toLocaleString()}</span>
              </div>
              ${Object.entries(data.paymentsSummary.byMethod).map(([method, amount]) => `
                <div class="row">
                  <span class="row-label">${method}</span>
                  <span class="row-value">৳${amount.toLocaleString()}</span>
                </div>
              `).join('')}
            </div>
            
            <div class="card">
              <div class="card-title">📦 Inventory Summary</div>
              <div class="row">
                <span class="row-label">Opening Stock</span>
                <span class="row-value">৳${data.inventorySummary.openingStockValue.toLocaleString()}</span>
              </div>
              <div class="row">
                <span class="row-label">Stock Added</span>
                <span class="row-value positive">+৳${data.inventorySummary.stockAddedValue.toLocaleString()}</span>
              </div>
              <div class="row">
                <span class="row-label">Stock Sold</span>
                <span class="row-value negative">-৳${data.inventorySummary.stockSoldValue.toLocaleString()}</span>
              </div>
              <div class="highlight">
                <div class="row" style="border: none;">
                  <span class="row-label" style="font-weight: 600;">Closing Stock</span>
                  <span class="row-value" style="font-size: 14px;">৳${data.inventorySummary.closingStockValue.toLocaleString()}</span>
                </div>
              </div>
              <div style="margin-top: 10px; display: flex; gap: 8px;">
                <span class="badge ${data.inventorySummary.lowStockCount > 0 ? 'badge-danger' : 'badge-success'}">Low: ${data.inventorySummary.lowStockCount}</span>
                <span class="badge ${data.inventorySummary.expiringSoonCount > 0 ? 'badge-warning' : 'badge-success'}">Expiring: ${data.inventorySummary.expiringSoonCount}</span>
                <span class="badge ${data.inventorySummary.expiredCount > 0 ? 'badge-danger' : 'badge-success'}">Expired: ${data.inventorySummary.expiredCount}</span>
              </div>
            </div>
          </div>
          
          <div class="section" style="margin-top: 20px;">
            <div class="section-title">🔄 Returns & Damages (Separate Section)</div>
            <div class="grid">
              <div class="card">
                <div class="card-title">Returns</div>
                <div class="row">
                  <span class="row-label">Quantity</span>
                  <span class="row-value">${data.returnsDamages.returnedQty} units</span>
                </div>
                <div class="row">
                  <span class="row-label">Value</span>
                  <span class="row-value">৳${data.returnsDamages.returnedValue.toLocaleString()}</span>
                </div>
              </div>
              <div class="card">
                <div class="card-title">Damages / Expired / Lost</div>
                <div class="row">
                  <span class="row-label">Quantity</span>
                  <span class="row-value negative">${data.returnsDamages.damagedQty} units</span>
                </div>
                <div class="row">
                  <span class="row-label">Value Lost</span>
                  <span class="row-value negative">৳${data.returnsDamages.damagedValue.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="footer">
          This is a system-generated monthly statement. For queries, contact management.
        </div>
      </div>
    </body>
    </html>
  `;
}
