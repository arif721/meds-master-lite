import { useState } from 'react';
import { Download, ChevronDown, ChevronRight, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { useCurrentStockReport, CurrentStockItem } from '@/hooks/useRawMaterialsReports';

export function CurrentStockReport() {
  const stockData = useCurrentStockReport();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const filteredData = stockData.filter(item =>
    item.material.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleExpand = (materialId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(materialId)) {
      newExpanded.delete(materialId);
    } else {
      newExpanded.add(materialId);
    }
    setExpandedItems(newExpanded);
  };

  const totalValue = filteredData.reduce((sum, item) => sum + item.totalValue, 0);

  const exportCSV = () => {
    const rows: string[] = ['Material,Unit,Total Balance,Avg Cost,Total Value,Low Stock'];
    
    filteredData.forEach(item => {
      rows.push([
        `"${item.material.name}"`,
        item.material.unit,
        item.totalBalance.toFixed(2),
        item.avgCost.toFixed(2),
        item.totalValue.toFixed(2),
        item.isLowStock ? 'Yes' : 'No',
      ].join(','));
    });
    
    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `current-stock-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle className="text-lg">Current Stock Report</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search materials..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-muted rounded-lg">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Total Materials</p>
            <p className="text-2xl font-bold">{filteredData.length}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Low Stock Items</p>
            <p className="text-2xl font-bold text-warning">
              {filteredData.filter(i => i.isLowStock).length}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Total Value</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(totalValue)}</p>
          </div>
        </div>

        {/* Table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead>Material</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">On Hand</TableHead>
              <TableHead className="text-right">Avg Cost</TableHead>
              <TableHead className="text-right">Total Value</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No materials found
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map(item => (
                <Collapsible key={item.material.id} asChild>
                  <>
                    <TableRow className={item.isLowStock ? 'bg-warning/5' : ''}>
                      <TableCell>
                        {item.lots.length > 0 && (
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
                      <TableCell className="text-right">{formatCurrency(item.avgCost)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.totalValue)}
                      </TableCell>
                      <TableCell>
                        {item.isLowStock ? (
                          <Badge variant="outline" className="border-warning text-warning">Low Stock</Badge>
                        ) : (
                          <Badge variant="secondary">OK</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                    {expandedItems.has(item.material.id) && item.lots.length > 0 && (
                      <TableRow className="bg-muted/30">
                        <TableCell colSpan={7} className="p-0">
                          <CollapsibleContent>
                            <div className="p-4 ml-8">
                              <p className="text-sm font-medium mb-2">Lot-wise Breakdown:</p>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Lot No</TableHead>
                                    <TableHead>Received</TableHead>
                                    <TableHead>Expiry</TableHead>
                                    <TableHead className="text-right">Balance</TableHead>
                                    <TableHead className="text-right">Unit Cost</TableHead>
                                    <TableHead className="text-right">Value</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {item.lots.map(lot => (
                                    <TableRow key={lot.id}>
                                      <TableCell>{lot.lot_number}</TableCell>
                                      <TableCell>{lot.received_date}</TableCell>
                                      <TableCell>{lot.expiry_date || '-'}</TableCell>
                                      <TableCell className="text-right">{lot.current_balance.toFixed(2)}</TableCell>
                                      <TableCell className="text-right">{formatCurrency(lot.unit_cost)}</TableCell>
                                      <TableCell className="text-right">
                                        {formatCurrency(lot.current_balance * lot.unit_cost)}
                                      </TableCell>
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
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
