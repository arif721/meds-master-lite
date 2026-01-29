import { useState, useEffect, useMemo } from 'react';
import { Loader2, Plus, Trash2, Pencil, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import {
  useCustomers,
  useSellers,
  useProducts,
  useBatches,
  useUpdateInvoice,
  DbInvoice,
  DbInvoiceLine,
  DbSeller,
} from '@/hooks/useDatabase';
import { useStores, DbStore } from '@/hooks/useStores';
import { formatCurrency, formatDate, isExpired } from '@/lib/format';

type InvoiceWithLines = DbInvoice & {
  lines: DbInvoiceLine[];
};

interface InvoiceEditDialogProps {
  invoice: InvoiceWithLines | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type EditFormLine = {
  productId: string;
  batchId: string;
  paidQuantity: string;
  freeQuantity: string;
  unitPrice: string;
  tpRate: string;
  discountType: 'AMOUNT' | 'PERCENT';
  discountValue: string;
};

export function InvoiceEditDialog({
  invoice,
  open,
  onOpenChange,
  onSuccess,
}: InvoiceEditDialogProps) {
  const { data: customers = [] } = useCustomers();
  const { data: dbSellers = [] } = useSellers();
  const { data: dbProducts = [] } = useProducts();
  const { data: dbBatches = [] } = useBatches();
  const { data: stores = [] } = useStores();
  const updateInvoiceMutation = useUpdateInvoice();

  const activeSellers = dbSellers.filter((s: DbSeller) => s.active);
  const activeProducts = dbProducts.filter((p) => p.active);

  const [formData, setFormData] = useState({
    customerId: '',
    sellerId: '',
    storeId: '',
    overallDiscountType: 'AMOUNT' as 'AMOUNT' | 'PERCENT',
    overallDiscountValue: '',
    lines: [] as EditFormLine[],
  });

  // Initialize form when invoice changes
  useEffect(() => {
    if (invoice) {
      const initialLines: EditFormLine[] = invoice.lines.map((line) => {
        const product = dbProducts.find((p) => p.id === line.product_id);
        return {
          productId: line.product_id,
          batchId: line.batch_id || '',
          paidQuantity: line.quantity.toString(),
          freeQuantity: (line.free_quantity || 0).toString(),
          unitPrice: line.unit_price.toString(),
          tpRate: line.tp_rate.toString(),
          discountType: line.discount_type || 'AMOUNT',
          discountValue: (line.discount_value || 0).toString(),
        };
      });

      // Calculate overall discount from invoice
      const subtotal = invoice.subtotal;
      const discount = invoice.discount || 0;
      
      setFormData({
        customerId: invoice.customer_id,
        sellerId: invoice.seller_id || '',
        storeId: invoice.store_id || '',
        overallDiscountType: 'AMOUNT',
        overallDiscountValue: discount.toString(),
        lines: initialLines,
      });
    }
  }, [invoice, dbProducts]);

  if (!invoice) return null;

  // Only allow editing DRAFT invoices
  const canEdit = invoice.status === 'DRAFT';

  const getProductName = (productId: string) => {
    return dbProducts.find((p) => p.id === productId)?.name || 'Unknown';
  };

  const getBatchLabel = (batchId: string) => {
    const batch = dbBatches.find((b) => b.id === batchId);
    if (!batch) return 'Unknown';
    const expiry = batch.expiry_date ? formatDate(batch.expiry_date) : 'No expiry';
    return `${batch.batch_number} (Stock: ${batch.quantity}, Exp: ${expiry})`;
  };

  const getBatchStock = (batchId: string) => {
    const batch = dbBatches.find((b) => b.id === batchId);
    return batch?.quantity || 0;
  };

  const getAvailableBatches = (productId: string) => {
    return dbBatches
      .filter(
        (b) =>
          b.product_id === productId &&
          b.quantity > 0 &&
          (!b.expiry_date || !isExpired(new Date(b.expiry_date)))
      )
      .sort((a, b) => {
        if (!a.expiry_date && !b.expiry_date) return 0;
        if (!a.expiry_date) return 1;
        if (!b.expiry_date) return -1;
        return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
      });
  };

  const hasZeroStock = (productId: string) => {
    return dbBatches
      .filter(
        (b) =>
          b.product_id === productId &&
          b.quantity > 0 &&
          (!b.expiry_date || !isExpired(new Date(b.expiry_date)))
      )
      .reduce((sum, b) => sum + b.quantity, 0) === 0;
  };

  const addLine = () => {
    setFormData({
      ...formData,
      lines: [
        ...formData.lines,
        {
          productId: '',
          batchId: '',
          paidQuantity: '',
          freeQuantity: '0',
          unitPrice: '',
          tpRate: '',
          discountType: 'AMOUNT',
          discountValue: '0',
        },
      ],
    });
  };

  const removeLine = (index: number) => {
    setFormData({
      ...formData,
      lines: formData.lines.filter((_, i) => i !== index),
    });
  };

  const updateLine = (index: number, field: string, value: string) => {
    const newLines = [...formData.lines];
    newLines[index] = { ...newLines[index], [field]: value };

    if (field === 'productId') {
      const product = dbProducts.find((p) => p.id === value);
      if (product) {
        newLines[index].unitPrice = product.sales_price.toString();
        newLines[index].tpRate = (product.tp_rate || product.cost_price).toString();
        newLines[index].batchId = '';
      }
    }

    setFormData({ ...formData, lines: newLines });
  };

  const calculateLineTotal = (line: EditFormLine) => {
    const paidQty = parseInt(line.paidQuantity) || 0;
    const tpRate = parseFloat(line.tpRate) || 0;
    const subtotal = paidQty * tpRate;
    const discountValue = parseFloat(line.discountValue) || 0;

    if (line.discountType === 'PERCENT') {
      return subtotal - (subtotal * discountValue) / 100;
    }
    return subtotal - discountValue;
  };

  const calculateTotal = () => {
    let lineTotal = formData.lines.reduce((sum, line) => sum + calculateLineTotal(line), 0);

    const overallDiscount = parseFloat(formData.overallDiscountValue) || 0;
    if (formData.overallDiscountType === 'PERCENT') {
      lineTotal = lineTotal - (lineTotal * overallDiscount) / 100;
    } else {
      lineTotal = lineTotal - overallDiscount;
    }

    return Math.max(0, lineTotal);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customerId) {
      toast({
        title: 'Customer Required',
        description: 'Please select a customer',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.storeId) {
      toast({
        title: 'Store Required',
        description: 'Please select a store',
        variant: 'destructive',
      });
      return;
    }

    if (formData.lines.length === 0) {
      toast({
        title: 'No Products',
        description: 'Please add at least one product',
        variant: 'destructive',
      });
      return;
    }

    // Validate lines
    for (const line of formData.lines) {
      if (!line.productId) {
        toast({
          title: 'Product Required',
          description: 'Please select a product for all lines',
          variant: 'destructive',
        });
        return;
      }

      if (hasZeroStock(line.productId)) {
        toast({
          title: 'No Stock Available',
          description: `${getProductName(line.productId)} has no stock.`,
          variant: 'destructive',
        });
        return;
      }

      if (!line.batchId) {
        toast({
          title: 'Batch Required',
          description: 'Please select a batch for all products',
          variant: 'destructive',
        });
        return;
      }

      const paidQty = parseInt(line.paidQuantity) || 0;
      if (paidQty < 1) {
        toast({
          title: 'Invalid Quantity',
          description: 'Paid quantity must be at least 1',
          variant: 'destructive',
        });
        return;
      }

      const freeQty = parseInt(line.freeQuantity) || 0;
      const totalQty = paidQty + freeQty;
      const batchStock = getBatchStock(line.batchId);
      if (totalQty > batchStock) {
        toast({
          title: 'Insufficient Stock',
          description: `Not enough stock for ${getProductName(line.productId)}. Available: ${batchStock}`,
          variant: 'destructive',
        });
        return;
      }
    }

    const subtotal = formData.lines.reduce((sum, line) => sum + calculateLineTotal(line), 0);
    const overallDiscountValue = parseFloat(formData.overallDiscountValue) || 0;
    let overallDiscountAmount = 0;
    if (formData.overallDiscountType === 'PERCENT') {
      overallDiscountAmount = (subtotal * overallDiscountValue) / 100;
    } else {
      overallDiscountAmount = overallDiscountValue;
    }

    const total = calculateTotal();

    const invoiceLines = formData.lines.map((line) => {
      const paidQty = parseInt(line.paidQuantity) || 0;
      const freeQty = parseInt(line.freeQuantity) || 0;
      const unitPrice = parseFloat(line.unitPrice) || 0;
      const tpRate = parseFloat(line.tpRate) || 0;
      const discountValue = parseFloat(line.discountValue) || 0;
      const lineTotal = calculateLineTotal(line);

      const product = dbProducts.find((p) => p.id === line.productId);
      const costPrice = product?.cost_price || 0;

      return {
        product_id: line.productId,
        batch_id: line.batchId,
        quantity: paidQty,
        free_quantity: freeQty,
        unit_price: unitPrice,
        total: lineTotal,
        cost_price: costPrice,
        tp_rate: tpRate,
        discount_type: line.discountType,
        discount_value: discountValue,
        returned_quantity: 0,
      };
    });

    try {
      await updateInvoiceMutation.mutateAsync({
        id: invoice.id,
        invoice: {
          customer_id: formData.customerId,
          seller_id: formData.sellerId || null,
          store_id: formData.storeId,
          subtotal: subtotal,
          discount: overallDiscountAmount,
          total: total,
          due: total - invoice.paid,
        },
        lines: invoiceLines,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      // Error handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5" />
            Edit Invoice #{invoice.invoice_number}
          </DialogTitle>
        </DialogHeader>

        {!canEdit ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Cannot Edit</AlertTitle>
            <AlertDescription>
              Only DRAFT invoices can be edited. This invoice is {invoice.status}.
            </AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Customer, Store, Seller Selection */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="customer">Customer *</Label>
                <Select
                  value={formData.customerId}
                  onValueChange={(value) => setFormData({ ...formData, customerId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="store">Store *</Label>
                <Select
                  value={formData.storeId}
                  onValueChange={(value) => setFormData({ ...formData, storeId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select store" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {stores
                      .filter((s: DbStore) => s.active)
                      .map((s: DbStore) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="seller">Seller (Optional)</Label>
                <Select
                  value={formData.sellerId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, sellerId: value === 'none' ? '' : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No seller" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="none">No seller</SelectItem>
                    {activeSellers.map((s: DbSeller) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Product Lines */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Products</Label>
                <Button type="button" variant="outline" size="sm" onClick={addLine}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Line
                </Button>
              </div>

              <div className="space-y-4 max-h-[300px] overflow-y-auto">
                {formData.lines.map((line, index) => (
                  <div
                    key={index}
                    className="p-4 border rounded-lg space-y-3 bg-muted/30 relative"
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8 text-destructive"
                      onClick={() => removeLine(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pr-10">
                      <div className="col-span-2">
                        <Label className="text-xs mb-1 block">Product</Label>
                        <Select
                          value={line.productId}
                          onValueChange={(value) => updateLine(index, 'productId', value)}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select product" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover">
                            {activeProducts.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="col-span-2">
                        <Label className="text-xs mb-1 block">Batch</Label>
                        <Select
                          value={line.batchId}
                          onValueChange={(value) => updateLine(index, 'batchId', value)}
                          disabled={!line.productId}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select batch" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover">
                            {getAvailableBatches(line.productId).map((b) => (
                              <SelectItem key={b.id} value={b.id}>
                                {getBatchLabel(b.id)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-xs mb-1 block">Paid Qty</Label>
                        <Input
                          type="number"
                          value={line.paidQuantity}
                          onChange={(e) => updateLine(index, 'paidQuantity', e.target.value)}
                          className="h-9"
                          min="1"
                        />
                      </div>

                      <div>
                        <Label className="text-xs mb-1 block">Free Qty</Label>
                        <Input
                          type="number"
                          value={line.freeQuantity}
                          onChange={(e) => updateLine(index, 'freeQuantity', e.target.value)}
                          className="h-9"
                          min="0"
                        />
                      </div>

                      <div>
                        <Label className="text-xs mb-1 block">TP Rate</Label>
                        <Input
                          type="number"
                          value={line.tpRate}
                          onChange={(e) => updateLine(index, 'tpRate', e.target.value)}
                          className="h-9"
                          step="0.01"
                        />
                      </div>

                      <div>
                        <Label className="text-xs mb-1 block">Line Total</Label>
                        <div className="h-9 flex items-center px-2 bg-muted rounded-md font-medium text-primary">
                          {formatCurrency(calculateLineTotal(line))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {formData.lines.length === 0 && (
                  <p className="text-center py-4 text-muted-foreground">
                    Click "Add Line" to add products
                  </p>
                )}
              </div>
            </div>

            {/* Overall Discount */}
            {formData.lines.length > 0 && (
              <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg border border-dashed">
                <Label className="font-medium whitespace-nowrap">Overall Discount:</Label>
                <Select
                  value={formData.overallDiscountType}
                  onValueChange={(value: 'AMOUNT' | 'PERCENT') =>
                    setFormData({ ...formData, overallDiscountType: value })
                  }
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="AMOUNT">৳</SelectItem>
                    <SelectItem value="PERCENT">%</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0"
                  value={formData.overallDiscountValue}
                  onChange={(e) =>
                    setFormData({ ...formData, overallDiscountValue: e.target.value })
                  }
                  className="w-32"
                  min="0"
                />
              </div>
            )}

            {/* Total */}
            <div className="flex justify-end p-4 bg-muted/50 rounded-lg">
              <div className="text-right space-y-1">
                <p className="text-sm text-muted-foreground">
                  Subtotal: {formatCurrency(formData.lines.reduce((sum, line) => sum + calculateLineTotal(line), 0))}
                </p>
                {(parseFloat(formData.overallDiscountValue) || 0) > 0 && (
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    Overall Discount: -
                    {formData.overallDiscountType === 'PERCENT'
                      ? `${formData.overallDiscountValue}%`
                      : formatCurrency(parseFloat(formData.overallDiscountValue) || 0)}
                  </p>
                )}
                <p className="text-2xl font-bold text-primary">{formatCurrency(calculateTotal())}</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateInvoiceMutation.isPending}>
                {updateInvoiceMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Update Invoice
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
