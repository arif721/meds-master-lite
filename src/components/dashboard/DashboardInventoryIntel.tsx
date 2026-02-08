import { Archive, Zap, CalendarClock } from 'lucide-react';

type Props = {
  deadStock30: number;
  deadStock60: number;
  deadStock90: number;
  fastMoving: { name: string; qty: number }[];
  avgCoverageDays: number;
};

export function DashboardInventoryIntel(props: Props) {
  return (
    <div className="rounded-2xl border bg-card/50 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-foreground mb-3">📦 Inventory Intelligence</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Dead Stock */}
        <div className="rounded-xl border bg-card p-3">
          <div className="flex items-center gap-2 mb-2">
            <Archive className="w-4 h-4 text-destructive" />
            <span className="text-xs font-semibold text-foreground">Dead Stock</span>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between"><span className="text-muted-foreground">30+ days idle</span><span className="font-bold text-foreground">{props.deadStock30}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">60+ days idle</span><span className="font-bold text-warning">{props.deadStock60}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">90+ days idle</span><span className="font-bold text-destructive">{props.deadStock90}</span></div>
          </div>
        </div>

        {/* Fast Moving */}
        <div className="rounded-xl border bg-card p-3">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-success" />
            <span className="text-xs font-semibold text-foreground">Fast Moving (90d)</span>
          </div>
          <div className="space-y-1.5 text-xs">
            {props.fastMoving.length > 0 ? props.fastMoving.map((item, i) => (
              <div key={i} className="flex justify-between">
                <span className="text-muted-foreground truncate mr-2">{item.name}</span>
                <span className="font-bold text-foreground shrink-0">{item.qty}</span>
              </div>
            )) : <p className="text-muted-foreground">No data</p>}
          </div>
        </div>

        {/* Stock Coverage */}
        <div className="rounded-xl border bg-card p-3">
          <div className="flex items-center gap-2 mb-2">
            <CalendarClock className="w-4 h-4 text-info" />
            <span className="text-xs font-semibold text-foreground">Stock Coverage</span>
          </div>
          <div className="text-center py-2">
            <p className="text-3xl font-bold text-foreground">{props.avgCoverageDays}</p>
            <p className="text-xs text-muted-foreground">Avg days of stock remaining</p>
          </div>
        </div>
      </div>
    </div>
  );
}
