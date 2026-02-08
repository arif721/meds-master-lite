import { Loader2 } from 'lucide-react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { DashboardKPICards } from '@/components/dashboard/DashboardKPICards';
import { DashboardCharts } from '@/components/dashboard/DashboardCharts';
import { DashboardAlerts } from '@/components/dashboard/DashboardAlerts';
import { DashboardInsights } from '@/components/dashboard/DashboardInsights';
import { DashboardInventoryIntel } from '@/components/dashboard/DashboardInventoryIntel';
import { DashboardPayments } from '@/components/dashboard/DashboardPayments';
import { DashboardSamples } from '@/components/dashboard/DashboardSamples';
import { DashboardQuickActions } from '@/components/dashboard/DashboardQuickActions';
import { DataTable } from '@/components/DataTable';
import { formatCurrency, formatDate } from '@/lib/format';
import { useMemo } from 'react';

export default function Dashboard() {
  const {
    isLoading,
    products, batches, customers, stores,
    kpiMetrics,
    getChartData,
    storeWiseData,
    alerts,
    insights,
    inventoryIntel,
    paymentsOverview,
    samplesOverview,
    recentInvoices,
  } = useDashboardData();

  const getProductName = (productId: string) =>
    products.find(p => p.id === productId)?.name || 'Unknown';

  const getCustomerName = (customerId: string) =>
    customers.find(c => c.id === customerId)?.name || stores.find(s => s.id === customerId)?.name || 'Unknown';

  const getDaysUntilExpiry = (dateStr: string) => {
    const d = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
    return d;
  };

  // Expiry data for table
  const expiryData = useMemo(() =>
    [...kpiMetrics.expiredBatches, ...kpiMetrics.nearExpiryBatches].slice(0, 5),
    [kpiMetrics.expiredBatches, kpiMetrics.nearExpiryBatches]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Overview of your pharmacy business</p>
        </div>
      </div>

      {/* ১) KPI Cards */}
      <DashboardKPICards
        totalInventoryValue={kpiMetrics.totalInventoryValue}
        totalStockCost={kpiMetrics.totalStockCost}
        todaySales={kpiMetrics.todaySales}
        monthSales={kpiMetrics.monthSales}
        totalDue={kpiMetrics.totalDue}
        todayProfit={kpiMetrics.todayProfit}
        monthProfit={kpiMetrics.monthProfit}
        monthFreeItems={kpiMetrics.monthFreeItems}
        stockSalesRatio={kpiMetrics.stockSalesRatio}
      />

      {/* ২) Charts */}
      <DashboardCharts getChartData={getChartData} storeWiseData={storeWiseData} />

      {/* ৩) Alerts */}
      <DashboardAlerts
        negProfitInvoices={alerts.negProfitInvoices}
        recentSamplesCount={alerts.recentSamplesCount}
        pendingPaymentCount={alerts.pendingPaymentCount}
        pendingAmount={alerts.pendingAmount}
        lowStockCount={kpiMetrics.lowStockCount}
        nearExpiryCount={kpiMetrics.nearExpiryCount}
        expiredCount={kpiMetrics.expiredCount}
      />

      {/* ৪) Quick Insights */}
      <DashboardInsights {...insights} />

      {/* ৫) Inventory Intelligence */}
      <DashboardInventoryIntel {...inventoryIntel} />

      {/* ৬ & ৭) Payments + Samples + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <DashboardPayments {...paymentsOverview} />
        <DashboardSamples {...samplesOverview} />
        <DashboardQuickActions />
      </div>

      {/* Recent Sales & Expiry Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-3">Recent Sales</h3>
          <DataTable
            columns={[
              { key: 'invoice_number', header: 'Invoice' },
              { key: 'customer', header: 'Customer', render: (inv) => getCustomerName(inv.customer_id || inv.store_id || '') },
              { key: 'total', header: 'Amount', render: (inv) => formatCurrency(Number(inv.total)) },
              { key: 'status', header: 'Status', render: (inv) => (
                <span className={inv.status === 'CONFIRMED' || inv.status === 'PAID' ? 'badge-success' : 'badge-warning'}>{inv.status}</span>
              )},
            ]}
            data={recentInvoices}
            keyExtractor={(inv) => inv.id}
            emptyMessage="No recent sales"
          />
        </div>

        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-3">Expiry Alerts</h3>
          <DataTable
            columns={[
              { key: 'product', header: 'Product', render: (batch) => getProductName(batch.product_id) },
              { key: 'batch_number', header: 'Lot#' },
              { key: 'expiry_date', header: 'Expires', render: (batch) => batch.expiry_date ? formatDate(new Date(batch.expiry_date)) : '—' },
              { key: 'days', header: 'Days Left', render: (batch) => {
                if (!batch.expiry_date) return '—';
                const days = getDaysUntilExpiry(batch.expiry_date);
                return <span className={days <= 0 ? 'badge-danger' : days <= 30 ? 'badge-warning' : 'badge-info'}>{days <= 0 ? 'Expired' : `${days} days`}</span>;
              }},
            ]}
            data={expiryData}
            keyExtractor={(batch) => batch.id}
            emptyMessage="No expiry alerts"
          />
        </div>
      </div>

      {/* Sales Summary */}
      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-foreground mb-4">Sales Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 rounded-xl bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Today</p>
            <p className="text-xl font-bold text-foreground">{formatCurrency(kpiMetrics.todaySales)}</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">This Month</p>
            <p className="text-xl font-bold text-foreground">{formatCurrency(kpiMetrics.monthSales)}</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-primary/10">
            <p className="text-xs text-muted-foreground mb-1">This Year</p>
            <p className="text-xl font-bold text-primary">{formatCurrency(kpiMetrics.yearSales)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
