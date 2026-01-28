import { useState, useMemo } from 'react';
import { Plus, Search, RotateCcw, Trash2, AlertTriangle, Package, Printer, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/DataTable';
import { useProducts, useBatches, useInvoices, useInvoiceLines, useCustomers, useStockAdjustments, useAddStockAdjustment, DbStockAdjustment } from '@/hooks/useDatabase';
import { formatCurrency, formatDate, isExpired } from '@/lib/format';
import { openReturnReceiptWindow } from '@/lib/returnReceipt';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';

type AdjustmentType = 'DAMAGE' | 'EXPIRED' | 'LOST' | 'FOUND' | 'CORRECTION' | 'RETURN';

export default function Adjustments() {
  // Database hooks
  const { data: products = [], isLoading: productsLoading } = useProducts();
  const { data: batches = [], isLoading: batchesLoading } = useBatches();
  const { data: invoices = [], isLoading: invoicesLoading } = useInvoices();
  const { data: invoiceLines = [], isLoading: invoiceLinesLoading } = useInvoiceLines();
  const { data: customers = [], isLoading: customersLoading } = useCustomers();
  const { data: stockAdjustments = [], isLoading: adjustmentsLoading } = useStockAdjustments();
  
  const addAdjustmentMutation = useAddStockAdjustment();
  
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'adjustment' | 'return'>('adjustment');

  const [formData, setFormData] = useState({
    type: 'DAMAGE' as AdjustmentType,
    productId: '',
    batchId: '',
    quantity: '',
    reason: '',
    invoiceId: '',
    returnAction: 'RESTOCK' as 'RESTOCK' | 'SCRAP',
  });

  const activeProducts = products.filter((p) => p.active);
  const confirmedInvoices = useMemo(() => {
    return invoices.filter((inv) => inv.status === 'CONFIRMED' || inv.status === 'PAID' || inv.status === 'PARTIAL');
  }, [invoices]);

  const filteredAdjustments = useMemo(() => {
    return stockAdjustments.filter((adj) => {
      const product = products.find((p) => p.id === adj.product_id);
      return (
        product?.name.toLowerCase().includes(search.toLowerCase()) ||
        (adj.reason?.toLowerCase().includes(search.toLowerCase()) ?? false)
      );
    });
  }, [stockAdjustments, products, search]);

  const getProductName = (productId: string) => {
    return products.find((p) => p.id === productId)?.name || 'Unknown';
  };

  const getBatchLabel = (batchId: string) => {
    const batch = batches.find((b) => b.id === batchId);
    if (!batch) return 'Unknown';
    return `${batch.batch_number} (Stock: ${batch.quantity})`;
  };

  const getBatchStock = (batchId: string) => {
    return batches.find((b) => b.id === batchId)?.quantity || 0;
  };

  const getAvailableBatches = (productId: string) => {
    return batches.filter((b) => b.product_id === productId && b.quantity > 0);
  };

  const getInvoiceLabel = (invoiceId: string) => {
    const invoice = invoices.find((inv) => inv.id === invoiceId);
    if (!invoice) return '';
    const customer = customers.find((c) => c.id === invoice.customer_id);
    return `${invoice.invoice_number} - ${customer?.name || 'Unknown'}`;
  };

  // Get products sold in the selected invoice for returns (includes free qty)
  const getInvoiceProducts = (invoiceId: string) => {
    const invoice = invoices.find((inv) => inv.id === invoiceId);
    if (!invoice) return [];
    const lines = invoiceLines.filter(l => l.invoice_id === invoiceId);
    return lines.map((line) => ({
      productId: line.product_id,
      batchId: line.batch_id || '',
      quantity: line.quantity,
      freeQuantity: line.free_quantity || 0,
      totalSold: line.quantity + (line.free_quantity || 0),
      unitPrice: line.unit_price,
      product: products.find((p) => p.id === line.product_id),
      batch: batches.find((b) => b.id === line.batch_id),
    }));
  };

  // Get max returnable quantity for a product from invoice (paid + free qty sold)
  const getMaxReturnQuantity = () => {
    if (!formData.invoiceId || !formData.productId) return 0;
    const lines = invoiceLines.filter(l => l.invoice_id === formData.invoiceId);
    const line = lines.find(
      (l) => l.product_id === formData.productId && l.batch_id === formData.batchId
    );
    if (!line) return 0;
    
    // Total sold = paid quantity + free quantity
    const totalSold = line.quantity + (line.free_quantity || 0);
    
    // Calculate already returned quantity
    const returnedQty = stockAdjustments
      .filter(
        (adj) =>
          adj.type === 'RETURN' &&
          adj.invoice_id === formData.invoiceId &&
          adj.product_id === formData.productId &&
          adj.batch_id === formData.batchId
      )
      .reduce((sum, adj) => sum + adj.quantity, 0);
    return totalSold - returnedQty;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const quantity = parseInt(formData.quantity) || 0;
    if (quantity <= 0) {
      toast({
        title: 'Invalid Quantity',
        description: 'Please enter a valid quantity',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.productId || !formData.batchId) {
      toast({
        title: 'Required Fields',
        description: 'Please select product and batch',
        variant: 'destructive',
      });
      return;
    }

    if (formData.type === 'RETURN') {
      // Check invoice is selected
      if (!formData.invoiceId) {
        toast({
          title: 'Invoice Required',
          description: 'Please select the related invoice for return',
          variant: 'destructive',
        });
        return;
      }

      // Check max returnable quantity
      const maxQty = getMaxReturnQuantity();
      if (quantity > maxQty) {
        toast({
          title: 'Exceeds Sold Quantity',
          description: `Maximum returnable quantity is ${maxQty}`,
          variant: 'destructive',
        });
        return;
      }
    } else {
      // Check if batch has enough stock for damage/expired
      const batchStock = getBatchStock(formData.batchId);
      if (quantity > batchStock) {
        toast({
          title: 'Insufficient Stock',
          description: `Only ${batchStock} units available in this batch`,
          variant: 'destructive',
        });
        return;
      }
    }

    // Calculate return value
    let returnValue = 0;
    if (formData.type === 'RETURN' && formData.invoiceId) {
      const lines = invoiceLines.filter(l => l.invoice_id === formData.invoiceId);
      const line = lines.find(l => l.product_id === formData.productId && l.batch_id === formData.batchId);
      returnValue = quantity * (line?.unit_price || 0);
    }

    try {
      await addAdjustmentMutation.mutateAsync({
        type: formData.type,
        product_id: formData.productId,
        batch_id: formData.batchId,
        quantity,
        reason: formData.reason || null,
        invoice_id: formData.type === 'RETURN' ? formData.invoiceId : null,
        return_action: formData.type === 'RETURN' ? formData.returnAction : null,
        return_value: returnValue,
      });

      toast({
        title: formData.type === 'RETURN' ? 'Return Processed' : 'Adjustment Recorded',
        description: formData.type === 'RETURN' 
          ? 'Stock returned and adjustment recorded' 
          : 'Stock adjusted successfully',
      });

      resetForm();
      setDialogOpen(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to record adjustment',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      type: 'DAMAGE',
      productId: '',
      batchId: '',
      quantity: '',
      reason: '',
      invoiceId: '',
      returnAction: 'RESTOCK',
    });
  };

  const openDialog = (type: 'adjustment' | 'return') => {
    setDialogType(type);
    setFormData({
      ...formData,
      type: type === 'return' ? 'RETURN' : 'DAMAGE',
    });
    setDialogOpen(true);
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'RETURN':
        return 'badge-success';
      case 'DAMAGE':
        return 'badge-warning';
      case 'EXPIRED':
        return 'badge-danger';
      case 'FOUND':
        return 'badge-success';
      default:
        return 'badge-info';
    }
  };

  const stats = useMemo(() => ({
    returns: stockAdjustments.filter((a) => a.type === 'RETURN').length,
    damage: stockAdjustments.filter((a) => a.type === 'DAMAGE').length,
    expired: stockAdjustments.filter((a) => a.type === 'EXPIRED').length,
  }), [stockAdjustments]);

  const isLoading = productsLoading || batchesLoading || invoicesLoading || invoiceLinesLoading || customersLoading || adjustmentsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Stock Adjustments</h1>
          <p className="text-muted-foreground">Manage returns, damage, and expired stock</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => openDialog('return')}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Sales Return
          </Button>
          <Button onClick={() => openDialog('adjustment')}>
            <Plus className="w-4 h-4 mr-2" />
            Damage / Expired
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="metric-card">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-success/10">
              <RotateCcw className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="stat-label">Total Returns</p>
              <p className="text-2xl font-bold">{stats.returns}</p>
            </div>
          </div>
        </div>
        <div className="metric-card">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-warning/10">
              <Trash2 className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="stat-label">Damage Records</p>
              <p className="text-2xl font-bold">{stats.damage}</p>
            </div>
          </div>
        </div>
        <div className="metric-card">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-destructive/10">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="stat-label">Expired Stock</p>
              <p className="text-2xl font-bold">{stats.expired}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by product or reason..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Adjustments Table */}
      <DataTable
        columns={[
          {
            key: 'date',
            header: 'Date',
            render: (adj) => formatDate(adj.created_at),
          },
          {
            key: 'type',
            header: 'Type',
            render: (adj) => (
              <div className="flex flex-col gap-1">
                <span className={getTypeBadge(adj.type)}>{adj.type}</span>
                {adj.type === 'RETURN' && adj.return_action && (
                  <span className={`text-xs ${adj.return_action === 'RESTOCK' ? 'text-success' : 'text-warning'}`}>
                    ({adj.return_action})
                  </span>
                )}
              </div>
            ),
          },
          {
            key: 'product',
            header: 'Product',
            render: (adj) => (
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{getProductName(adj.product_id)}</span>
              </div>
            ),
          },
          {
            key: 'batch',
            header: 'Batch',
            render: (adj) => {
              const batch = batches.find((b) => b.id === adj.batch_id);
              return batch?.batch_number || 'Unknown';
            },
          },
          {
            key: 'quantity',
            header: 'Quantity',
            render: (adj) => (
              <span className={adj.type === 'RETURN' || adj.type === 'FOUND' ? 'text-success font-medium' : 'text-destructive font-medium'}>
                {adj.type === 'RETURN' || adj.type === 'FOUND' ? '+' : '-'}{adj.quantity}
              </span>
            ),
          },
          {
            key: 'reason',
            header: 'Reason',
            render: (adj) => (
              <span className="text-muted-foreground truncate max-w-[150px] block">{adj.reason || '-'}</span>
            ),
          },
          {
            key: 'actions',
            header: 'Actions',
            render: (adj) => {
              if (adj.type === 'RETURN') {
                const invoice = invoices.find(inv => inv.id === adj.invoice_id);
                const customer = invoice ? customers.find(c => c.id === invoice.customer_id) : null;
                const batch = batches.find(b => b.id === adj.batch_id);
                const lines = invoiceLines.filter(l => l.invoice_id === adj.invoice_id);
                const line = lines.find(l => l.product_id === adj.product_id);
                
                return (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openReturnReceiptWindow({
                      returnId: adj.id,
                      date: new Date(adj.created_at),
                      invoiceNumber: invoice?.invoice_number || 'N/A',
                      customerName: customer?.name || 'N/A',
                      productName: getProductName(adj.product_id),
                      batchLotNumber: batch?.batch_number || 'N/A',
                      quantity: adj.quantity,
                      unitPrice: line?.unit_price || 0,
                      returnValue: adj.return_value || (adj.quantity * (line?.unit_price || 0)),
                      reason: adj.reason || '',
                      returnAction: adj.return_action || 'RESTOCK',
                    })}
                    title="Print Return Receipt"
                  >
                    <Printer className="w-4 h-4" />
                  </Button>
                );
              }
              return null;
            },
          },
        ]}
        data={filteredAdjustments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())}
        keyExtractor={(adj) => adj.id}
        emptyMessage="No adjustments recorded"
      />

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialogType === 'return' ? 'Process Sales Return' : 'Record Damage / Expired'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {dialogType === 'adjustment' && (
              <div className="input-group">
                <Label>Adjustment Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: AdjustmentType) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="DAMAGE">Damage</SelectItem>
                    <SelectItem value="EXPIRED">Expired</SelectItem>
                    <SelectItem value="LOST">Lost</SelectItem>
                    <SelectItem value="FOUND">Found</SelectItem>
                    <SelectItem value="CORRECTION">Correction</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {dialogType === 'return' && (
              <div className="input-group">
                <Label>Related Invoice *</Label>
                <Select
                  value={formData.invoiceId}
                  onValueChange={(value) => setFormData({ ...formData, invoiceId: value, productId: '', batchId: '', quantity: '' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select invoice" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover max-h-60">
                    {confirmedInvoices.map((inv) => (
                      <SelectItem key={inv.id} value={inv.id}>
                        {getInvoiceLabel(inv.id)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {dialogType === 'return' ? (
              // Return: Show only products from selected invoice
              <>
                <div className="input-group">
                  <Label>Product *</Label>
                  <Select
                    value={formData.productId}
                    onValueChange={(value) => {
                      const invoiceProduct = getInvoiceProducts(formData.invoiceId).find(
                        (p) => p.productId === value
                      );
                      setFormData({
                        ...formData,
                        productId: value,
                        batchId: invoiceProduct?.batchId || '',
                        quantity: '',
                      });
                    }}
                    disabled={!formData.invoiceId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={formData.invoiceId ? "Select product" : "Select invoice first"} />
                    </SelectTrigger>
                    <SelectContent className="bg-popover max-h-60">
                      {getInvoiceProducts(formData.invoiceId).map((item) => {
                        const returnedQty = stockAdjustments
                          .filter(
                            (adj) =>
                              adj.type === 'RETURN' &&
                              adj.invoice_id === formData.invoiceId &&
                              adj.product_id === item.productId &&
                              adj.batch_id === item.batchId
                          )
                          .reduce((sum, adj) => sum + adj.quantity, 0);
                        const remainingQty = item.totalSold - returnedQty;
                        if (remainingQty <= 0) return null;
                        return (
                          <SelectItem key={`${item.productId}-${item.batchId}`} value={item.productId}>
                            {item.product?.name || 'Unknown'} - Max: {remainingQty} (Paid: {item.quantity}, Free: {item.freeQuantity})
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="input-group">
                  <Label>Return Action *</Label>
                  <Select
                    value={formData.returnAction}
                    onValueChange={(value: 'RESTOCK' | 'SCRAP') => setFormData({ ...formData, returnAction: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="RESTOCK">Restock (Add back to inventory)</SelectItem>
                      <SelectItem value="SCRAP">Scrap (Write off as loss)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              // Adjustment: Show all products and batches
              <>
                <div className="input-group">
                  <Label>Product *</Label>
                  <Select
                    value={formData.productId}
                    onValueChange={(value) => setFormData({ ...formData, productId: value, batchId: '' })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover max-h-60">
                      {activeProducts.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="input-group">
                  <Label>Batch *</Label>
                  <Select
                    value={formData.batchId}
                    onValueChange={(value) => setFormData({ ...formData, batchId: value })}
                    disabled={!formData.productId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={formData.productId ? "Select batch" : "Select product first"} />
                    </SelectTrigger>
                    <SelectContent className="bg-popover max-h-60">
                      {getAvailableBatches(formData.productId).map((batch) => (
                        <SelectItem key={batch.id} value={batch.id}>
                          {batch.batch_number} (Stock: {batch.quantity})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="input-group">
              <Label>Quantity *</Label>
              <Input
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                placeholder={dialogType === 'return' ? `Max: ${getMaxReturnQuantity()}` : 'Enter quantity'}
              />
              {dialogType === 'return' && formData.productId && (
                <p className="text-xs text-muted-foreground mt-1">
                  Maximum returnable: {getMaxReturnQuantity()} units
                </p>
              )}
            </div>

            <div className="input-group">
              <Label>Reason</Label>
              <Textarea
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="Describe the reason for this adjustment..."
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                Cancel
              </Button>
              <Button type="submit" disabled={addAdjustmentMutation.isPending}>
                {addAdjustmentMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {dialogType === 'return' ? 'Process Return' : 'Record Adjustment'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
