import { useState, useMemo } from 'react';
import { Download, TrendingUp, TrendingDown, Users, UserCheck, Package, Layers, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useProfitLoss, DateRangePreset, ProfitLossFilters } from '@/hooks/useProfitLoss';
import { formatCurrency } from '@/lib/format';
import { MetricCard } from '@/components/MetricCard';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type Props = {
  period: DateRangePreset;
};

export function ProfitLossReport({ period }: Props) {
  const [activeTab, setActiveTab] = useState('overview');

  const filters: ProfitLossFilters = {
    preset: period,
  };

  const {
    metrics,
    invoicesWithPL,
    profitByCustomer,
    profitBySeller,
    profitByProduct,
    profitByCategory,
  } = useProfitLoss(filters);

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
      {/* Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <MetricCard
          title="Total Sales"
          value={formatCurrency(metrics.totalSales)}
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <MetricCard
          title="Total COGS"
          value={formatCurrency(metrics.totalCOGS)}
          variant="warning"
        />
        <MetricCard
          title="Gross Profit"
          value={formatCurrency(metrics.grossProfit)}
          variant={metrics.grossProfit >= 0 ? 'success' : 'danger'}
        />
        <MetricCard
          title="Net Profit"
          value={formatCurrency(metrics.netProfit)}
          variant={metrics.netProfit >= 0 ? 'success' : 'danger'}
        />
        <MetricCard
          title="Profit Margin"
          value={`${metrics.profitMargin.toFixed(1)}%`}
          variant={metrics.profitMargin >= 10 ? 'success' : metrics.profitMargin >= 0 ? 'warning' : 'danger'}
        />
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Return Adjustment</p>
                <p className="text-xl font-semibold text-emerald-600 dark:text-emerald-400">
                  +{formatCurrency(metrics.returnAdjustment)}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-emerald-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Damage Write-off</p>
                <p className="text-xl font-semibold text-destructive">
                  -{formatCurrency(metrics.damageWriteOff)}
                </p>
              </div>
              <TrendingDown className="w-8 h-8 text-destructive/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Paid</p>
                <p className="text-xl font-semibold text-primary">
                  {formatCurrency(metrics.totalPaid)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Due</p>
                <p className="text-xl font-semibold text-amber-600 dark:text-amber-400">
                  {formatCurrency(metrics.totalDue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Free Giveaway Section - Separate from P&L */}
      {(metrics.freeGiveawayQty > 0 || metrics.freeGiveawayCost > 0) && (
        <Alert className="border-muted bg-muted/30">
          <Gift className="h-4 w-4" />
          <AlertTitle className="font-semibold">Free Giveaway Summary</AlertTitle>
          <AlertDescription className="mt-2">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-3">
              <div className="p-3 rounded-lg bg-background border">
                <p className="text-xs text-muted-foreground">Free Qty Given</p>
                <p className="text-lg font-bold">{metrics.freeGiveawayQty} units</p>
              </div>
              <div className="p-3 rounded-lg bg-background border">
                <p className="text-xs text-muted-foreground">Free Value (at Cost)</p>
                <p className="text-lg font-bold">{formatCurrency(metrics.freeGiveawayCost)}</p>
              </div>
              <div className="p-3 rounded-lg bg-background border md:col-span-1 col-span-2">
                <p className="text-xs text-muted-foreground italic">
                  ⓘ Free items are NOT included in COGS or Net Profit calculations.
                </p>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Breakdown Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="customer" className="gap-2">
            <Users className="w-4 h-4" />
            By Customer
          </TabsTrigger>
          <TabsTrigger value="seller" className="gap-2">
            <UserCheck className="w-4 h-4" />
            By Seller
          </TabsTrigger>
          <TabsTrigger value="product" className="gap-2">
            <Package className="w-4 h-4" />
            By Product
          </TabsTrigger>
          <TabsTrigger value="category" className="gap-2">
            <Layers className="w-4 h-4" />
            By Category
          </TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-4">
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                exportToCSV(
                  invoicesWithPL.map((inv) => ({
                    Invoice: inv.invoiceNumber,
                    Date: inv.createdAt,
                    Customer: inv.customerName,
                    Seller: inv.sellerName,
                    Sales: inv.total,
                    COGS: inv.cogs,
                    Profit: inv.profit,
                    Margin: `${inv.profitMargin.toFixed(1)}%`,
                  })),
                  'profit-loss-overview'
                )
              }
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Invoice-wise Profit</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Seller</TableHead>
                    <TableHead className="text-right">Sales</TableHead>
                    <TableHead className="text-right">COGS</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoicesWithPL.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No data for this period
                      </TableCell>
                    </TableRow>
                  ) : (
                    invoicesWithPL.slice(0, 20).map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-medium">{inv.invoiceNumber}</TableCell>
                        <TableCell>{inv.customerName}</TableCell>
                        <TableCell>{inv.sellerName}</TableCell>
                        <TableCell className="text-right">{formatCurrency(inv.total)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatCurrency(inv.cogs)}
                        </TableCell>
                        <TableCell className={`text-right font-medium ${inv.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
                          {formatCurrency(inv.profit)}
                        </TableCell>
                        <TableCell className={`text-right ${inv.profitMargin >= 10 ? 'text-emerald-600 dark:text-emerald-400' : inv.profitMargin >= 0 ? 'text-amber-600 dark:text-amber-400' : 'text-destructive'}`}>
                          {inv.profitMargin.toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              {invoicesWithPL.length > 20 && (
                <p className="text-sm text-muted-foreground text-center mt-4">
                  Showing top 20 of {invoicesWithPL.length} invoices. Export CSV for full data.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* By Customer */}
        <TabsContent value="customer" className="space-y-4">
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                exportToCSV(
                  profitByCustomer.map((c) => ({
                    Customer: c.name,
                    Sales: c.sales,
                    COGS: c.cogs,
                    Profit: c.profit,
                    Margin: c.sales > 0 ? `${((c.profit / c.sales) * 100).toFixed(1)}%` : '0%',
                  })),
                  'profit-by-customer'
                )
              }
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Profit by Customer</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Sales</TableHead>
                    <TableHead className="text-right">COGS</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profitByCustomer.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No data for this period
                      </TableCell>
                    </TableRow>
                  ) : (
                    profitByCustomer.map((c) => {
                      const margin = c.sales > 0 ? (c.profit / c.sales) * 100 : 0;
                      return (
                        <TableRow key={c.name}>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell className="text-right">{formatCurrency(c.sales)}</TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {formatCurrency(c.cogs)}
                          </TableCell>
                          <TableCell className={`text-right font-medium ${c.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
                            {formatCurrency(c.profit)}
                          </TableCell>
                          <TableCell className={`text-right ${margin >= 10 ? 'text-emerald-600 dark:text-emerald-400' : margin >= 0 ? 'text-amber-600 dark:text-amber-400' : 'text-destructive'}`}>
                            {margin.toFixed(1)}%
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* By Seller */}
        <TabsContent value="seller" className="space-y-4">
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                exportToCSV(
                  profitBySeller.map((s) => ({
                    Seller: s.name,
                    Sales: s.sales,
                    COGS: s.cogs,
                    Profit: s.profit,
                    Margin: s.sales > 0 ? `${((s.profit / s.sales) * 100).toFixed(1)}%` : '0%',
                  })),
                  'profit-by-seller'
                )
              }
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Profit by Seller</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Seller</TableHead>
                    <TableHead className="text-right">Sales</TableHead>
                    <TableHead className="text-right">COGS</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profitBySeller.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No data for this period
                      </TableCell>
                    </TableRow>
                  ) : (
                    profitBySeller.map((s) => {
                      const margin = s.sales > 0 ? (s.profit / s.sales) * 100 : 0;
                      return (
                        <TableRow key={s.name}>
                          <TableCell className="font-medium">{s.name}</TableCell>
                          <TableCell className="text-right">{formatCurrency(s.sales)}</TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {formatCurrency(s.cogs)}
                          </TableCell>
                          <TableCell className={`text-right font-medium ${s.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
                            {formatCurrency(s.profit)}
                          </TableCell>
                          <TableCell className={`text-right ${margin >= 10 ? 'text-emerald-600 dark:text-emerald-400' : margin >= 0 ? 'text-amber-600 dark:text-amber-400' : 'text-destructive'}`}>
                            {margin.toFixed(1)}%
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* By Product */}
        <TabsContent value="product" className="space-y-4">
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                exportToCSV(
                  profitByProduct.map((p) => ({
                    Product: p.name,
                    QtySold: p.qty,
                    Sales: p.sales,
                    COGS: p.cogs,
                    Profit: p.profit,
                    Margin: p.sales > 0 ? `${((p.profit / p.sales) * 100).toFixed(1)}%` : '0%',
                  })),
                  'profit-by-product'
                )
              }
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Profit by Product</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Qty Sold</TableHead>
                    <TableHead className="text-right">Sales</TableHead>
                    <TableHead className="text-right">COGS</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profitByProduct.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No data for this period
                      </TableCell>
                    </TableRow>
                  ) : (
                    profitByProduct.slice(0, 30).map((p) => {
                      const margin = p.sales > 0 ? (p.profit / p.sales) * 100 : 0;
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell className="text-right">{p.qty}</TableCell>
                          <TableCell className="text-right">{formatCurrency(p.sales)}</TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {formatCurrency(p.cogs)}
                          </TableCell>
                          <TableCell className={`text-right font-medium ${p.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
                            {formatCurrency(p.profit)}
                          </TableCell>
                          <TableCell className={`text-right ${margin >= 10 ? 'text-emerald-600 dark:text-emerald-400' : margin >= 0 ? 'text-amber-600 dark:text-amber-400' : 'text-destructive'}`}>
                            {margin.toFixed(1)}%
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
              {profitByProduct.length > 30 && (
                <p className="text-sm text-muted-foreground text-center mt-4">
                  Showing top 30 of {profitByProduct.length} products. Export CSV for full data.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* By Category */}
        <TabsContent value="category" className="space-y-4">
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                exportToCSV(
                  profitByCategory.map((c) => ({
                    Category: c.name,
                    Sales: c.sales,
                    COGS: c.cogs,
                    Profit: c.profit,
                    Margin: c.sales > 0 ? `${((c.profit / c.sales) * 100).toFixed(1)}%` : '0%',
                  })),
                  'profit-by-category'
                )
              }
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Profit by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Sales</TableHead>
                    <TableHead className="text-right">COGS</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profitByCategory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No data for this period
                      </TableCell>
                    </TableRow>
                  ) : (
                    profitByCategory.map((c) => {
                      const margin = c.sales > 0 ? (c.profit / c.sales) * 100 : 0;
                      return (
                        <TableRow key={c.id}>
                          <TableCell>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                              {c.name}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(c.sales)}</TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {formatCurrency(c.cogs)}
                          </TableCell>
                          <TableCell className={`text-right font-medium ${c.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
                            {formatCurrency(c.profit)}
                          </TableCell>
                          <TableCell className={`text-right ${margin >= 10 ? 'text-emerald-600 dark:text-emerald-400' : margin >= 0 ? 'text-amber-600 dark:text-amber-400' : 'text-destructive'}`}>
                            {margin.toFixed(1)}%
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
