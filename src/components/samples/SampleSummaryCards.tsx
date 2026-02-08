import { Package, TrendingUp, DollarSign, Star, Users } from 'lucide-react';
import { formatCurrency } from '@/lib/format';

type Props = {
  totalSamples: number;
  totalTPValue: number;
  totalCostValue: number;
  topProduct: { name: string; qty: number } | null;
  topReceiver: { name: string; count: number } | null;
};

export function SampleSummaryCards({ totalSamples, totalTPValue, totalCostValue, topProduct, topReceiver }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      <div className="p-3 rounded-lg bg-card border">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          <Package className="w-4 h-4" />
          <span className="text-xs font-medium">Total Samples</span>
        </div>
        <p className="text-lg font-bold">{totalSamples}</p>
      </div>
      <div className="p-3 rounded-lg bg-card border">
        <div className="flex items-center gap-2 text-primary mb-1">
          <TrendingUp className="w-4 h-4" />
          <span className="text-xs font-medium">TP Value</span>
        </div>
        <p className="text-lg font-bold text-primary">{formatCurrency(totalTPValue)}</p>
      </div>
      <div className="p-3 rounded-lg bg-card border">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          <DollarSign className="w-4 h-4" />
          <span className="text-xs font-medium">Cost (COGS)</span>
        </div>
        <p className="text-lg font-bold">{formatCurrency(totalCostValue)}</p>
      </div>
      <div className="p-3 rounded-lg bg-card border">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          <Star className="w-4 h-4" />
          <span className="text-xs font-medium">Top Product (Month)</span>
        </div>
        <p className="text-sm font-bold truncate">{topProduct ? `${topProduct.name} (${topProduct.qty})` : '—'}</p>
      </div>
      <div className="p-3 rounded-lg bg-card border">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          <Users className="w-4 h-4" />
          <span className="text-xs font-medium">Top Receiver</span>
        </div>
        <p className="text-sm font-bold truncate">{topReceiver ? `${topReceiver.name} (${topReceiver.count})` : '—'}</p>
      </div>
    </div>
  );
}
