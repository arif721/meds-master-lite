import { Banknote, AlertCircle, Clock, ArrowDownLeft } from 'lucide-react';
import { formatCurrency } from '@/lib/format';

type Props = {
  paidToday: number;
  dueToday: number;
  overdueInvoices: number;
  lastPaymentAmount: number;
  lastPaymentCustomer: string;
};

export function DashboardPayments(props: Props) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-foreground mb-3">💰 Payments Overview</h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-success/5 border border-success/20">
          <Banknote className="w-4 h-4 text-success" />
          <div>
            <p className="text-xs text-muted-foreground">Paid Today</p>
            <p className="text-sm font-bold text-success">{formatCurrency(props.paidToday)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-warning/5 border border-warning/20">
          <Clock className="w-4 h-4 text-warning" />
          <div>
            <p className="text-xs text-muted-foreground">Due Today</p>
            <p className="text-sm font-bold text-warning">{formatCurrency(props.dueToday)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-destructive/5 border border-destructive/20">
          <AlertCircle className="w-4 h-4 text-destructive" />
          <div>
            <p className="text-xs text-muted-foreground">Overdue Invoices</p>
            <p className="text-sm font-bold text-destructive">{props.overdueInvoices}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/20">
          <ArrowDownLeft className="w-4 h-4 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Last Payment</p>
            <p className="text-sm font-bold text-foreground">{formatCurrency(props.lastPaymentAmount)}</p>
            <p className="text-xs text-muted-foreground truncate">{props.lastPaymentCustomer}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
