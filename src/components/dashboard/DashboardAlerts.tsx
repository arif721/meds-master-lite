import { AlertTriangle, TrendingDown, Percent, FlaskConical, Clock } from 'lucide-react';

type Props = {
  negProfitInvoices: number;
  recentSamplesCount: number;
  pendingPaymentCount: number;
  pendingAmount: number;
  lowStockCount: number;
  nearExpiryCount: number;
  expiredCount: number;
};

function AlertItem({ icon, label, value, variant = 'warning' }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  variant?: 'warning' | 'danger' | 'info';
}) {
  const colors = {
    warning: 'text-warning bg-warning/10',
    danger: 'text-destructive bg-destructive/10',
    info: 'text-info bg-info/10',
  };
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border bg-card">
      <div className={`p-2 rounded-lg ${colors[variant]}`}>{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}

export function DashboardAlerts(props: Props) {
  return (
    <div className="rounded-2xl border bg-card/50 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-foreground mb-3">⚠️ Alerts & Attention</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <AlertItem icon={<TrendingDown className="w-4 h-4" />} label="Negative Profit Invoices" value={props.negProfitInvoices} variant="danger" />
        <AlertItem icon={<Clock className="w-4 h-4" />} label="Pending Payments" value={`${props.pendingPaymentCount} (৳${props.pendingAmount.toLocaleString('en-BD', { maximumFractionDigits: 0 })})`} variant="warning" />
        <AlertItem icon={<FlaskConical className="w-4 h-4" />} label="Samples (Last 7 Days)" value={props.recentSamplesCount} variant="info" />
        <AlertItem icon={<AlertTriangle className="w-4 h-4" />} label="Low Stock Items" value={props.lowStockCount} variant={props.lowStockCount > 0 ? 'warning' : 'info'} />
        <AlertItem icon={<Clock className="w-4 h-4" />} label="Expiring Soon (60d)" value={props.nearExpiryCount} variant={props.nearExpiryCount > 0 ? 'warning' : 'info'} />
        <AlertItem icon={<AlertTriangle className="w-4 h-4" />} label="Expired Batches" value={props.expiredCount} variant={props.expiredCount > 0 ? 'danger' : 'info'} />
      </div>
    </div>
  );
}
