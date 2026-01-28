import { useNavigate } from 'react-router-dom';
import { Printer, FileText, Wallet, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { DataTable } from '@/components/DataTable';
import { useInvoiceLines, useProducts, useCustomers, useSellers, DbInvoice } from '@/hooks/useDatabase';
import { useStores } from '@/hooks/useStores';
import { useSignatures, DbSignature } from '@/hooks/useSignatures';
import { formatCurrency, formatDateOnly, formatTimeWithSeconds } from '@/lib/format';
import { openInvoiceWindow } from '@/lib/invoice';

interface InvoiceDetailDialogProps {
  invoice: DbInvoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InvoiceDetailDialog({ invoice, open, onOpenChange }: InvoiceDetailDialogProps) {
  const navigate = useNavigate();
  const { data: allInvoiceLines = [] } = useInvoiceLines();
  const { data: products = [] } = useProducts();
  const { data: customers = [] } = useCustomers();
  const { data: sellers = [] } = useSellers();
  const { data: stores = [] } = useStores();
  const { data: signatures = [] } = useSignatures();

  if (!invoice) return null;

  const invoiceLines = allInvoiceLines.filter(line => line.invoice_id === invoice.id);
  const customer = customers.find(c => c.id === invoice.customer_id);
  const seller = sellers.find(s => s.id === invoice.seller_id);
  const store = stores.find(s => s.id === invoice.store_id);

  // Find signatures for this seller
  const getDefaultSignature = (sellerId: string | null, signatureType: 'prepared_by' | 'representative'): string | undefined => {
    // First try seller-specific default
    if (sellerId) {
      const sellerDefault = signatures.find(
        (s: DbSignature) => s.seller_id === sellerId && s.signature_type === signatureType && s.is_default
      );
      if (sellerDefault) return sellerDefault.image_url;
    }
    // Fallback to global default
    const globalDefault = signatures.find(
      (s: DbSignature) => !s.seller_id && s.signature_type === signatureType && s.is_default
    );
    return globalDefault?.image_url;
  };

  const preparedBySignatureUrl = getDefaultSignature(invoice.seller_id, 'prepared_by');
  const representativeSignatureUrl = getDefaultSignature(invoice.seller_id, 'representative');

  const enrichedLines = invoiceLines.map(line => {
    const product = products.find(p => p.id === line.product_id);
    return {
      ...line,
      productName: product?.name || 'Unknown Product',
      mrp: product?.sales_price || 0,
    };
  });

  // Build the lines for invoice printing
  const invoicePrintLines = enrichedLines.map(line => ({
    id: line.id,
    productName: line.productName,
    quantity: line.quantity,
    freeQuantity: line.free_quantity,
    unitPrice: Number(line.unit_price),
    tpRate: Number(line.tp_rate),
    costPrice: Number(line.cost_price),
    discountType: line.discount_type as 'AMOUNT' | 'PERCENT',
    discountValue: Number(line.discount_value),
    lineTotal: Number(line.total),
  }));

  // Build the SalesInvoice object for the print function
  const salesInvoiceObj = {
    id: invoice.id,
    invoiceNumber: invoice.invoice_number,
    date: new Date(invoice.created_at),
    customerId: invoice.customer_id,
    sellerId: invoice.seller_id || undefined,
    storeId: invoice.store_id || undefined,
    totalAmount: Number(invoice.total),
    paidAmount: Number(invoice.paid),
    dueAmount: Number(invoice.due),
    status: invoice.status as 'DRAFT' | 'CONFIRMED' | 'PAID' | 'PARTIAL' | 'CANCELLED',
    lines: invoiceLines.map(line => ({
      id: line.id,
      invoiceId: line.invoice_id,
      productId: line.product_id,
      batchLotId: line.batch_id || '',
      quantity: line.quantity,
      freeQuantity: line.free_quantity,
      unitPrice: Number(line.unit_price),
      lineTotal: Number(line.total),
    })),
    createdAt: new Date(invoice.created_at),
  };

  const handlePrint = (copyType: 'CUSTOMER' | 'OFFICE') => {
    openInvoiceWindow({
      invoice: salesInvoiceObj,
      customerName: customer?.name || 'Unknown',
      customerAddress: customer?.address || undefined,
      customerPhone: customer?.phone || undefined,
      sellerName: seller?.name,
      sellerDesignation: seller?.designation || undefined,
      sellerPhone: seller?.phone || undefined,
      storeName: store?.name,
      getProductName: (productId: string) => {
        const product = products.find(p => p.id === productId);
        return product?.name || 'Unknown Product';
      },
      lines: invoicePrintLines,
      showTPRate: true,
      showCostProfit: copyType === 'OFFICE',
      copyType,
      preparedBySignatureUrl,
      representativeSignatureUrl,
    });
  };

  const handleReceivePayment = () => {
    onOpenChange(false);
    navigate(`/payments?invoice=${invoice.invoice_number}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': return 'default';
      case 'PARTIAL': return 'secondary';
      case 'CONFIRMED': return 'outline';
      case 'DRAFT': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Invoice #{invoice.invoice_number}
            </span>
            <Badge variant={getStatusColor(invoice.status)}>{invoice.status}</Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Invoice Header Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground">Date</p>
            <p className="font-medium">{formatDateOnly(invoice.created_at)}</p>
            <p className="text-xs text-muted-foreground">{formatTimeWithSeconds(invoice.created_at)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Customer</p>
            <p className="font-medium">{customer?.name || 'Unknown'}</p>
          </div>
          {store && (
            <div>
              <p className="text-sm text-muted-foreground">Store</p>
              <p className="font-medium">{store.name}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <Badge variant={getStatusColor(invoice.status)} className="mt-1">{invoice.status}</Badge>
          </div>
        </div>

        {/* Line Items */}
        <div className="space-y-2">
          <h4 className="font-semibold flex items-center gap-2">
            <Package className="w-4 h-4" />
            Line Items ({enrichedLines.length})
          </h4>
          <DataTable
            columns={[
              { key: 'product', header: 'Product', render: (line) => line.productName },
              { key: 'mrp', header: 'MRP', render: (line) => formatCurrency(line.mrp) },
              { key: 'tp', header: 'TP Rate', render: (line) => formatCurrency(line.tp_rate) },
              { 
                key: 'qty', 
                header: 'Qty', 
                render: (line) => (
                  <span>
                    {line.quantity}
                    {line.free_quantity > 0 && (
                      <span className="text-primary ml-1">(+{line.free_quantity} free)</span>
                    )}
                  </span>
                )
              },
              { 
                key: 'discount', 
                header: 'Discount', 
                render: (line) => (
                  Number(line.discount_value) > 0 
                    ? line.discount_type === 'PERCENT' 
                      ? `${line.discount_value}%` 
                      : formatCurrency(line.discount_value)
                    : '-'
                )
              },
              { key: 'total', header: 'Line Total', render: (line) => formatCurrency(line.total) },
            ]}
            data={enrichedLines}
            keyExtractor={(line) => line.id}
            emptyMessage="No items"
          />
        </div>

        <Separator />

        {/* Totals */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            {invoice.notes && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Notes</p>
                <p className="text-sm">{invoice.notes}</p>
              </div>
            )}
          </div>
          <div className="space-y-2 text-right">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal:</span>
              <span>{formatCurrency(invoice.subtotal)}</span>
            </div>
            {Number(invoice.discount) > 0 && (
              <div className="flex justify-between text-primary">
                <span>Discount:</span>
                <span>-{formatCurrency(invoice.discount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>Total:</span>
              <span>{formatCurrency(invoice.total)}</span>
            </div>
            <div className="flex justify-between text-primary">
              <span>Paid:</span>
              <span>{formatCurrency(invoice.paid)}</span>
            </div>
            <div className="flex justify-between text-destructive font-semibold">
              <span>Due:</span>
              <span>{formatCurrency(invoice.due)}</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 justify-end">
          <Button variant="outline" onClick={() => handlePrint('CUSTOMER')}>
            <Printer className="w-4 h-4 mr-2" />
            Customer Copy
          </Button>
          <Button variant="outline" onClick={() => handlePrint('OFFICE')}>
            <FileText className="w-4 h-4 mr-2" />
            Office Copy
          </Button>
          {Number(invoice.due) > 0 && invoice.status !== 'DRAFT' && (
            <Button onClick={handleReceivePayment} className="bg-primary">
              <Wallet className="w-4 h-4 mr-2" />
              Receive Payment ({formatCurrency(invoice.due)})
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
