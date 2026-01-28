import { useState } from 'react';
import { Download, ChevronDown, ChevronRight } from 'lucide-react';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { formatCurrency } from '@/lib/format';
import { useValuationReport } from '@/hooks/useRawMaterialsReports';

export function ValuationReport() {
  const { items, grandTotal } = useValuationReport();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpand = (materialId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(materialId)) {
      newExpanded.delete(materialId);
    } else {
      newExpanded.add(materialId);
    }
    setExpandedItems(newExpanded);
  };

  const exportCSV = () => {
    const rows: string[] = ['Material,Type,Unit,Total Balance,Weighted Avg Cost,Total Value'];
    
    items.forEach(item => {
      rows.push([
        `"${item.material.name}"`,
        item.material.type,
        item.material.unit,
        item.totalBalance.toFixed(2),
        item.weightedAvgCost.toFixed(2),
        item.totalValue.toFixed(2),
      ].join(','));
    });

    rows.push(['GRAND TOTAL', '', '', '', '', grandTotal.toFixed(2)].join(','));
    
    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-valuation-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Group by type for summary
  const byType = items.reduce((acc, item) => {
    const type = item.material.type;
    if (!acc[type]) acc[type] = { count: 0, value: 0 };
    acc[type].count += 1;
    acc[type].value += item.totalValue;
    return acc;
  }, {} as Record<string, { count: number; value: number }>);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle className="text-lg">Stock Valuation Report (Weighted Average)</CardTitle>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary by Type */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {Object.entries(byType).map(([type, data]) => {
            const typedData = data as { count: number; value: number };
            return (
              <div key={type} className="p-4 bg-muted rounded-lg text-center">
                <Badge variant="outline">{type}</Badge>
                <p className="text-sm text-muted-foreground mt-2">{typedData.count} items</p>
                <p className="text-lg font-bold">{formatCurrency(typedData.value)}</p>
              </div>
            );
          })}
          <div className="p-4 bg-primary/10 rounded-lg text-center">
            <Badge className="bg-primary">TOTAL</Badge>
            <p className="text-sm text-muted-foreground mt-2">{items.length} items</p>
            <p className="text-xl font-bold text-primary">{formatCurrency(grandTotal)}</p>
          </div>
        </div>

        {/* Detail Table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead>Material</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">On Hand</TableHead>
              <TableHead className="text-right">Wtd Avg Cost</TableHead>
              <TableHead className="text-right">Total Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No stock with value
                </TableCell>
              </TableRow>
            ) : (
              items.map(item => (
                <Collapsible key={item.material.id} asChild>
                  <>
                    <TableRow>
                      <TableCell>
                        {item.lots.length > 1 && (
                          <CollapsibleTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="p-1 h-6 w-6"
                              onClick={() => toggleExpand(item.material.id)}
                            >
                              {expandedItems.has(item.material.id) ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </Button>
                          </CollapsibleTrigger>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{item.material.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.material.type}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {item.totalBalance.toFixed(2)} {item.material.unit}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(item.weightedAvgCost)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(item.totalValue)}</TableCell>
                    </TableRow>

                    {expandedItems.has(item.material.id) && item.lots.length > 1 && (
                      <TableRow className="bg-muted/30">
                        <TableCell colSpan={6} className="p-0">
                          <CollapsibleContent>
                            <div className="p-4 ml-8">
                              <p className="text-sm font-medium mb-2">Lot-wise Breakdown:</p>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Lot No</TableHead>
                                    <TableHead>Location</TableHead>
                                    <TableHead className="text-right">Balance</TableHead>
                                    <TableHead className="text-right">Unit Cost</TableHead>
                                    <TableHead className="text-right">Value</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {item.lots.map(lotItem => (
                                    <TableRow key={lotItem.lot.id}>
                                      <TableCell>{lotItem.lot.lot_number}</TableCell>
                                      <TableCell>{lotItem.lot.location || '-'}</TableCell>
                                      <TableCell className="text-right">{lotItem.balance.toFixed(2)}</TableCell>
                                      <TableCell className="text-right">{formatCurrency(lotItem.unitCost)}</TableCell>
                                      <TableCell className="text-right">{formatCurrency(lotItem.value)}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </CollapsibleContent>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                </Collapsible>
              ))
            )}
            {/* Grand Total Row */}
            <TableRow className="bg-primary/5 font-bold">
              <TableCell colSpan={5} className="text-right">GRAND TOTAL</TableCell>
              <TableCell className="text-right text-primary text-lg">{formatCurrency(grandTotal)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
