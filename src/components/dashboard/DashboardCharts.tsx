import { useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ChartGranularity } from '@/hooks/useDashboardData';
import { formatCurrency } from '@/lib/format';

type ChartDataPoint = { label: string; sales: number; profit: number };
type StoreDataPoint = { name: string; sales: number; profit: number };

type Props = {
  getChartData: (g: ChartGranularity) => ChartDataPoint[];
  storeWiseData: StoreDataPoint[];
};

const GRANULARITY_OPTIONS: { label: string; value: ChartGranularity }[] = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
];

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload) return null;
  return (
    <div className="rounded-lg border bg-card p-2.5 shadow-lg text-xs">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color }}>
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
}

export function DashboardCharts({ getChartData, storeWiseData }: Props) {
  const [granularity, setGranularity] = useState<ChartGranularity>('daily');
  const chartData = getChartData(granularity);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Sales & Profit Line Chart */}
      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">Sales & Profit Trend</h3>
          <div className="flex gap-1 bg-muted rounded-lg p-0.5">
            {GRANULARITY_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setGranularity(opt.value)}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                  granularity === opt.value
                    ? 'bg-card text-foreground shadow-sm font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} className="text-muted-foreground" />
              <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="sales" name="Sales" stroke="hsl(217, 91%, 50%)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="profit" name="Profit" stroke="hsl(142, 76%, 36%)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Store-wise Bar Chart */}
      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-foreground mb-4">Store-wise Sales & Profit</h3>
        <div className="h-64">
          {storeWiseData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={storeWiseData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="sales" name="Sales" fill="hsl(217, 91%, 50%)" radius={[0, 4, 4, 0]} />
                <Bar dataKey="profit" name="Profit" fill="hsl(142, 76%, 36%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No store data</div>
          )}
        </div>
      </div>
    </div>
  );
}
