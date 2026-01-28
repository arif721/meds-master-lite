import { useState, useMemo } from 'react';
import { Plus, Search, FileText, Eye, Printer, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/DataTable';
import { useCustomers, useSellers, useInvoices, useInvoiceLines, useAddInvoice, useConfirmInvoice, useProducts, useBatches, DbSeller, DbInvoice, DbInvoiceLine } from '@/hooks/useDatabase';
import { useStores, PAYMENT_TERMS_LABELS, DbStore } from '@/hooks/useStores';
import { formatCurrency, formatDate, formatDateOnly, formatTimeWithSeconds, isExpired, generateInvoiceNumber } from '@/lib/format';
import { AdminGreetingClock } from '@/components/AdminGreetingClock';
import { openInvoiceWindow, openCustomerCopyWindow, openOfficeCopyWindow } from '@/lib/invoice';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { SalesDateFilter, DateRange } from '@/components/SalesDateFilter';
import { useProfitLoss, getDateRange } from '@/hooks/useProfitLoss';
import { startOfDay, endOfDay, isWithinInterval, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';

// Type for invoice with lines for display
type InvoiceWithLines = DbInvoice & {
  lines: DbInvoiceLine[];
};

export default function Sales() {
  // Database hooks - all data from Supabase
  const { data: dbProducts = [], isLoading: productsLoading } = useProducts();
  const { data: dbBatches = [], isLoading: batchesLoading } = useBatches();
  const { data: dbInvoices = [], isLoading: invoicesLoading } = useInvoices();
  const { data: dbInvoiceLines = [], isLoading: invoiceLinesLoading } = useInvoiceLines();
  const { data: customers = [], isLoading: customersLoading } = useCustomers();
  const { data: stores = [], isLoading: storesLoading } = useStores();
  const { data: dbSellers = [], isLoading: sellersLoading } = useSellers();
  
  // Mutations
  const addInvoiceMutation = useAddInvoice();
  const confirmInvoiceMutation = useConfirmInvoice();
  
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewInvoice, setViewInvoice] = useState<InvoiceWithLines | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [creditWarningAcknowledged, setCreditWarningAcknowledged] = useState(false);

  // Combine invoices with their lines
  const invoicesWithLines = useMemo(() => {
    return dbInvoices.map(inv => ({
      ...inv,
      lines: dbInvoiceLines.filter(line => line.invoice_id === inv.id)
    }));
  }, [dbInvoices, dbInvoiceLines]);

  // P&L calculation with date filter
  const plFilters = useMemo(() => ({
    preset: (dateRange.from || dateRange.to) ? 'custom' as const : 'all' as const,
    startDate: dateRange.from,
    endDate: dateRange.to,
  }), [dateRange]);
  
  const { metrics } = useProfitLoss(plFilters);

  const [formData, setFormData] = useState({
    customerId: '',
    sellerId: '',
    storeId: '',
    overallDiscountType: 'AMOUNT' as 'AMOUNT' | 'PERCENT',
    overallDiscountValue: '',
    lines: [] as {
      productId: string;
      batchId: string;
      paidQuantity: string;
      freeQuantity: string;
      unitPrice: string; // MRP
      tpRate: string; // TP Rate
      discountType: 'AMOUNT' | 'PERCENT';
      discountValue: string;
    }[],
  });

  const activeSellers = dbSellers.filter((s: DbSeller) => s.active);
  const activeProducts = dbProducts.filter((p) => p.active);

  // Filter invoices by search and date range
  const filteredInvoices = useMemo(() => {
    return invoicesWithLines.filter((inv) => {
      // Search filter
      const matchesSearch = 
        inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
        customers.find((c) => c.id === inv.customer_id)?.name.toLowerCase().includes(search.toLowerCase());
      
      if (!matchesSearch) return false;

      // Date range filter
      if (dateRange.from || dateRange.to) {
        const invoiceDate = parseISO(inv.created_at);
        const start = dateRange.from ? startOfDay(dateRange.from) : new Date(0);
        const end = dateRange.to ? endOfDay(dateRange.to) : endOfDay(new Date());
        
        if (!isWithinInterval(invoiceDate, { start, end })) {
          return false;
        }
      }

      return true;
    });
  }, [invoicesWithLines, search, dateRange, customers]);

  const getCustomerName = (customerId: string) => {
    return customers.find((c) => c.id === customerId)?.name || 'Unknown';
  };

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

  // Get available batches (with stock > 0 and not expired)
  const getAvailableBatches = (productId: string) => {
    return dbBatches.filter(
      (b) => b.product_id === productId && b.quantity > 0 && (!b.expiry_date || !isExpired(new Date(b.expiry_date)))
    ).sort((a, b) => {
      // FIFO: sort by expiry date (earliest first)
      if (!a.expiry_date && !b.expiry_date) return 0;
      if (!a.expiry_date) return 1;
      if (!b.expiry_date) return -1;
      return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
    });
  };

  // Check if product has any available stock
  const getProductTotalStock = (productId: string) => {
    return dbBatches
      .filter((b) => b.product_id === productId && b.quantity > 0 && (!b.expiry_date || !isExpired(new Date(b.expiry_date))))
      .reduce((sum, b) => sum + b.quantity, 0);
  };

  // Check if product has zero stock (for validation)
  const hasZeroStock = (productId: string) => {
    return getProductTotalStock(productId) === 0;
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
          discountType: 'AMOUNT' as const,
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

    // Auto-set unit price (MRP) and TP Rate when product is selected
    if (field === 'productId') {
      const product = dbProducts.find((p) => p.id === value);
      if (product) {
        newLines[index].unitPrice = product.sales_price.toString(); // MRP
        newLines[index].tpRate = (product.tp_rate || product.cost_price).toString(); // TP Rate (fallback to cost_price if tp_rate not set)
        newLines[index].batchId = '';
      }
    }

    setFormData({ ...formData, lines: newLines });
  };

  // Calculate line total with discount (based on TP Rate, not MRP)
  const calculateLineTotal = (line: typeof formData.lines[0]) => {
    const paidQty = parseInt(line.paidQuantity) || 0;
    const tpRate = parseFloat(line.tpRate) || 0; // Use TP Rate for billing
    const subtotal = paidQty * tpRate;
    const discountValue = parseFloat(line.discountValue) || 0;
    
    if (line.discountType === 'PERCENT') {
      return subtotal - (subtotal * discountValue / 100);
    }
    return subtotal - discountValue;
  };

  const calculateTotal = () => {
    let lineTotal = formData.lines.reduce((sum, line) => sum + calculateLineTotal(line), 0);
    
    // Apply overall discount
    const overallDiscount = parseFloat(formData.overallDiscountValue) || 0;
    if (formData.overallDiscountType === 'PERCENT') {
      lineTotal = lineTotal - (lineTotal * overallDiscount / 100);
    } else {
      lineTotal = lineTotal - overallDiscount;
    }
    
    return Math.max(0, lineTotal);
  };

  const handleSubmit = async (e: React.FormEvent, asDraft: boolean = false) => {
    e.preventDefault();

    // Validate customer is selected
    if (!formData.customerId) {
      toast({
        title: 'Customer Required',
        description: 'Please select a customer',
        variant: 'destructive',
      });
      return;
    }

    // Validate store is selected
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

    // Validate each line has product, batch and quantity >= 1
    for (const line of formData.lines) {
      if (!line.productId) {
        toast({
          title: 'Product Required',
          description: 'Please select a product for all lines',
          variant: 'destructive',
        });
        return;
      }
      
      // CRITICAL: Block products with zero stock
      if (hasZeroStock(line.productId)) {
        toast({
          title: 'No Stock Available',
          description: `${getProductName(line.productId)} has no stock. Add Opening Stock / Receive Stock first.`,
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
      const freeQty = parseInt(line.freeQuantity) || 0;
      if (paidQty < 1) {
        toast({
          title: 'Invalid Paid Quantity',
          description: 'Paid quantity must be at least 1 for all products',
          variant: 'destructive',
        });
        return;
      }
      // Validate stock availability (Paid + Free)
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

    const total = calculateTotal();
    const invoiceNumber = generateInvoiceNumber();

    // Calculate overall discount amount
    const subtotal = formData.lines.reduce((sum, line) => sum + calculateLineTotal(line), 0);
    const overallDiscountValue = parseFloat(formData.overallDiscountValue) || 0;
    let overallDiscountAmount = 0;
    if (formData.overallDiscountType === 'PERCENT') {
      overallDiscountAmount = subtotal * overallDiscountValue / 100;
    } else {
      overallDiscountAmount = overallDiscountValue;
    }

    // Prepare invoice lines with TP rate and discount fields
    const invoiceLines = formData.lines.map((line) => {
      const paidQty = parseInt(line.paidQuantity) || 0;
      const freeQty = parseInt(line.freeQuantity) || 0;
      const unitPrice = parseFloat(line.unitPrice) || 0; // MRP
      const tpRate = parseFloat(line.tpRate) || 0;
      const discountValue = parseFloat(line.discountValue) || 0;
      const lineTotal = calculateLineTotal(line);
      
      // Get product's internal cost price for P&L calculation
      const product = dbProducts.find(p => p.id === line.productId);
      const costPrice = product?.cost_price || 0; // Internal accounting cost
      
      return {
        product_id: line.productId,
        batch_id: line.batchId,
        quantity: paidQty,
        free_quantity: freeQty,
        unit_price: unitPrice, // MRP (for reference only)
        total: lineTotal, // Based on TP Rate
        cost_price: costPrice, // Internal cost for P&L
        tp_rate: tpRate, // Trade Price (billing price)
        discount_type: line.discountType,
        discount_value: discountValue,
        returned_quantity: 0,
      };
    });

    try {
      // Create invoice in database
      const createdInvoice = await addInvoiceMutation.mutateAsync({
        invoice: {
          invoice_number: invoiceNumber,
          customer_id: formData.customerId,
          seller_id: formData.sellerId || null,
          store_id: formData.storeId,
          status: 'DRAFT',
          subtotal: subtotal,
          discount: overallDiscountAmount,
          total: total,
          paid: 0,
          due: total,
          notes: null,
        },
        lines: invoiceLines,
      });

      if (!asDraft && createdInvoice) {
        // Confirm invoice - this triggers stock deduction
        await confirmInvoiceMutation.mutateAsync(createdInvoice.id);
        
        toast({
          title: 'Invoice Created & Confirmed',
          description: `Invoice ${invoiceNumber} created and stock deducted.`,
        });
      } else {
        toast({
          title: 'Draft Saved',
          description: 'Invoice saved as draft. Stock will be deducted when confirmed.',
        });
      }

      resetForm();
      setDialogOpen(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create invoice',
        variant: 'destructive',
      });
    }
  };

  const handleConfirm = async (invoiceId: string) => {
    const invoice = invoicesWithLines.find((inv) => inv.id === invoiceId);
    if (!invoice) return;

    // Validate stock availability (Paid + Free Quantity)
    for (const line of invoice.lines) {
      const totalRequired = line.quantity + (line.free_quantity || 0);
      const batchStock = getBatchStock(line.batch_id || '');
      if (totalRequired > batchStock) {
        toast({
          title: 'Insufficient Stock',
          description: `Not enough stock for ${getProductName(line.product_id)}. Available: ${batchStock}, Required: ${totalRequired}`,
          variant: 'destructive',
        });
        return;
      }
    }

    try {
      await confirmInvoiceMutation.mutateAsync(invoiceId);
      toast({
        title: 'Invoice Confirmed',
        description: `Invoice ${invoice.invoice_number} confirmed. Stock deducted.`,
      });
    } catch (error: any) {
      toast({
        title: 'Confirmation Failed',
        description: error.message || 'Unable to confirm invoice',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({ 
      customerId: '', 
      sellerId: '', 
      storeId: '', 
      overallDiscountType: 'AMOUNT',
      overallDiscountValue: '',
      lines: [] 
    });
    setCreditWarningAcknowledged(false);
  };

  const getSellerName = (sellerId: string | null) => {
    if (!sellerId) return 'N/A';
    return dbSellers.find((s) => s.id === sellerId)?.name || 'N/A';
  };

  const getStoreName = (storeId: string | null) => {
    if (!storeId) return 'N/A';
    return stores.find((s) => s.id === storeId)?.name || 'N/A';
  };

  // Prepare invoice data for printing
  const getInvoicePrintData = (invoice: InvoiceWithLines) => {
    const customer = customers.find((c) => c.id === invoice.customer_id);
    const seller = invoice.seller_id ? dbSellers.find((s) => s.id === invoice.seller_id) : null;
    const store = invoice.store_id ? stores.find((s) => s.id === invoice.store_id) : null;
    
    // Transform to the expected format for invoice printing
    const invoiceForPrint = {
      id: invoice.id,
      invoiceNumber: invoice.invoice_number,
      date: new Date(invoice.created_at),
      customerId: invoice.customer_id,
      sellerId: invoice.seller_id,
      storeId: invoice.store_id,
      totalAmount: invoice.total,
      paidAmount: invoice.paid,
      dueAmount: invoice.due,
      status: invoice.status as 'DRAFT' | 'CONFIRMED',
      lines: invoice.lines.map(line => ({
        id: line.id,
        invoiceId: line.invoice_id,
        productId: line.product_id,
        batchLotId: line.batch_id || '',
        quantity: line.quantity,
        freeQuantity: line.free_quantity,
        unitPrice: line.unit_price, // MRP
        lineTotal: line.total,
      })),
      createdAt: new Date(invoice.created_at),
    };
    
    // Enhanced line data with TP Rate and Cost Price
    const enhancedLines = invoice.lines.map(line => {
      const product = dbProducts.find(p => p.id === line.product_id);
      return {
        id: line.id,
        productName: product?.name || 'Unknown',
        quantity: line.quantity,
        freeQuantity: line.free_quantity,
        unitPrice: line.unit_price, // MRP
        tpRate: line.tp_rate || product?.tp_rate || 0, // TP Rate from line or product
        costPrice: line.cost_price || product?.cost_price || 0, // Cost Price for P&L
        discountType: line.discount_type as 'AMOUNT' | 'PERCENT',
        discountValue: line.discount_value,
        lineTotal: line.total,
      };
    });
    
    return {
      invoice: invoiceForPrint,
      customerName: customer?.name || 'N/A',
      customerAddress: customer?.address || undefined,
      customerPhone: customer?.phone || undefined,
      sellerName: seller?.name,
      storeName: store?.name,
      getProductName,
      lines: enhancedLines,
    };
  };

  const printCustomerCopy = (invoice: InvoiceWithLines) => {
    const data = getInvoicePrintData(invoice);
    openCustomerCopyWindow(data);
  };

  const printOfficeCopy = (invoice: InvoiceWithLines) => {
    const data = getInvoicePrintData(invoice);
    openOfficeCopyWindow(data);
  };

  const printInvoice = (invoice: InvoiceWithLines) => {
    // Default to customer copy
    printCustomerCopy(invoice);
  };

  // Export functions
  const exportToCSV = () => {
    const confirmedInvoices = filteredInvoices.filter(inv => inv.status === 'CONFIRMED');
    if (confirmedInvoices.length === 0) {
      toast({ title: 'No data to export', variant: 'destructive' });
      return;
    }
    
    const headers = ['Invoice', 'Date', 'Customer', 'Store', 'Seller', 'Total', 'Paid', 'Due', 'Status'];
    const rows = confirmedInvoices.map(inv => [
      inv.invoice_number,
      formatDateOnly(inv.created_at),
      getCustomerName(inv.customer_id),
      getStoreName(inv.store_id),
      getSellerName(inv.seller_id),
      inv.total,
      inv.paid,
      inv.due,
      inv.status,
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'CSV exported successfully' });
  };

  const exportToPDF = () => {
    toast({ title: 'PDF export', description: 'Use Print function for PDF export' });
  };

  const isLoading = productsLoading || batchesLoading || invoicesLoading || invoiceLinesLoading || customersLoading || storesLoading || sellersLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Admin Greeting + Clock */}
      <div className="flex justify-end">
        <AdminGreetingClock />
      </div>

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Sales</h1>
          <p className="text-muted-foreground">Manage sales invoices</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Sale
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Sales Invoice</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-4">
              <div className="input-group">
                <Label>Customer *</Label>
                <Select
                  value={formData.customerId}
                  onValueChange={(value) => setFormData({ ...formData, customerId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="input-group">
                <Label>Store *</Label>
                <Select
                  value={formData.storeId}
                  onValueChange={(value) => setFormData({ ...formData, storeId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select store" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {stores.filter(s => s.active).map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.name} ({PAYMENT_TERMS_LABELS[store.payment_terms]})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="input-group">
                <Label>Seller (Sales Representative)</Label>
                <Select
                  value={formData.sellerId}
                  onValueChange={(value) => setFormData({ ...formData, sellerId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select seller" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {activeSellers.map((seller) => (
                      <SelectItem key={seller.id} value={seller.id}>
                        {seller.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Invoice Lines */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Products</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addLine}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Line
                  </Button>
                </div>

                {formData.lines.map((line, index) => {
                  // Filter out already selected products (except current line)
                  const selectedProductIds = formData.lines
                    .filter((_, i) => i !== index)
                    .map((l) => l.productId)
                    .filter(Boolean);
                  const availableProducts = activeProducts.filter(
                    (p) => !selectedProductIds.includes(p.id)
                  );

                  return (
                  <div key={index} className="p-4 rounded-lg bg-muted/50 space-y-3">
                    {/* Row 1: Product, Batch */}
                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-6">
                        <Label className="text-xs mb-1 block">Product</Label>
                        <Select
                          value={line.productId}
                          onValueChange={(value) => updateLine(index, 'productId', value)}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select Product" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover">
                            {availableProducts.map((product) => {
                              const stock = getProductTotalStock(product.id);
                              const noStock = stock === 0;
                              return (
                                <SelectItem 
                                  key={product.id} 
                                  value={product.id}
                                  disabled={noStock}
                                  className={noStock ? 'opacity-50' : ''}
                                >
                                  <div className="flex items-center gap-2">
                                    <span>{product.name}</span>
                                    {noStock && (
                                      <span className="text-xs px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">
                                        No Stock
                                      </span>
                                    )}
                                    {!noStock && (
                                      <span className="text-xs text-muted-foreground">
                                        (Stock: {stock})
                                      </span>
                                    )}
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        {line.productId && hasZeroStock(line.productId) && (
                          <p className="text-xs text-destructive mt-1">
                            ⚠️ No stock available
                          </p>
                        )}
                      </div>
                      <div className="col-span-4">
                        <Label className="text-xs mb-1 block">Batch</Label>
                        <Select
                          value={line.batchId}
                          onValueChange={(value) => updateLine(index, 'batchId', value)}
                          disabled={!line.productId || hasZeroStock(line.productId)}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Batch" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover">
                            {getAvailableBatches(line.productId).map((batch) => (
                              <SelectItem key={batch.id} value={batch.id}>
                                {batch.batch_number} ({batch.quantity})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2 flex items-end justify-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLine(index)}
                          className="h-9 w-9"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Row 2: Quantities, Prices, Discount */}
                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-2">
                        <Label className="text-xs mb-1 block">Paid Qty</Label>
                        <Input
                          type="number"
                          placeholder="1"
                          value={line.paidQuantity}
                          onChange={(e) => updateLine(index, 'paidQuantity', e.target.value)}
                          className="h-9"
                          min="1"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs mb-1 block">Free Qty</Label>
                        <div className="relative">
                          <Input
                            type="number"
                            placeholder="0"
                            value={line.freeQuantity}
                            onChange={(e) => updateLine(index, 'freeQuantity', e.target.value)}
                            className="h-9"
                            min="0"
                          />
                          {parseInt(line.freeQuantity) > 0 && (
                            <Badge variant="secondary" className="absolute -top-2 -right-2 text-[10px] px-1 py-0 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                              FREE
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs mb-1 block">MRP (৳)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="MRP"
                          value={line.unitPrice}
                          onChange={(e) => updateLine(index, 'unitPrice', e.target.value)}
                          className="h-9"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs mb-1 block">TP Rate (৳)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="TP"
                          value={line.tpRate}
                          onChange={(e) => updateLine(index, 'tpRate', e.target.value)}
                          className="h-9"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs mb-1 block">Discount</Label>
                        <div className="flex gap-1">
                          <Select
                            value={line.discountType}
                            onValueChange={(value: 'AMOUNT' | 'PERCENT') => updateLine(index, 'discountType', value)}
                          >
                            <SelectTrigger className="h-9 w-16">
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
                            value={line.discountValue}
                            onChange={(e) => updateLine(index, 'discountValue', e.target.value)}
                            className="h-9 flex-1"
                            min="0"
                          />
                        </div>
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs mb-1 block">Line Total</Label>
                        <div className="h-9 flex items-center px-2 bg-muted rounded-md font-medium text-primary">
                          {formatCurrency(calculateLineTotal(line))}
                        </div>
                      </div>
                    </div>
                  </div>
                  );
                })}

                {formData.lines.length === 0 && (
                  <p className="text-center py-4 text-muted-foreground">
                    Click "Add Line" to add products
                  </p>
                )}
              </div>

              {/* Overall Discount */}
              {formData.lines.length > 0 && (
                <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg border border-dashed">
                  <Label className="font-medium whitespace-nowrap">Overall Discount:</Label>
                  <Select
                    value={formData.overallDiscountType}
                    onValueChange={(value: 'AMOUNT' | 'PERCENT') => setFormData({ ...formData, overallDiscountType: value })}
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
                    onChange={(e) => setFormData({ ...formData, overallDiscountValue: e.target.value })}
                    className="w-32"
                    min="0"
                  />
                </div>
              )}

              {/* Total */}
              <div className="flex justify-end p-4 bg-muted/50 rounded-lg">
                <div className="text-right space-y-1">
                  <p className="text-sm text-muted-foreground">Subtotal: {formatCurrency(formData.lines.reduce((sum, line) => sum + calculateLineTotal(line), 0))}</p>
                  {(parseFloat(formData.overallDiscountValue) || 0) > 0 && (
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                      Overall Discount: -{formData.overallDiscountType === 'PERCENT' ? `${formData.overallDiscountValue}%` : formatCurrency(parseFloat(formData.overallDiscountValue) || 0)}
                    </p>
                  )}
                  <p className="text-2xl font-bold text-primary">{formatCurrency(calculateTotal())}</p>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={(e) => handleSubmit(e as any, true)}
                  disabled={addInvoiceMutation.isPending}
                >
                  {addInvoiceMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Save as Draft
                </Button>
                <Button type="submit" disabled={addInvoiceMutation.isPending || confirmInvoiceMutation.isPending}>
                  {(addInvoiceMutation.isPending || confirmInvoiceMutation.isPending) ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Create Invoice
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Date Range Filter & Totals */}
      <SalesDateFilter
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        totals={{
          totalSales: metrics.totalSales,
          totalPaid: metrics.totalPaid,
          totalDue: metrics.totalDue,
          totalCOGS: metrics.totalCOGS,
          netProfit: metrics.netProfit,
          invoiceCount: filteredInvoices.filter(inv => inv.status === 'CONFIRMED').length,
        }}
        onExportCSV={() => exportToCSV()}
        onExportPDF={() => exportToPDF()}
      />

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by invoice number or customer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Invoices Table */}
      <DataTable
        columns={[
          {
            key: 'invoiceNumber',
            header: 'Invoice',
            render: (inv) => (
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{inv.invoice_number}</span>
              </div>
            ),
          },
          {
            key: 'date',
            header: 'Date',
            render: (inv) => (
              <div className="flex flex-col">
                <span className="font-medium">{formatDateOnly(inv.created_at)}</span>
                <span className="text-xs text-muted-foreground">{formatTimeWithSeconds(inv.created_at)}</span>
              </div>
            ),
          },
          {
            key: 'customer',
            header: 'Customer',
            render: (inv) => getCustomerName(inv.customer_id),
          },
          {
            key: 'store',
            header: 'Store',
            render: (inv) => (
              <span className="text-sm">{getStoreName(inv.store_id)}</span>
            ),
          },
          {
            key: 'totalAmount',
            header: 'Total',
            render: (inv) => <span className="font-medium">{formatCurrency(inv.total)}</span>,
          },
          {
            key: 'paidAmount',
            header: 'Paid',
            render: (inv) => formatCurrency(inv.paid),
          },
          {
            key: 'dueAmount',
            header: 'Due',
            render: (inv) => (
              <span className={inv.due > 0 ? 'badge-warning' : 'badge-success'}>
                {formatCurrency(inv.due)}
              </span>
            ),
          },
          {
            key: 'status',
            header: 'Status',
            render: (inv) => (
              <span className={inv.status === 'CONFIRMED' || inv.status === 'PAID' ? 'badge-success' : inv.status === 'PARTIAL' ? 'badge-warning' : 'badge-warning'}>
                {inv.status}
              </span>
            ),
          },
          {
            key: 'actions',
            header: 'Actions',
            render: (inv) => (
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => setViewInvoice(inv)} title="View Details">
                  <Eye className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => printCustomerCopy(inv)} title="Print Customer Copy">
                  <Printer className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => printOfficeCopy(inv)} title="Print Office Copy">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                </Button>
                {inv.status === 'DRAFT' && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleConfirm(inv.id)}
                    disabled={confirmInvoiceMutation.isPending}
                  >
                    {confirmInvoiceMutation.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
                    Confirm
                  </Button>
                )}
              </div>
            ),
          },
        ]}
        data={filteredInvoices.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())}
        keyExtractor={(inv) => inv.id}
        emptyMessage="No invoices found"
        onRowClick={(inv) => setViewInvoice(inv)}
      />

      {/* View Invoice Dialog */}
      <Dialog open={!!viewInvoice} onOpenChange={() => setViewInvoice(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Invoice {viewInvoice?.invoice_number}</DialogTitle>
          </DialogHeader>
          {viewInvoice && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Customer</p>
                  <p className="font-medium">{getCustomerName(viewInvoice.customer_id)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Store</p>
                  <p className="font-medium">{getStoreName(viewInvoice.store_id)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Seller</p>
                  <p className="font-medium">{getSellerName(viewInvoice.seller_id)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Date & Time</p>
                  <p className="font-medium">{formatDateOnly(viewInvoice.created_at)}</p>
                  <p className="text-xs text-muted-foreground">{formatTimeWithSeconds(viewInvoice.created_at)}</p>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-3 py-2 text-left">Product</th>
                      <th className="px-3 py-2 text-right">MRP</th>
                      <th className="px-3 py-2 text-right">TP Rate</th>
                      <th className="px-3 py-2 text-right">Qty</th>
                      <th className="px-3 py-2 text-right">Free</th>
                      <th className="px-3 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewInvoice.lines.map((line) => {
                      const product = dbProducts.find(p => p.id === line.product_id);
                      return (
                        <tr key={line.id} className="border-t">
                          <td className="px-3 py-2">{getProductName(line.product_id)}</td>
                          <td className="px-3 py-2 text-right text-muted-foreground">{formatCurrency(line.unit_price)}</td>
                          <td className="px-3 py-2 text-right font-medium">{formatCurrency(line.tp_rate || product?.tp_rate || 0)}</td>
                          <td className="px-3 py-2 text-right">{line.quantity}</td>
                          <td className="px-3 py-2 text-right">
                            {line.free_quantity > 0 ? (
                              <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                                {line.free_quantity}
                                <span className="text-xs bg-green-100 dark:bg-green-900/30 px-1 rounded">FREE</span>
                              </span>
                            ) : '-'}
                          </td>
                          <td className="px-3 py-2 text-right font-medium">{formatCurrency(line.total)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="space-y-1 text-right">
                <p className="text-sm text-muted-foreground">Subtotal (TP): <span className="font-medium text-foreground">{formatCurrency(viewInvoice.subtotal)}</span></p>
                <p className="text-sm text-muted-foreground">Discount: <span className="font-medium text-orange-600">-{formatCurrency(viewInvoice.discount)}</span></p>
                <p>Net Payable: <span className="font-medium">{formatCurrency(viewInvoice.total)}</span></p>
                <p>Paid: <span className="font-medium text-success">{formatCurrency(viewInvoice.paid)}</span></p>
                <p className="text-lg">Due: <span className="font-bold text-primary">{formatCurrency(viewInvoice.due)}</span></p>
              </div>

              <div className="flex justify-end gap-2 flex-wrap">
                {viewInvoice.due > 0 && viewInvoice.status !== 'DRAFT' && (
                  <Button variant="default" onClick={() => {
                    setViewInvoice(null);
                    window.location.href = `/payments?invoice=${viewInvoice.invoice_number}`;
                  }}>
                    💰 Receive Payment
                  </Button>
                )}
                <Button variant="outline" onClick={() => printCustomerCopy(viewInvoice)}>
                  <Printer className="w-4 h-4 mr-2" />
                  Customer Copy
                </Button>
                <Button variant="secondary" onClick={() => printOfficeCopy(viewInvoice)}>
                  <Printer className="w-4 h-4 mr-2" />
                  Office Copy
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
