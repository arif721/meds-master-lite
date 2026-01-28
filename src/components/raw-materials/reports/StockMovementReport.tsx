import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency } from '@/lib/format';
import { useStockMovementReport } from '@/hooks/useRawMaterialsReports';

export function StockMovementReport() {
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  
  const [startDate, setStartDate] = useState(firstOfMonth.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);

  const { report, isLoading } = useStockMovementReport(startDate, endDate);

  // Totals
  const totals = report.reduce(
    (acc, item) => ({
      openingValue: acc.openingValue + item.openingValue,
      totalInValue: acc.totalInValue + item.totalInValue,
      totalOutValue: acc.totalOutValue + item.totalOutValue,
      closingValue: acc.closingValue + item.closingValue,
    }),
    { openingValue: 0, totalInValue: 0, totalOutValue: 0, closingValue: 0 }
  );

  const exportCSV = () => {
    const rows: string[] = [
      'Material,Unit,Opening Bal,Opening Value,In Qty,In Value,Out Qty,Out Value,Closing Bal,Closing Value',
    ];
    
    report.forEach(item => {
      rows.push([
        `"${item.material.name}"`,
        item.material.unit,
        item.openingBalance.toFixed(2),
        item.openingValue.toFixed(2),
        item.totalIn.toFixed(2),
        item.totalInValue.toFixed(2),
        item.totalOut.toFixed(2),
        item.totalOutValue.toFixed(2),
        item.closingBalance.toFixed(2),
        item.closingValue.toFixed(2),
      ].join(','));
    });

    // Add totals
    rows.push([
      '"TOTAL"',
      '',
      '',
      totals.openingValue.toFixed(2),
      '',
      totals.totalInValue.toFixed(2),
      '',
      totals.totalOutValue.toFixed(2),
      '',
      totals.closingValue.toFixed(2),
    ].join(','));
    
    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-movement-${startDate}-to-${endDate}.csv`;
    a.click();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle className="text-lg">Stock Movement Report</CardTitle>
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
        {/* Summary */}
        <div className="grid grid-cols-4 gap-4 mb-6 p-4 bg-muted rounded-lg">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Opening Value</p>
            <p className="text-xl font-bold">{formatCurrency(totals.openingValue)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Total In</p>
            <p className="text-xl font-bold text-primary">{formatCurrency(totals.totalInValue)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Total Out</p>
            <p className="text-xl font-bold text-destructive">{formatCurrency(totals.totalOutValue)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Closing Value</p>
            <p className="text-xl font-bold text-primary">{formatCurrency(totals.closingValue)}</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Opening Bal</TableHead>
                  <TableHead className="text-right">In</TableHead>
                  <TableHead className="text-right">Out</TableHead>
                  <TableHead className="text-right">Closing Bal</TableHead>
                  <TableHead className="text-right">Closing Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No movement data for this period
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {report.map(item => (
                      <TableRow key={item.material.id}>
                        <TableCell className="font-medium">{item.material.name}</TableCell>
                        <TableCell>{item.material.unit}</TableCell>
                        <TableCell className="text-right">{item.openingBalance.toFixed(2)}</TableCell>
                        <TableCell className="text-right text-primary">
                          {item.totalIn > 0 ? `+${item.totalIn.toFixed(2)}` : '-'}
                        </TableCell>
                        <TableCell className="text-right text-destructive">
                          {item.totalOut > 0 ? `-${item.totalOut.toFixed(2)}` : '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium">{item.closingBalance.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.closingValue)}</TableCell>
                      </TableRow>
                    ))}
                    {/* Totals Row */}
                    <TableRow className="bg-muted font-bold">
                      <TableCell colSpan={2}>TOTAL</TableCell>
                      <TableCell className="text-right">{formatCurrency(totals.openingValue)}</TableCell>
                      <TableCell className="text-right text-primary">{formatCurrency(totals.totalInValue)}</TableCell>
                      <TableCell className="text-right text-destructive">{formatCurrency(totals.totalOutValue)}</TableCell>
                      <TableCell></TableCell>
                      <TableCell className="text-right">{formatCurrency(totals.closingValue)}</TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
