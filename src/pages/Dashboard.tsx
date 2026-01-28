import { Package, TrendingUp, AlertTriangle, Clock, Users, Boxes, Loader2 } from 'lucide-react';
import { MetricCard } from '@/components/MetricCard';
import { DataTable } from '@/components/DataTable';
import { useProducts, useBatches, useCustomers, useInvoices } from '@/hooks/useDatabase';
import { formatCurrency, formatDate, isExpiringSoon, isExpired, getDaysUntilExpiry } from '@/lib/format';
import { useMemo } from 'react';

export default function Dashboard() {
  const { data: products = [], isLoading: productsLoading } = useProducts();
  const { data: batches = [], isLoading: batchesLoading } = useBatches();
  const { data: customers = [] } = useCustomers();
  const { data: invoices = [], isLoading: invoicesLoading } = useInvoices();

  const isLoading = productsLoading || batchesLoading || invoicesLoading;

  const metrics = useMemo(() => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    // Total inventory value
    const totalInventoryValue = batches.reduce((sum, batch) => {
      return sum + (batch.quantity * Number(batch.cost_price));
    }, 0);

    // Total stock quantity
    const totalStockQuantity = batches.reduce((sum, batch) => sum + batch.quantity, 0);

    // Sales calculations
    const confirmedInvoices = invoices.filter(inv => inv.status !== 'DRAFT' && inv.status !== 'CANCELLED');
    
    const todaySales = confirmedInvoices
      .filter(inv => new Date(inv.created_at).toDateString() === today.toDateString())
      .reduce((sum, inv) => sum + Number(inv.total), 0);

    const monthSales = confirmedInvoices
      .filter(inv => new Date(inv.created_at) >= startOfMonth)
      .reduce((sum, inv) => sum + Number(inv.total), 0);

    const yearSales = confirmedInvoices
      .filter(inv => new Date(inv.created_at) >= startOfYear)
      .reduce((sum, inv) => sum + Number(inv.total), 0);

    // Total due
    const totalDue = confirmedInvoices.reduce((sum, inv) => sum + Number(inv.due), 0);

    // Low stock (less than 50 units)
    const lowStockProducts = products.filter(product => {
      const stock = batches
        .filter(b => b.product_id === product.id)
        .reduce((sum, b) => sum + b.quantity, 0);
      return stock < 50 && stock > 0;
    });

    // Near expiry (within 60 days)
    const nearExpiryBatches = batches.filter(batch => 
      batch.quantity > 0 && batch.expiry_date && isExpiringSoon(new Date(batch.expiry_date), 60)
    );

    // Expired batches
    const expiredBatches = batches.filter(batch =>
      batch.quantity > 0 && batch.expiry_date && isExpired(new Date(batch.expiry_date))
    );

    return {
      totalInventoryValue,
      totalStockQuantity,
      todaySales,
      monthSales,
      yearSales,
      totalDue,
      lowStockCount: lowStockProducts.length,
      nearExpiryCount: nearExpiryBatches.length,
      expiredCount: expiredBatches.length,
      lowStockProducts,
      nearExpiryBatches,
      expiredBatches,
    };
  }, [products, batches, invoices]);

  const recentInvoices = useMemo(() => {
    return [...invoices]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
  }, [invoices]);

  const getProductName = (productId: string) => {
    return products.find(p => p.id === productId)?.name || 'Unknown';
  };

  const getCustomerName = (customerId: string) => {
    return customers.find(c => c.id === customerId)?.name || 'Unknown';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your pharmacy business</p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Inventory Value"
          value={formatCurrency(metrics.totalInventoryValue)}
          subtitle={`${metrics.totalStockQuantity.toLocaleString()} items in stock`}
          icon={<Boxes className="w-5 h-5" />}
        />
        <MetricCard
          title="Today's Sales"
          value={formatCurrency(metrics.todaySales)}
          icon={<TrendingUp className="w-5 h-5" />}
          variant="success"
        />
        <MetricCard
          title="This Month Sales"
          value={formatCurrency(metrics.monthSales)}
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <MetricCard
          title="Total Customer Due"
          value={formatCurrency(metrics.totalDue)}
          icon={<Users className="w-5 h-5" />}
          variant={metrics.totalDue > 0 ? 'warning' : 'default'}
        />
      </div>

      {/* Alerts Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Low Stock Items"
          value={metrics.lowStockCount}
          subtitle="Products below 50 units"
          icon={<Package className="w-5 h-5" />}
          variant={metrics.lowStockCount > 0 ? 'warning' : 'default'}
        />
        <MetricCard
          title="Expiring Soon"
          value={metrics.nearExpiryCount}
          subtitle="Within 60 days"
          icon={<Clock className="w-5 h-5" />}
          variant={metrics.nearExpiryCount > 0 ? 'warning' : 'default'}
        />
        <MetricCard
          title="Expired Batches"
          value={metrics.expiredCount}
          subtitle="Needs attention"
          icon={<AlertTriangle className="w-5 h-5" />}
          variant={metrics.expiredCount > 0 ? 'danger' : 'default'}
        />
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sales */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Recent Sales</h2>
          <DataTable
            columns={[
              { key: 'invoice_number', header: 'Invoice' },
              { 
                key: 'customer', 
                header: 'Customer',
                render: (inv) => getCustomerName(inv.customer_id),
              },
              { 
                key: 'total', 
                header: 'Amount',
                render: (inv) => formatCurrency(Number(inv.total)),
              },
              {
                key: 'status',
                header: 'Status',
                render: (inv) => (
                  <span className={inv.status === 'CONFIRMED' || inv.status === 'PAID' ? 'badge-success' : 'badge-warning'}>
                    {inv.status}
                  </span>
                ),
              },
            ]}
            data={recentInvoices}
            keyExtractor={(inv) => inv.id}
            emptyMessage="No recent sales"
          />
        </div>

        {/* Expiry Alerts */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Expiry Alerts</h2>
          <DataTable
            columns={[
              { 
                key: 'product', 
                header: 'Product',
                render: (batch) => getProductName(batch.product_id),
              },
              { key: 'batch_number', header: 'Lot#' },
              { 
                key: 'expiry_date', 
                header: 'Expires',
                render: (batch) => batch.expiry_date ? formatDate(new Date(batch.expiry_date)) : '—',
              },
              {
                key: 'days',
                header: 'Days Left',
                render: (batch) => {
                  if (!batch.expiry_date) return '—';
                  const days = getDaysUntilExpiry(new Date(batch.expiry_date));
                  return (
                    <span className={days <= 0 ? 'badge-danger' : days <= 30 ? 'badge-warning' : 'badge-info'}>
                      {days <= 0 ? 'Expired' : `${days} days`}
                    </span>
                  );
                },
              },
            ]}
            data={[...metrics.expiredBatches, ...metrics.nearExpiryBatches].slice(0, 5)}
            keyExtractor={(batch) => batch.id}
            emptyMessage="No expiry alerts"
          />
        </div>
      </div>

      {/* Year Sales Summary */}
      <div className="metric-card">
        <h2 className="text-lg font-semibold mb-4">Sales Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 rounded-lg bg-muted/50">
            <p className="stat-label">Today</p>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(metrics.todaySales)}</p>
          </div>
          <div className="text-center p-4 rounded-lg bg-muted/50">
            <p className="stat-label">This Month</p>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(metrics.monthSales)}</p>
          </div>
          <div className="text-center p-4 rounded-lg bg-primary/10">
            <p className="stat-label">This Year</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(metrics.yearSales)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
