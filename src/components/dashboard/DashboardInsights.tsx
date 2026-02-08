import { ShoppingBag, TrendingUp, Users, UserCheck } from 'lucide-react';
import { formatCurrency } from '@/lib/format';

type Props = {
  bestSellingProduct: { name: string; qty: number };
  mostProfitableProduct: { name: string; profit: number };
  topCustomer: { name: string; sales: number };
  topSeller: { name: string; sales: number };
};

function InsightCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border bg-card p-3 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 rounded-lg bg-primary/10 text-primary">{icon}</div>
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <p className="text-sm font-bold text-foreground truncate">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

export function DashboardInsights(props: Props) {
  return (
    <div className="rounded-2xl border bg-card/50 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-foreground mb-3">💡 Quick Insights</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <InsightCard
          icon={<ShoppingBag className="w-3.5 h-3.5" />}
          label="Best Selling Product"
          value={props.bestSellingProduct.name}
          sub={`${props.bestSellingProduct.qty} units sold`}
        />
        <InsightCard
          icon={<TrendingUp className="w-3.5 h-3.5" />}
          label="Most Profitable Product"
          value={props.mostProfitableProduct.name}
          sub={formatCurrency(props.mostProfitableProduct.profit)}
        />
        <InsightCard
          icon={<Users className="w-3.5 h-3.5" />}
          label="Top Customer"
          value={props.topCustomer.name}
          sub={formatCurrency(props.topCustomer.sales)}
        />
        <InsightCard
          icon={<UserCheck className="w-3.5 h-3.5" />}
          label="Top Seller"
          value={props.topSeller.name}
          sub={formatCurrency(props.topSeller.sales)}
        />
      </div>
    </div>
  );
}
