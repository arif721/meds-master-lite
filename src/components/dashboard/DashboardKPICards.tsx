import { Boxes, TrendingUp, Users, Wallet, Gift, BarChart3, TrendingDown } from 'lucide-react';
import { AnimatedCounter } from './AnimatedCounter';

type Props = {
  totalInventoryValue: number;
  totalStockCost: number;
  todaySales: number;
  monthSales: number;
  totalDue: number;
  todayProfit: number;
  monthProfit: number;
  monthFreeItems: number;
  stockSalesRatio: number;
};

function KPICard({ title, icon, children, variant = 'default' }: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}) {
  const borderColors = {
    default: 'border-border',
    success: 'border-success/20 bg-success/5',
    warning: 'border-warning/20 bg-warning/5',
    danger: 'border-destructive/20 bg-destructive/5',
  };
  const iconColors = {
    default: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    danger: 'bg-destructive/10 text-destructive',
  };

  return (
    <div className={`rounded-2xl border p-4 shadow-sm hover:shadow-md transition-shadow ${borderColors[variant]}`}>
      <div className="flex items-start justify-between">
        <div className="space-y-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground truncate">{title}</p>
          {children}
        </div>
        <div className={`p-2.5 rounded-xl shrink-0 ${iconColors[variant]}`}>{icon}</div>
      </div>
    </div>
  );
}

export function DashboardKPICards(props: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      <KPICard title="Total Inventory Value" icon={<Boxes className="w-4 h-4" />}>
        <p className="text-lg font-bold text-foreground">
          <AnimatedCounter value={props.totalInventoryValue} prefix="৳" />
        </p>
        <p className="text-xs text-muted-foreground">Stock Cost: ৳{props.totalStockCost.toLocaleString('en-BD', { maximumFractionDigits: 0 })}</p>
      </KPICard>

      <KPICard title="Today's Sales" icon={<TrendingUp className="w-4 h-4" />} variant="success">
        <p className="text-lg font-bold text-success">
          <AnimatedCounter value={props.todaySales} prefix="৳" />
        </p>
      </KPICard>

      <KPICard title="This Month Sales" icon={<TrendingUp className="w-4 h-4" />}>
        <p className="text-lg font-bold text-foreground">
          <AnimatedCounter value={props.monthSales} prefix="৳" />
        </p>
      </KPICard>

      <KPICard title="Today's Profit" icon={props.todayProfit >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />} variant={props.todayProfit >= 0 ? 'success' : 'danger'}>
        <p className={`text-lg font-bold ${props.todayProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
          <AnimatedCounter value={props.todayProfit} prefix="৳" />
        </p>
      </KPICard>

      <KPICard title="This Month Profit" icon={props.monthProfit >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />} variant={props.monthProfit >= 0 ? 'success' : 'danger'}>
        <p className={`text-lg font-bold ${props.monthProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
          <AnimatedCounter value={props.monthProfit} prefix="৳" />
        </p>
      </KPICard>

      <KPICard title="Total Customer Due" icon={<Users className="w-4 h-4" />} variant={props.totalDue > 0 ? 'warning' : 'default'}>
        <p className={`text-lg font-bold ${props.totalDue > 0 ? 'text-warning' : 'text-foreground'}`}>
          <AnimatedCounter value={props.totalDue} prefix="৳" />
        </p>
      </KPICard>

      <KPICard title="Stock Cost (Total)" icon={<Wallet className="w-4 h-4" />}>
        <p className="text-lg font-bold text-foreground">
          <AnimatedCounter value={props.totalStockCost} prefix="৳" decimals={0} />
        </p>
      </KPICard>

      <KPICard title="Free Items (This Month)" icon={<Gift className="w-4 h-4" />} variant={props.monthFreeItems > 0 ? 'warning' : 'default'}>
        <p className="text-lg font-bold text-foreground">
          <AnimatedCounter value={props.monthFreeItems} decimals={0} />
        </p>
      </KPICard>

      <KPICard title="Stock Coverage" icon={<BarChart3 className="w-4 h-4" />}>
        <p className="text-lg font-bold text-foreground">
          <AnimatedCounter value={props.stockSalesRatio} decimals={1} suffix="%" />
        </p>
        <p className="text-xs text-muted-foreground">Stock vs Avg Sales</p>
      </KPICard>
    </div>
  );
}
