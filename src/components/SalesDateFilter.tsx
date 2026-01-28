import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Download, TrendingUp, Wallet, AlertCircle, DollarSign, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';

export type DateRange = {
  from: Date | undefined;
  to: Date | undefined;
};

type SalesDateFilterProps = {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  totals: {
    totalSales: number;
    totalPaid: number;
    totalDue: number;
    totalCOGS: number;
    netProfit: number;
    invoiceCount: number;
  };
  onExportCSV: () => void;
  onExportPDF: () => void;
};

export function SalesDateFilter({
  dateRange,
  onDateRangeChange,
  totals,
  onExportCSV,
  onExportPDF,
}: SalesDateFilterProps) {
  const [isFromOpen, setIsFromOpen] = useState(false);
  const [isToOpen, setIsToOpen] = useState(false);

  const clearFilter = () => {
    onDateRangeChange({ from: undefined, to: undefined });
  };

  const hasFilter = dateRange.from || dateRange.to;

  return (
    <div className="space-y-4">
      {/* Date Range Picker */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">From:</span>
          <Popover open={isFromOpen} onOpenChange={setIsFromOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[160px] justify-start text-left font-normal",
                  !dateRange.from && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange.from ? format(dateRange.from, "dd MMM yyyy") : "Start date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateRange.from}
                onSelect={(date) => {
                  onDateRangeChange({ ...dateRange, from: date });
                  setIsFromOpen(false);
                }}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">To:</span>
          <Popover open={isToOpen} onOpenChange={setIsToOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[160px] justify-start text-left font-normal",
                  !dateRange.to && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange.to ? format(dateRange.to, "dd MMM yyyy") : "End date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateRange.to}
                onSelect={(date) => {
                  onDateRangeChange({ ...dateRange, to: date });
                  setIsToOpen(false);
                }}
                disabled={(date) => dateRange.from ? date < dateRange.from : false}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        {hasFilter && (
          <Button variant="ghost" size="sm" onClick={clearFilter}>
            Clear
          </Button>
        )}

        <div className="flex-1" />

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onExportCSV}>
            <Download className="w-4 h-4 mr-2" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={onExportPDF}>
            <Download className="w-4 h-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      {/* Totals Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3 rounded-lg bg-card border">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-medium">Total Sales</span>
          </div>
          <p className="text-lg font-bold">{formatCurrency(totals.totalSales)}</p>
        </div>

        <div className="p-3 rounded-lg bg-card border">
          <div className="flex items-center gap-2 text-success mb-1">
            <Wallet className="w-4 h-4" />
            <span className="text-xs font-medium">Paid</span>
          </div>
          <p className="text-lg font-bold text-success">{formatCurrency(totals.totalPaid)}</p>
        </div>

        <div className="p-3 rounded-lg bg-card border">
          <div className="flex items-center gap-2 text-warning mb-1">
            <AlertCircle className="w-4 h-4" />
            <span className="text-xs font-medium">Due</span>
          </div>
          <p className="text-lg font-bold text-warning">{formatCurrency(totals.totalDue)}</p>
        </div>

        <div className="p-3 rounded-lg bg-card border">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Package className="w-4 h-4" />
            <span className="text-xs font-medium">COGS</span>
          </div>
          <p className="text-lg font-bold">{formatCurrency(totals.totalCOGS)}</p>
        </div>

        <div className="p-3 rounded-lg bg-card border">
          <div className="flex items-center gap-2 mb-1" style={{ color: totals.netProfit >= 0 ? 'hsl(var(--success))' : 'hsl(var(--destructive))' }}>
            <DollarSign className="w-4 h-4" />
            <span className="text-xs font-medium">Net Profit</span>
          </div>
          <p className={cn("text-lg font-bold", totals.netProfit >= 0 ? "text-success" : "text-destructive")}>
            {formatCurrency(totals.netProfit)}
          </p>
        </div>

        <div className="p-3 rounded-lg bg-card border">
          <div className="flex items-center gap-2 text-primary mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-medium">Invoices</span>
          </div>
          <p className="text-lg font-bold text-primary">{totals.invoiceCount}</p>
        </div>
      </div>
    </div>
  );
}
