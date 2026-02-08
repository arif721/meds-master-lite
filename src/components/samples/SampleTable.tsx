import { Eye, Trash2, RotateCcw, CheckCircle, XCircle, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/DataTable';
import { formatCurrency, formatDateOnly, formatTimeWithSeconds } from '@/lib/format';
import { SampleWithLines } from '@/pages/Samples';
import { useSoftDeleteSample, useRestoreSample, useUpdateSampleStatus } from '@/hooks/useSamples';
import { openSampleCopy } from '@/lib/sampleInvoice';

type Props = {
  samples: SampleWithLines[];
  products: { id: string; name: string }[];
  stores: { id: string; name: string }[];
  customers: { id: string; name: string }[];
  sellers: { id: string; name: string; designation?: string | null; phone?: string | null }[];
  batches: { id: string; batch_number: string }[];
  showDeleted: boolean;
  onView: (s: SampleWithLines) => void;
  preparedBySignatureUrl?: string;
};

const statusColors: Record<string, string> = {
  DRAFT: 'bg-muted text-muted-foreground',
  CONFIRMED: 'bg-primary/10 text-primary',
  CANCELLED: 'bg-destructive/10 text-destructive',
};

export function SampleTable({ samples, products, stores, customers, sellers, batches, showDeleted, onView, preparedBySignatureUrl }: Props) {
  const softDelete = useSoftDeleteSample();
  const restore = useRestoreSample();
  const updateStatus = useUpdateSampleStatus();

  const getName = (type: 'store' | 'customer' | 'seller', id: string | null) => {
    if (!id) return '';
    if (type === 'store') return stores.find(s => s.id === id)?.name || '';
    if (type === 'customer') return customers.find(c => c.id === id)?.name || '';
    return sellers.find(s => s.id === id)?.name || '';
  };

  const getTo = (s: SampleWithLines) => getName('store', s.store_id) || getName('customer', s.customer_id) || s.receiver_name || 'N/A';
  const getCostValue = (s: SampleWithLines) => s.lines.reduce((sum, l) => sum + l.cost_price * l.quantity, 0);

  const handlePrint = (s: SampleWithLines) => {
    const seller = s.seller_id ? sellers.find(se => se.id === s.seller_id) : null;
    const store = s.store_id ? stores.find(st => st.id === s.store_id) : null;
    const customer = s.customer_id ? customers.find(c => c.id === s.customer_id) : null;

    openSampleCopy({
      sampleNumber: s.sample_number,
      saleDateTime: s.sale_date_time,
      status: s.status,
      storeName: store?.name,
      customerName: customer?.name,
      receiverName: s.receiver_name || undefined,
      receiverPhone: s.receiver_phone || undefined,
      sellerName: seller?.name,
      sellerDesignation: seller?.designation || undefined,
      sellerPhone: seller?.phone || undefined,
      notes: s.notes || undefined,
      lines: s.lines.map(l => ({
        productName: products.find(p => p.id === l.product_id)?.name || 'Unknown',
        batchNumber: batches.find(b => b.id === l.batch_id)?.batch_number || '—',
        quantity: l.quantity,
        tpRate: l.tp_rate,
        costPrice: l.cost_price,
        tpTotal: l.total,
      })),
      preparedBySignatureUrl,
    });
  };

  return (
    <DataTable
      columns={[
        { key: 'sample_number', header: 'Sample #', render: s => <span className="font-medium">{s.sample_number}</span> },
        {
          key: 'date', header: 'Date',
          render: s => (
            <div className="flex flex-col">
              <span className="font-medium">{formatDateOnly(s.sale_date_time)}</span>
              <span className="text-xs text-muted-foreground">{formatTimeWithSeconds(s.sale_date_time)}</span>
            </div>
          ),
        },
        { key: 'to', header: 'To', render: s => <span className="truncate max-w-[120px] block">{getTo(s)}</span> },
        { key: 'seller', header: 'Seller', render: s => getName('seller', s.seller_id) || '—' },
        { key: 'items', header: 'Items', render: s => <Badge variant="secondary">{s.lines.length}</Badge> },
        { key: 'tp', header: 'TP Value', render: s => <span className="font-medium">{formatCurrency(s.total_value)}</span> },
        { key: 'cost', header: 'Cost Value', render: s => <span className="text-muted-foreground">{formatCurrency(getCostValue(s))}</span> },
        { key: 'notes', header: 'Notes', render: s => <span className="text-xs text-muted-foreground truncate max-w-[100px] block">{s.notes || '—'}</span> },
        {
          key: 'status', header: 'Status',
          render: s => <Badge className={statusColors[s.status] || ''}>{s.status}</Badge>,
        },
        {
          key: 'actions', header: 'Actions',
          render: s => (
            <div className="flex gap-1" onClick={e => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onView(s)} title="View">
                <Eye className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handlePrint(s)} title="Print">
                <Printer className="w-3.5 h-3.5" />
              </Button>
              {!showDeleted && s.status === 'DRAFT' && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateStatus.mutate({ sampleId: s.id, newStatus: 'CONFIRMED', oldStatus: s.status })} title="Confirm">
                  <CheckCircle className="w-3.5 h-3.5 text-primary" />
                </Button>
              )}
              {!showDeleted && s.status === 'CONFIRMED' && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateStatus.mutate({ sampleId: s.id, newStatus: 'CANCELLED', oldStatus: s.status })} title="Cancel">
                  <XCircle className="w-3.5 h-3.5 text-destructive" />
                </Button>
              )}
              {!showDeleted && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => softDelete.mutate({ sampleId: s.id })} title="Delete">
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </Button>
              )}
              {showDeleted && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => restore.mutate({ sampleId: s.id })} title="Restore">
                  <RotateCcw className="w-3.5 h-3.5 text-primary" />
                </Button>
              )}
            </div>
          ),
        },
      ]}
      data={samples}
      keyExtractor={s => s.id}
      emptyMessage="No samples found"
      onRowClick={onView}
    />
  );
}
