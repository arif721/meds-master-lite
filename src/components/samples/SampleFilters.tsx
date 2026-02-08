import { useState } from 'react';
import { Search, CalendarIcon, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { DateRange } from '@/components/SalesDateFilter';

type Props = {
  search: string;
  onSearchChange: (v: string) => void;
  dateRange: DateRange;
  onDateRangeChange: (r: DateRange) => void;
  storeFilter: string;
  onStoreFilterChange: (v: string) => void;
  customerFilter: string;
  onCustomerFilterChange: (v: string) => void;
  sellerFilter: string;
  onSellerFilterChange: (v: string) => void;
  statusFilter: string;
  onStatusFilterChange: (v: string) => void;
  showDeleted: boolean;
  onShowDeletedChange: (v: boolean) => void;
  stores: { id: string; name: string; active: boolean }[];
  customers: { id: string; name: string }[];
  sellers: { id: string; name: string; active: boolean }[];
};

export function SampleFilters(props: Props) {
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);

  const hasFilters = props.dateRange.from || props.dateRange.to || props.storeFilter || props.customerFilter || props.sellerFilter || props.statusFilter;

  const clearAll = () => {
    props.onDateRangeChange({ from: undefined, to: undefined });
    props.onStoreFilterChange('');
    props.onCustomerFilterChange('');
    props.onSellerFilterChange('');
    props.onStatusFilterChange('');
    props.onSearchChange('');
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative min-w-[200px] flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Sample #, receiver name/phone..." value={props.search} onChange={e => props.onSearchChange(e.target.value)} className="pl-10" />
        </div>

        {/* Date From */}
        <Popover open={fromOpen} onOpenChange={setFromOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("w-[140px] justify-start text-left font-normal", !props.dateRange.from && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {props.dateRange.from ? format(props.dateRange.from, "dd MMM yy") : "From"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={props.dateRange.from} onSelect={d => { props.onDateRangeChange({ ...props.dateRange, from: d }); setFromOpen(false); }} className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>

        {/* Date To */}
        <Popover open={toOpen} onOpenChange={setToOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("w-[140px] justify-start text-left font-normal", !props.dateRange.to && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {props.dateRange.to ? format(props.dateRange.to, "dd MMM yy") : "To"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={props.dateRange.to} onSelect={d => { props.onDateRangeChange({ ...props.dateRange, to: d }); setToOpen(false); }} disabled={d => props.dateRange.from ? d < props.dateRange.from : false} className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>

        {/* Status Filter */}
        <Select value={props.statusFilter || 'all'} onValueChange={v => props.onStatusFilterChange(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-[130px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="CONFIRMED">Confirmed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        {/* Store Filter */}
        <Select value={props.storeFilter || 'all'} onValueChange={v => props.onStoreFilterChange(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Store" /></SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="all">All Stores</SelectItem>
            {props.stores.filter(s => s.active).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Customer Filter */}
        <Select value={props.customerFilter || 'all'} onValueChange={v => props.onCustomerFilterChange(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Customer" /></SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="all">All Customers</SelectItem>
            {props.customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Seller Filter */}
        <Select value={props.sellerFilter || 'all'} onValueChange={v => props.onSellerFilterChange(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Seller" /></SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="all">All Sellers</SelectItem>
            {props.sellers.filter(s => s.active).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>

        {hasFilters && <Button variant="ghost" size="sm" onClick={clearAll}>Clear</Button>}
      </div>

      {/* Trash toggle */}
      <div className="flex items-center gap-2">
        <Switch checked={props.showDeleted} onCheckedChange={props.onShowDeletedChange} id="show-deleted" />
        <Label htmlFor="show-deleted" className="text-sm text-muted-foreground flex items-center gap-1">
          <Trash2 className="w-3.5 h-3.5" /> Show Deleted
        </Label>
      </div>
    </div>
  );
}
