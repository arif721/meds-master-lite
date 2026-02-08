import { useState, useMemo } from 'react';
import { Plus, Search, Package, Loader2, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DataTable } from '@/components/DataTable';
import { Badge } from '@/components/ui/badge';
import { useProducts, useBatches, useCustomers, useSellers } from '@/hooks/useDatabase';
import { useStores } from '@/hooks/useStores';
import { useSamples, useSampleLines, useAddSample, generateSampleNumber, DbSample, DbSampleLine } from '@/hooks/useSamples';
import { formatCurrency, formatDateOnly, formatTimeWithSeconds, isExpired } from '@/lib/format';
import { SalesDateFilter, DateRange } from '@/components/SalesDateFilter';
import { startOfDay, endOfDay, isWithinInterval, parseISO } from 'date-fns';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';

type SampleWithLines = DbSample & { lines: DbSampleLine[] };

export default function Samples() {
  const { data: dbProducts = [], isLoading: productsLoading } = useProducts();
  const { data: dbBatches = [], isLoading: batchesLoading } = useBatches();
  const { data: customers = [] } = useCustomers();
  const { data: stores = [] } = useStores();
  const { data: dbSellers = [] } = useSellers();
  const { data: dbSamples = [], isLoading: samplesLoading } = useSamples();
  const { data: dbSampleLines = [] } = useSampleLines();
  const addSampleMutation = useAddSample();

  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });

  const activeProducts = dbProducts.filter(p => p.active);
  const activeSellers = dbSellers.filter(s => s.active);

  const [formData, setFormData] = useState({
    saleDateTime: '',
    storeId: '',
    customerId: '',
    sellerId: '',
    receiverName: '',
    receiverPhone: '',
    notes: '',
    lines: [] as { productId: string; batchId: string; quantity: string }[],
  });

  const samplesWithLines = useMemo(() => {
    return dbSamples.map(s => ({
      ...s,
      lines: dbSampleLines.filter(l => l.sample_id === s.id),
    }));
  }, [dbSamples, dbSampleLines]);

  const filteredSamples = useMemo(() => {
    return samplesWithLines.filter(s => {
      if (s.is_deleted) return false;
      const matchesSearch = s.sample_number.toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return false;
      if (dateRange.from || dateRange.to) {
        const d = parseISO(s.sale_date_time);
        const start = dateRange.from ? startOfDay(dateRange.from) : new Date(0);
        const end = dateRange.to ? endOfDay(dateRange.to) : endOfDay(new Date());
        if (!isWithinInterval(d, { start, end })) return false;
      }
      return true;
    });
  }, [samplesWithLines, search, dateRange]);

  const totalSampleValue = useMemo(() => filteredSamples.reduce((sum, s) => sum + s.total_value, 0), [filteredSamples]);

  const getAvailableBatches = (productId: string) => {
    return dbBatches.filter(
      b => b.product_id === productId && b.quantity > 0 && (!b.expiry_date || !isExpired(new Date(b.expiry_date)))
    ).sort((a, b) => {
      if (!a.expiry_date && !b.expiry_date) return 0;
      if (!a.expiry_date) return 1;
      if (!b.expiry_date) return -1;
      return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
    });
  };

  const addLine = () => {
    setFormData({
      ...formData,
      lines: [...formData.lines, { productId: '', batchId: '', quantity: '' }],
    });
  };

  const removeLine = (index: number) => {
    setFormData({ ...formData, lines: formData.lines.filter((_, i) => i !== index) });
  };

  const updateLine = (index: number, field: string, value: string) => {
    const newLines = [...formData.lines];
    newLines[index] = { ...newLines[index], [field]: value };
    if (field === 'productId') newLines[index].batchId = '';
    setFormData({ ...formData, lines: newLines });
  };

  const resetForm = () => {
    setFormData({ saleDateTime: '', storeId: '', customerId: '', sellerId: '', receiverName: '', receiverPhone: '', notes: '', lines: [] });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.lines.length === 0) {
      toast({ title: 'No Products', description: 'Add at least one product', variant: 'destructive' });
      return;
    }

    for (const line of formData.lines) {
      if (!line.productId || !line.batchId) {
        toast({ title: 'Incomplete Line', description: 'Select product and batch for all lines', variant: 'destructive' });
        return;
      }
      const qty = parseInt(line.quantity) || 0;
      if (qty < 1) {
        toast({ title: 'Invalid Quantity', description: 'Quantity must be at least 1', variant: 'destructive' });
        return;
      }
      const batch = dbBatches.find(b => b.id === line.batchId);
      if (batch && qty > batch.quantity) {
        toast({ title: 'Insufficient Stock', description: `Not enough stock. Available: ${batch.quantity}`, variant: 'destructive' });
        return;
      }
    }

    const sampleLines = formData.lines.map(line => {
      const qty = parseInt(line.quantity) || 0;
      const product = dbProducts.find(p => p.id === line.productId);
      const tpRate = product?.tp_rate || 0;
      const costPrice = product?.cost_price || 0;
      return {
        product_id: line.productId,
        batch_id: line.batchId,
        quantity: qty,
        tp_rate: tpRate,
        cost_price: costPrice,
        total: tpRate * qty,
      };
    });

    const totalValue = sampleLines.reduce((sum, l) => sum + l.total, 0);
    const saleDateTime = formData.saleDateTime ? new Date(formData.saleDateTime).toISOString() : new Date().toISOString();

    try {
      await addSampleMutation.mutateAsync({
        sample: {
          sample_number: generateSampleNumber(),
          sale_date_time: saleDateTime,
          store_id: formData.storeId || null,
          customer_id: formData.customerId || null,
          seller_id: formData.sellerId || null,
          receiver_name: formData.receiverName || null,
          receiver_phone: formData.receiverPhone || null,
          total_value: totalValue,
          notes: formData.notes || null,
        },
        lines: sampleLines,
      });
      resetForm();
      setDialogOpen(false);
    } catch (error) {
      // handled by mutation
    }
  };

  const getCustomerName = (id: string | null) => id ? customers.find(c => c.id === id)?.name || 'N/A' : '';
  const getStoreName = (id: string | null) => id ? stores.find(s => s.id === id)?.name || 'N/A' : '';
  const getProductName = (id: string) => dbProducts.find(p => p.id === id)?.name || 'Unknown';

  const isLoading = productsLoading || batchesLoading || samplesLoading;
  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  // Get BD timezone now for default datetime
  const nowBD = new Date(new Date().getTime() + (6 * 60 * 60 * 1000));
  const defaultDateTime = nowBD.toISOString().slice(0, 16);

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Samples</h1>
          <p className="text-muted-foreground">Manage sample / free deliveries</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Create Sample</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Sample Entry</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Date/Time */}
              <div className="input-group">
                <Label>Sample Date & Time</Label>
                <Input
                  type="datetime-local"
                  value={formData.saleDateTime || defaultDateTime}
                  onChange={(e) => setFormData({ ...formData, saleDateTime: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="input-group">
                  <Label>Store (Optional)</Label>
                  <Select value={formData.storeId} onValueChange={(v) => setFormData({ ...formData, storeId: v === 'none' ? '' : v })}>
                    <SelectTrigger><SelectValue placeholder="Select store" /></SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="none">None</SelectItem>
                      {stores.filter(s => s.active).map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="input-group">
                  <Label>Customer (Optional)</Label>
                  <Select value={formData.customerId} onValueChange={(v) => setFormData({ ...formData, customerId: v === 'none' ? '' : v })}>
                    <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="none">None</SelectItem>
                      {customers.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="input-group">
                  <Label>Receiver Name (Optional)</Label>
                  <Input value={formData.receiverName} onChange={(e) => setFormData({ ...formData, receiverName: e.target.value })} placeholder="Receiver name" />
                </div>
                <div className="input-group">
                  <Label>Receiver Phone (Optional)</Label>
                  <Input value={formData.receiverPhone} onChange={(e) => setFormData({ ...formData, receiverPhone: e.target.value })} placeholder="Phone" />
                </div>
              </div>

              {/* Product Lines */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Products</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addLine}>
                    <Plus className="w-4 h-4 mr-1" />Add Product
                  </Button>
                </div>

                {formData.lines.map((line, index) => (
                  <div key={index} className="p-3 rounded-lg bg-muted/50 grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5">
                      <Label className="text-xs mb-1 block">Product</Label>
                      <Select value={line.productId} onValueChange={(v) => updateLine(index, 'productId', v)}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Product" /></SelectTrigger>
                        <SelectContent className="bg-popover">
                          {activeProducts.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-4">
                      <Label className="text-xs mb-1 block">Batch</Label>
                      <Select value={line.batchId} onValueChange={(v) => updateLine(index, 'batchId', v)} disabled={!line.productId}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Batch" /></SelectTrigger>
                        <SelectContent className="bg-popover">
                          {getAvailableBatches(line.productId).map(b => (
                            <SelectItem key={b.id} value={b.id}>{b.batch_number} ({b.quantity})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs mb-1 block">Qty</Label>
                      <Input type="number" min="1" value={line.quantity} onChange={(e) => updateLine(index, 'quantity', e.target.value)} className="h-9" />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeLine(index)} className="h-9 w-9">
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}

                {formData.lines.length === 0 && (
                  <p className="text-center py-4 text-muted-foreground">Click "Add Product" to add sample items</p>
                )}
              </div>

              {/* Total */}
              {formData.lines.length > 0 && (
                <div className="flex justify-end p-4 bg-muted/50 rounded-lg">
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Sample Value (TP Rate)</p>
                    <p className="text-2xl font-bold text-primary">
                      {formatCurrency(formData.lines.reduce((sum, line) => {
                        const qty = parseInt(line.quantity) || 0;
                        const product = dbProducts.find(p => p.id === line.productId);
                        return sum + (product?.tp_rate || 0) * qty;
                      }, 0))}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Cancel</Button>
                <Button type="submit" disabled={addSampleMutation.isPending}>
                  {addSampleMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create Sample
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg bg-card border">
          <p className="text-sm text-muted-foreground">Total Samples</p>
          <p className="text-2xl font-bold">{filteredSamples.length}</p>
        </div>
        <div className="p-4 rounded-lg bg-card border">
          <p className="text-sm text-muted-foreground">Total Sample Value (TP)</p>
          <p className="text-2xl font-bold text-primary">{formatCurrency(totalSampleValue)}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search by sample number..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      {/* Table */}
      <DataTable
        columns={[
          { key: 'sample_number', header: 'Sample #', render: (s) => <span className="font-medium">{s.sample_number}</span> },
          {
            key: 'date', header: 'Date',
            render: (s) => (
              <div className="flex flex-col">
                <span className="font-medium">{formatDateOnly(s.sale_date_time)}</span>
                <span className="text-xs text-muted-foreground">{formatTimeWithSeconds(s.sale_date_time)}</span>
              </div>
            ),
          },
          { key: 'to', header: 'To', render: (s) => getStoreName(s.store_id) || getCustomerName(s.customer_id) || s.receiver_name || 'N/A' },
          { key: 'items', header: 'Items', render: (s) => <Badge variant="secondary">{s.lines.length} items</Badge> },
          { key: 'value', header: 'Value (TP)', render: (s) => <span className="font-medium">{formatCurrency(s.total_value)}</span> },
        ]}
        data={filteredSamples}
        keyExtractor={(s) => s.id}
        emptyMessage="No samples found"
      />
    </div>
  );
}
