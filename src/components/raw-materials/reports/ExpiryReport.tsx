import { Download, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { useExpiryReport } from '@/hooks/useRawMaterialsReports';

const STATUS_CONFIG = {
  expired: { 
    label: 'Expired', 
    variant: 'destructive' as const, 
    icon: <AlertTriangle className="w-4 h-4" />,
    bgClass: 'bg-destructive/10',
  },
  critical: { 
    label: '< 7 Days', 
    variant: 'destructive' as const, 
    icon: <AlertTriangle className="w-4 h-4" />,
    bgClass: 'bg-destructive/5',
  },
  warning: { 
    label: '< 30 Days', 
    variant: 'outline' as const, 
    icon: <Clock className="w-4 h-4" />,
    bgClass: 'bg-warning/5',
  },
  ok: { 
    label: 'OK', 
    variant: 'secondary' as const, 
    icon: <CheckCircle className="w-4 h-4" />,
    bgClass: '',
  },
};

export function ExpiryReport() {
  const { expired, expiringSoon, all, totalExpiredValue, totalExpiringSoonValue } = useExpiryReport(60);

  const exportCSV = () => {
    const rows: string[] = ['Material,Lot No,Expiry Date,Days Until Expiry,Balance,Unit Cost,Loss Value,Status'];
    
    all.forEach(item => {
      rows.push([
        `"${item.material.name}"`,
        item.lot.lot_number,
        item.lot.expiry_date || '',
        item.daysUntilExpiry.toString(),
        item.lot.current_balance.toFixed(2),
        item.lot.unit_cost.toFixed(2),
        item.lossValue.toFixed(2),
        item.status.toUpperCase(),
      ].join(','));
    });
    
    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expiry-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle className="text-lg">Expiry Report</CardTitle>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-destructive/10 rounded-lg text-center">
            <AlertTriangle className="w-6 h-6 mx-auto text-destructive mb-2" />
            <p className="text-sm text-muted-foreground">Expired</p>
            <p className="text-2xl font-bold text-destructive">{expired.length}</p>
            <p className="text-sm text-muted-foreground">{formatCurrency(totalExpiredValue)}</p>
          </div>
          
          <div className="p-4 bg-destructive/5 rounded-lg text-center">
            <AlertTriangle className="w-6 h-6 mx-auto text-destructive mb-2" />
            <p className="text-sm text-muted-foreground">Critical (7 days)</p>
            <p className="text-2xl font-bold text-destructive">
              {all.filter(i => i.status === 'critical').length}
            </p>
          </div>
          
          <div className="p-4 bg-warning/10 rounded-lg text-center">
            <Clock className="w-6 h-6 mx-auto text-warning mb-2" />
            <p className="text-sm text-muted-foreground">Warning (30 days)</p>
            <p className="text-2xl font-bold text-warning">
              {all.filter(i => i.status === 'warning').length}
            </p>
          </div>
          
          <div className="p-4 bg-primary/10 rounded-lg text-center">
            <CheckCircle className="w-6 h-6 mx-auto text-primary mb-2" />
            <p className="text-sm text-muted-foreground">Expiring Soon Total</p>
            <p className="text-2xl font-bold">{expiringSoon.length}</p>
            <p className="text-sm text-muted-foreground">{formatCurrency(totalExpiringSoonValue)}</p>
          </div>
        </div>

        {/* Table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Material</TableHead>
              <TableHead>Lot No</TableHead>
              <TableHead>Expiry Date</TableHead>
              <TableHead className="text-right">Days Left</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead className="text-right">Loss Value</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {all.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No lots with expiry dates
                </TableCell>
              </TableRow>
            ) : (
              all
                .filter(item => item.daysUntilExpiry <= 60)
                .map(item => {
                  const config = STATUS_CONFIG[item.status];
                  return (
                    <TableRow key={item.lot.id} className={config.bgClass}>
                      <TableCell className="font-medium">{item.material.name}</TableCell>
                      <TableCell>{item.lot.lot_number}</TableCell>
                      <TableCell>{item.lot.expiry_date}</TableCell>
                      <TableCell className="text-right">
                        {item.daysUntilExpiry <= 0 ? (
                          <span className="text-destructive font-bold">Expired</span>
                        ) : (
                          `${item.daysUntilExpiry} days`
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.lot.current_balance.toFixed(2)} {item.material.unit}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(item.lossValue)}</TableCell>
                      <TableCell>
                        <Badge variant={config.variant} className="gap-1">
                          {config.icon}
                          {config.label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
