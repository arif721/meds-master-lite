import { useState } from 'react';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { formatCurrency, isExpired } from '@/lib/format';
import { useAddSample, generateSampleNumber, SampleStatus } from '@/hooks/useSamples';

type LineForm = { productId: string; batchId: string; quantity: string };

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  products: { id: string; name: string; tp_rate: number; cost_price: number; active: boolean }[];
  batches: { id: string; product_id: string; batch_number: string; quantity: number; expiry_date: string | null }[];
  stores: { id: string; name: string; active: boolean }[];
  customers: { id: string; name: string }[];
  sellers: { id: string; name: string; active: boolean }[];
};

const nowBD = () => {
  const n = new Date(new Date().getTime() + 6 * 60 * 60 * 1000);
  return n.toISOString().slice(0, 16);
};

export function SampleCreateDialog({ open, onOpenChange, products, batches, stores, customers, sellers }: Props) {
  const addMutation = useAddSample();
  const activeProducts = products.filter(p => p.active);
  const activeSellers = sellers.filter(s => s.active);

  const [form, setForm] = useState({
    saleDateTime: '',
    storeId: '',
    customerId: '',
    sellerId: '',
    receiverName: '',
    receiverPhone: '',
    notes: '',
    status: 'CONFIRMED' as SampleStatus,
    affectsInventory: true,
    lines: [] as LineForm[],
  });

  const reset = () => setForm({ saleDateTime: '', storeId: '', customerId: '', sellerId: '', receiverName: '', receiverPhone: '', notes: '', status: 'CONFIRMED', affectsInventory: true, lines: [] });

  const getAvailableBatches = (productId: string) =>
    batches.filter(b => b.product_id === productId && b.quantity > 0 && (!b.expiry_date || !isExpired(new Date(b.expiry_date))))
      .sort((a, b) => {
        if (!a.expiry_date && !b.expiry_date) return 0;
        if (!a.expiry_date) return 1;
        if (!b.expiry_date) return -1;
        return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
      });

  const addLine = () => setForm(f => ({ ...f, lines: [...f.lines, { productId: '', batchId: '', quantity: '' }] }));
  const removeLine = (i: number) => setForm(f => ({ ...f, lines: f.lines.filter((_, idx) => idx !== i) }));
  const updateLine = (i: number, field: string, value: string) => {
    setForm(f => {
      const lines = [...f.lines];
      lines[i] = { ...lines[i], [field]: value };
      if (field === 'productId') lines[i].batchId = '';
      return { ...f, lines };
    });
  };

  const getProduct = (id: string) => products.find(p => p.id === id);

  const totalTP = form.lines.reduce((s, l) => {
    const qty = parseInt(l.quantity) || 0;
    return s + (getProduct(l.productId)?.tp_rate || 0) * qty;
  }, 0);

  const totalCost = form.lines.reduce((s, l) => {
    const qty = parseInt(l.quantity) || 0;
    return s + (getProduct(l.productId)?.cost_price || 0) * qty;
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.lines.length === 0) { toast({ title: 'Add at least one product', variant: 'destructive' }); return; }

    for (const line of form.lines) {
      if (!line.productId || !line.batchId) { toast({ title: 'Select product and batch for all lines', variant: 'destructive' }); return; }
      const qty = parseInt(line.quantity) || 0;
      if (qty < 1) { toast({ title: 'Quantity must be at least 1', variant: 'destructive' }); return; }
      const batch = batches.find(b => b.id === line.batchId);
      if (batch && qty > batch.quantity) { toast({ title: `Insufficient stock. Available: ${batch.quantity}`, variant: 'destructive' }); return; }
    }

    const sampleLines = form.lines.map(line => {
      const qty = parseInt(line.quantity) || 0;
      const product = getProduct(line.productId);
      return { product_id: line.productId, batch_id: line.batchId, quantity: qty, tp_rate: product?.tp_rate || 0, cost_price: product?.cost_price || 0, total: (product?.tp_rate || 0) * qty };
    });

    const saleDateTime = form.saleDateTime ? new Date(form.saleDateTime).toISOString() : new Date().toISOString();

    try {
      await addMutation.mutateAsync({
        sample: {
          sample_number: generateSampleNumber(),
          sale_date_time: saleDateTime,
          store_id: form.storeId || null,
          customer_id: form.customerId || null,
          seller_id: form.sellerId || null,
          receiver_name: form.receiverName || null,
          receiver_phone: form.receiverPhone || null,
          total_value: totalTP,
          notes: form.notes || null,
          status: form.status,
        },
        lines: sampleLines,
        affectsInventory: form.affectsInventory,
      });
      reset();
      onOpenChange(false);
    } catch { /* handled by mutation */ }
  };

  return (
    <Dialog open={open} onOpenChange={v => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Create Sample Entry</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Date/Time + Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="input-group">
              <Label>Sample Date & Time</Label>
              <Input type="datetime-local" value={form.saleDateTime || nowBD()} onChange={e => setForm(f => ({ ...f, saleDateTime: e.target.value }))} />
            </div>
            <div className="input-group">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v: SampleStatus) => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="DRAFT">Draft (no stock change)</SelectItem>
                  <SelectItem value="CONFIRMED">Confirmed (deduct stock)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Store / Customer */}
          <div className="grid grid-cols-2 gap-4">
            <div className="input-group">
              <Label>Store (Optional)</Label>
              <Select value={form.storeId || 'none'} onValueChange={v => setForm(f => ({ ...f, storeId: v === 'none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Select store" /></SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="none">None</SelectItem>
                  {stores.filter(s => s.active).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="input-group">
              <Label>Customer (Optional)</Label>
              <Select value={form.customerId || 'none'} onValueChange={v => setForm(f => ({ ...f, customerId: v === 'none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="none">None</SelectItem>
                  {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Seller + Receiver */}
          <div className="grid grid-cols-3 gap-4">
            <div className="input-group">
              <Label>Seller/Rep (Optional)</Label>
              <Select value={form.sellerId || 'none'} onValueChange={v => setForm(f => ({ ...f, sellerId: v === 'none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Select seller" /></SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="none">None</SelectItem>
                  {activeSellers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="input-group">
              <Label>Receiver Name</Label>
              <Input value={form.receiverName} onChange={e => setForm(f => ({ ...f, receiverName: e.target.value }))} placeholder="Name" />
            </div>
            <div className="input-group">
              <Label>Receiver Phone</Label>
              <Input value={form.receiverPhone} onChange={e => setForm(f => ({ ...f, receiverPhone: e.target.value }))} placeholder="Phone" />
            </div>
          </div>

          {/* Notes */}
          <div className="input-group">
            <Label>Notes / Reference</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any notes..." rows={2} />
          </div>

          {/* Product Lines */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Products</Label>
              <Button type="button" variant="outline" size="sm" onClick={addLine}><Plus className="w-4 h-4 mr-1" />Add Product</Button>
            </div>

            {form.lines.map((line, i) => {
              const product = getProduct(line.productId);
              const qty = parseInt(line.quantity) || 0;
              return (
                <div key={i} className="p-3 rounded-lg bg-muted/50 space-y-2">
                  <div className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-4">
                      <Label className="text-xs mb-1 block">Product</Label>
                      <Select value={line.productId} onValueChange={v => updateLine(i, 'productId', v)}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Product" /></SelectTrigger>
                        <SelectContent className="bg-popover">{activeProducts.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-3">
                      <Label className="text-xs mb-1 block">Batch</Label>
                      <Select value={line.batchId} onValueChange={v => updateLine(i, 'batchId', v)} disabled={!line.productId}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Batch" /></SelectTrigger>
                        <SelectContent className="bg-popover">{getAvailableBatches(line.productId).map(b => <SelectItem key={b.id} value={b.id}>{b.batch_number} ({b.quantity})</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs mb-1 block">Qty</Label>
                      <Input type="number" min="1" value={line.quantity} onChange={e => updateLine(i, 'quantity', e.target.value)} className="h-9" />
                    </div>
                    <div className="col-span-2 text-right">
                      {product && qty > 0 && (
                        <div className="text-xs space-y-0.5">
                          <div>TP: {formatCurrency(product.tp_rate * qty)}</div>
                          <div className="text-muted-foreground">Cost: {formatCurrency(product.cost_price * qty)}</div>
                        </div>
                      )}
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeLine(i)} className="h-9 w-9">
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  {product && (
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>TP Rate: {formatCurrency(product.tp_rate)}</span>
                      <span>Cost Price: {formatCurrency(product.cost_price)}</span>
                    </div>
                  )}
                </div>
              );
            })}

            {form.lines.length === 0 && (
              <p className="text-center py-4 text-muted-foreground">Click "Add Product" to add sample items</p>
            )}
          </div>

          {/* Summary */}
          {form.lines.length > 0 && (
            <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
              <div>
                <div className="flex items-center gap-3">
                  <Switch checked={form.affectsInventory} onCheckedChange={v => setForm(f => ({ ...f, affectsInventory: v }))} id="affects-inv" />
                  <Label htmlFor="affects-inv" className="text-sm">Affects Inventory</Label>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {form.status === 'DRAFT' ? 'Draft samples don\'t affect stock regardless' : form.affectsInventory ? 'Stock will be deducted on confirm' : 'Stock will NOT be deducted'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Qty: {form.lines.reduce((s, l) => s + (parseInt(l.quantity) || 0), 0)}</p>
                <p className="text-xl font-bold text-primary">TP: {formatCurrency(totalTP)}</p>
                <p className="text-sm text-muted-foreground">Cost: {formatCurrency(totalCost)}</p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => { onOpenChange(false); reset(); }}>Cancel</Button>
            <Button type="submit" disabled={addMutation.isPending}>
              {addMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {form.status === 'DRAFT' ? 'Save as Draft' : 'Create & Confirm'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
