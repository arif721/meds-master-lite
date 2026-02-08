import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatCurrency, formatDateOnly, formatTimeWithSeconds } from '@/lib/format';
import { SampleWithLines } from '@/pages/Samples';
import { useUpdateSampleStatus, useSoftDeleteSample } from '@/hooks/useSamples';
import { CheckCircle, XCircle, Trash2 } from 'lucide-react';

type Props = {
  sample: SampleWithLines | null;
  onClose: () => void;
  products: { id: string; name: string }[];
  stores: { id: string; name: string }[];
  customers: { id: string; name: string }[];
  sellers: { id: string; name: string }[];
  batches: { id: string; batch_number: string }[];
};

const statusColors: Record<string, string> = {
  DRAFT: 'bg-muted text-muted-foreground',
  CONFIRMED: 'bg-primary/10 text-primary',
  CANCELLED: 'bg-destructive/10 text-destructive',
};

export function SampleDetailDialog({ sample, onClose, products, stores, customers, sellers, batches }: Props) {
  const updateStatus = useUpdateSampleStatus();
  const softDelete = useSoftDeleteSample();

  if (!sample) return null;

  const getProductName = (id: string) => products.find(p => p.id === id)?.name || 'Unknown';
  const getBatchNumber = (id: string | null) => id ? batches.find(b => b.id === id)?.batch_number || '—' : '—';
  const getStoreName = (id: string | null) => id ? stores.find(s => s.id === id)?.name : null;
  const getCustomerName = (id: string | null) => id ? customers.find(c => c.id === id)?.name : null;
  const getSellerName = (id: string | null) => id ? sellers.find(s => s.id === id)?.name : null;

  const totalCost = sample.lines.reduce((s, l) => s + l.cost_price * l.quantity, 0);
  const totalQty = sample.lines.reduce((s, l) => s + l.quantity, 0);

  return (
    <Dialog open={!!sample} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {sample.sample_number}
            <Badge className={statusColors[sample.status]}>{sample.status}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Date:</span> {formatDateOnly(sample.sale_date_time)}</div>
            <div><span className="text-muted-foreground">Time:</span> {formatTimeWithSeconds(sample.sale_date_time)}</div>
            {getStoreName(sample.store_id) && <div><span className="text-muted-foreground">Store:</span> {getStoreName(sample.store_id)}</div>}
            {getCustomerName(sample.customer_id) && <div><span className="text-muted-foreground">Customer:</span> {getCustomerName(sample.customer_id)}</div>}
            {getSellerName(sample.seller_id) && <div><span className="text-muted-foreground">Seller:</span> {getSellerName(sample.seller_id)}</div>}
            {sample.receiver_name && <div><span className="text-muted-foreground">Receiver:</span> {sample.receiver_name}</div>}
            {sample.receiver_phone && <div><span className="text-muted-foreground">Phone:</span> {sample.receiver_phone}</div>}
            {sample.notes && <div className="col-span-2"><span className="text-muted-foreground">Notes:</span> {sample.notes}</div>}
          </div>

          {/* Lines */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="px-3 py-2 text-left">Product</th>
                  <th className="px-3 py-2 text-left">Batch</th>
                  <th className="px-3 py-2 text-right">Qty</th>
                  <th className="px-3 py-2 text-right">TP Rate</th>
                  <th className="px-3 py-2 text-right">Cost</th>
                  <th className="px-3 py-2 text-right">TP Total</th>
                </tr>
              </thead>
              <tbody>
                {sample.lines.map(l => (
                  <tr key={l.id} className="border-b last:border-0">
                    <td className="px-3 py-2">{getProductName(l.product_id)}</td>
                    <td className="px-3 py-2 text-muted-foreground">{getBatchNumber(l.batch_id)}</td>
                    <td className="px-3 py-2 text-right">{l.quantity}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(l.tp_rate)}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{formatCurrency(l.cost_price)}</td>
                    <td className="px-3 py-2 text-right font-medium">{formatCurrency(l.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted/30 font-medium">
                  <td className="px-3 py-2" colSpan={2}>Total</td>
                  <td className="px-3 py-2 text-right">{totalQty}</td>
                  <td className="px-3 py-2" />
                  <td className="px-3 py-2 text-right text-muted-foreground">{formatCurrency(totalCost)}</td>
                  <td className="px-3 py-2 text-right text-primary">{formatCurrency(sample.total_value)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Actions */}
          {!sample.is_deleted && (
            <div className="flex gap-2 justify-end">
              {sample.status === 'DRAFT' && (
                <Button size="sm" onClick={() => { updateStatus.mutate({ sampleId: sample.id, newStatus: 'CONFIRMED', oldStatus: sample.status }); onClose(); }}>
                  <CheckCircle className="w-4 h-4 mr-1" /> Confirm
                </Button>
              )}
              {sample.status === 'CONFIRMED' && (
                <Button size="sm" variant="outline" onClick={() => { updateStatus.mutate({ sampleId: sample.id, newStatus: 'CANCELLED', oldStatus: sample.status }); onClose(); }}>
                  <XCircle className="w-4 h-4 mr-1" /> Cancel
                </Button>
              )}
              <Button size="sm" variant="destructive" onClick={() => { softDelete.mutate({ sampleId: sample.id }); onClose(); }}>
                <Trash2 className="w-4 h-4 mr-1" /> Delete
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
