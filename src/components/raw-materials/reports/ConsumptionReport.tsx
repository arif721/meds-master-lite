import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { useConsumptionReport } from '@/hooks/useRawMaterialsReports';

const REASON_COLORS: Record<string, string> = {
  PRODUCTION: 'bg-primary text-primary-foreground',
  SAMPLE: 'bg-secondary text-secondary-foreground',
  WASTE: 'bg-destructive text-destructive-foreground',
  TRANSFER_OUT: 'bg-warning text-warning-foreground',
};

export function ConsumptionReport() {
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  
  const [startDate, setStartDate] = useState(firstOfMonth.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);

  const { report, totals, isLoading } = useConsumptionReport(startDate, endDate);

  const exportCSV = () => {
    const rows: string[] = ['Material,Unit,Reason,Quantity,Value'];
    
    report.forEach(item => {
      item.byReason.forEach(reason => {
        rows.push([
          `"${item.material.name}"`,
          item.material.unit,
          reason.reason,
          reason.quantity.toFixed(2),
          reason.value.toFixed(2),
        ].join(','));
      });
    });
    
    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `consumption-${startDate}-to-${endDate}.csv`;
    a.click();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle className="text-lg">Consumption Report</CardTitle>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Label htmlFor="start">From:</Label>
              <Input
                id="start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="end">To:</Label>
              <Input
                id="end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-40"
              />
            </div>
            <Button variant="outline" size="sm" onClick={exportCSV} disabled={isLoading}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary by Reason */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {Object.entries(totals.byReason).map(([reason, data]) => {
            const typedData = data as { qty: number; value: number };
            return (
              <div key={reason} className="p-4 bg-muted rounded-lg text-center">
                <Badge className={REASON_COLORS[reason] || 'bg-secondary'}>{reason}</Badge>
                <p className="text-lg font-bold mt-2">{typedData.qty.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">{formatCurrency(typedData.value)}</p>
              </div>
            );
          })}
        </div>

        {/* Total Summary */}
        <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-primary/10 rounded-lg">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Total Quantity Consumed</p>
            <p className="text-2xl font-bold">{totals.totalQty.toFixed(2)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Total Consumption Value</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(totals.totalValue)}</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Breakdown by Reason</TableHead>
                <TableHead className="text-right">Total Qty</TableHead>
                <TableHead className="text-right">Total Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No consumption data for this period
                  </TableCell>
                </TableRow>
              ) : (
                report.map(item => (
                  <TableRow key={item.material.id}>
                    <TableCell className="font-medium">{item.material.name}</TableCell>
                    <TableCell>{item.material.unit}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {item.byReason.map(reason => (
                          <Badge 
                            key={reason.reason} 
                            variant="outline"
                            className="text-xs"
                          >
                            {reason.reason}: {reason.quantity.toFixed(2)}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{item.totalQty.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.totalValue)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
