import { format } from 'date-fns';
import {
  Package,
  TrendingDown,
  AlertTriangle,
  Clock,
  DollarSign,
  Beaker,
  Leaf,
  Box,
  Layers,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency } from '@/lib/format';
import { useRawMaterialDashboard } from '@/hooks/useRawMaterialsReports';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const TYPE_COLORS: Record<string, string> = {
  CHEMICAL: '#3b82f6',
  HERB: '#22c55e',
  PACKAGING: '#f59e0b',
  OTHER: '#8b5cf6',
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  CHEMICAL: <Beaker className="w-4 h-4" />,
  HERB: <Leaf className="w-4 h-4" />,
  PACKAGING: <Box className="w-4 h-4" />,
  OTHER: <Layers className="w-4 h-4" />,
};

export function RawMaterialsDashboard() {
  const dashboard = useRawMaterialDashboard();

  // Prepare pie chart data
  const pieData = Object.entries(dashboard.stockByType).map(([type, data]) => ({
    name: type,
    value: (data as { count: number; value: number }).value,
    count: (data as { count: number; value: number }).count,
  }));

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="w-4 h-4" />
              Total Materials
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{dashboard.totalMaterials}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Total Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{formatCurrency(dashboard.totalValue)}</p>
          </CardContent>
        </Card>

        <Card className={dashboard.lowStockCount > 0 ? 'border-warning' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingDown className="w-4 h-4" />
              Low Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${dashboard.lowStockCount > 0 ? 'text-warning' : ''}`}>
              {dashboard.lowStockCount}
            </p>
          </CardContent>
        </Card>

        <Card className={dashboard.expiringSoonCount > 0 ? 'border-warning' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Expiring Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${dashboard.expiringSoonCount > 0 ? 'text-warning' : ''}`}>
              {dashboard.expiringSoonCount}
            </p>
          </CardContent>
        </Card>

        <Card className={dashboard.expiredCount > 0 ? 'border-destructive' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Expired
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${dashboard.expiredCount > 0 ? 'text-destructive' : ''}`}>
              {dashboard.expiredCount}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts & Lists Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Stock Value by Type Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Stock Value by Type</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No data available</p>
            ) : (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={TYPE_COLORS[entry.name] || '#6b7280'} 
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Consumed Materials (30 days) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top 10 Consumed (30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            {dashboard.topConsumed.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No consumption data</p>
            ) : (
              <div className="space-y-2">
                {dashboard.topConsumed.map((item, index) => (
                  <div key={item.material.id} className="flex items-center justify-between p-2 bg-muted rounded">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-sm w-5">{index + 1}.</span>
                      {TYPE_ICONS[item.material.type]}
                      <span className="font-medium truncate max-w-[150px]">{item.material.name}</span>
                    </div>
                    <Badge variant="secondary">
                      {item.totalQty.toFixed(2)} {item.material.unit}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alerts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Low Stock Alert */}
        <Card className={dashboard.lowStockItems.length > 0 ? 'border-warning' : ''}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-warning">
              <TrendingDown className="w-5 h-5" />
              Low Stock Alert ({dashboard.lowStockCount})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dashboard.lowStockItems.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">All stock levels OK</p>
            ) : (
              <div className="space-y-2">
                {dashboard.lowStockItems.map(item => (
                  <div key={item.material.id} className="flex justify-between items-center p-2 bg-warning/10 rounded">
                    <span className="font-medium">{item.material.name}</span>
                    <div className="text-right">
                      <Badge variant="outline" className="border-warning text-warning">
                        {item.totalBalance.toFixed(2)} / {item.material.reorder_level} {item.material.unit}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expiry Alert */}
        <Card className={dashboard.expiredCount > 0 ? 'border-destructive' : dashboard.expiringSoonCount > 0 ? 'border-warning' : ''}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className={`w-5 h-5 ${dashboard.expiredCount > 0 ? 'text-destructive' : 'text-warning'}`} />
              Expiry Alert ({dashboard.expiredCount + dashboard.expiringSoonCount})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dashboard.expiredCount === 0 && dashboard.expiringSoonCount === 0 ? (
              <p className="text-muted-foreground text-center py-4">No expiry alerts</p>
            ) : (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {dashboard.expiredLots.map(item => (
                  <div key={item.lot.id} className="flex justify-between items-center p-2 bg-destructive/10 rounded">
                    <div>
                      <span className="font-medium">{item.material.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">({item.lot.lot_number})</span>
                    </div>
                    <Badge variant="destructive">Expired</Badge>
                  </div>
                ))}
                {dashboard.expiringSoonLots.slice(0, 5).map(item => (
                  <div key={item.lot.id} className="flex justify-between items-center p-2 bg-warning/10 rounded">
                    <div>
                      <span className="font-medium">{item.material.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">({item.lot.lot_number})</span>
                    </div>
                    <Badge variant="outline" className="border-warning text-warning">
                      {item.daysUntilExpiry} days
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Transactions (Last 20)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Material</TableHead>
                <TableHead>Lot</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dashboard.recentMovements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No recent transactions
                  </TableCell>
                </TableRow>
              ) : (
                dashboard.recentMovements.map(movement => (
                  <TableRow key={movement.id}>
                    <TableCell className="whitespace-nowrap">
                      <div className="text-sm">{format(new Date(movement.created_at), 'dd/MM/yyyy')}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(movement.created_at), 'HH:mm:ss')}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{movement.material?.name || '-'}</TableCell>
                    <TableCell>{movement.lot?.lot_number || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{movement.type}</Badge>
                    </TableCell>
                    <TableCell className={`text-right font-medium ${movement.quantity > 0 ? 'text-primary' : 'text-destructive'}`}>
                      {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">
                      {movement.notes || movement.reason || '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
