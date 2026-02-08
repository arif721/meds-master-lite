import { FlaskConical, TrendingUp, Package, Users } from 'lucide-react';
import { formatCurrency } from '@/lib/format';

type Props = {
  monthSampleQty: number;
  monthSampleValue: number;
  topSampledProduct: { name: string; qty: number };
  topReceiver: { name: string; count: number };
};

export function DashboardSamples(props: Props) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-foreground mb-3">🧪 Samples Overview (This Month)</h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-info/5 border border-info/20">
          <FlaskConical className="w-4 h-4 text-info" />
          <div>
            <p className="text-xs text-muted-foreground">Samples Given</p>
            <p className="text-sm font-bold text-foreground">{props.monthSampleQty}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/20">
          <TrendingUp className="w-4 h-4 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Sample Value (TP)</p>
            <p className="text-sm font-bold text-primary">{formatCurrency(props.monthSampleValue)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-2.5 rounded-lg border">
          <Package className="w-4 h-4 text-muted-foreground" />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Top Sampled Product</p>
            <p className="text-sm font-bold text-foreground truncate">{props.topSampledProduct.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-2.5 rounded-lg border">
          <Users className="w-4 h-4 text-muted-foreground" />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Top Receiver</p>
            <p className="text-sm font-bold text-foreground truncate">{props.topReceiver.name}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
