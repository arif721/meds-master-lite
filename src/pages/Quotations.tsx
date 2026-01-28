import { useState, useMemo } from 'react';
import { Plus, Search, FileText, Eye, Trash2, ArrowRight, X, Download, Printer, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/DataTable';
import { useCustomers, useSellers, useProducts, DbSeller, useAddInvoice, useConfirmInvoice, useBatches } from '@/hooks/useDatabase';
import { useStores, PAYMENT_TERMS_LABELS, DbStore } from '@/hooks/useStores';
import { useSignatures, DbSignature } from '@/hooks/useSignatures';
import { formatCurrency, formatDate, generateId, formatDateOnly, isExpired, generateInvoiceNumber } from '@/lib/format';
import { openQuotationWindow } from '@/lib/quotation';
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
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Database types for quotations
type DbQuotation = {
  id: string;
  quotation_number: string;
  customer_id: string;
  seller_id: string | null;
  store_id: string | null;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CONVERTED';
  subtotal: number;
  discount: number;
  discount_type: 'AMOUNT' | 'PERCENT';
  total: number;
  valid_until: string | null;
  notes: string | null;
  created_at: string;
};

type DbQuotationLine = {
  id: string;
  quotation_id: string;
  product_id: string;
  quantity: number;
  mrp: number;
  tp_rate: number;
  unit_price: number;
  discount_type: 'AMOUNT' | 'PERCENT';
  discount_value: number;
  total: number;
};

// Hooks for quotations
function useQuotations() {
  return useQuery({
    queryKey: ['quotations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotations')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as DbQuotation[];
    },
  });
}

function useQuotationLines() {
  return useQuery({
    queryKey: ['quotation_lines'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotation_lines')
        .select('*');
      if (error) throw error;
      return data as DbQuotationLine[];
    },
  });
}

function generateQuotationNumber() {
  const date = new Date();
  const y = date.getFullYear().toString().slice(-2);
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `QT-${y}${m}${d}-${rand}`;
}

export default function Quotations() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Database hooks
  const { data: dbProducts = [], isLoading: productsLoading } = useProducts();
  const { data: customers = [], isLoading: customersLoading } = useCustomers();
  const { data: sellers = [] } = useSellers();
  const { data: stores = [] } = useStores();
  const { data: dbBatches = [] } = useBatches();
  const { data: quotations = [], isLoading: quotationsLoading } = useQuotations();
  const { data: quotationLines = [] } = useQuotationLines();
  const { data: signatures = [] } = useSignatures();
  
  // Invoice mutations for conversion
  const addInvoiceMutation = useAddInvoice();
  const confirmInvoiceMutation = useConfirmInvoice();

  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewQuotation, setViewQuotation] = useState<(DbQuotation & { lines: DbQuotationLine[] }) | null>(null);

  // Form state - advanced like Sales form
  const [formData, setFormData] = useState({
    customerId: '',
    sellerId: '',
    storeId: '',
    validDays: '7',
    overallDiscountType: 'AMOUNT' as 'AMOUNT' | 'PERCENT',
    overallDiscountValue: '',
    lines: [] as {
      productId: string;
      quantity: string;
      freeQuantity: string;
      mrp: string;
      tpRate: string;
      discountType: 'AMOUNT' | 'PERCENT';
      discountValue: string;
    }[],
  });

  const activeProducts = dbProducts.filter((p) => p.active);
  const activeSellers = sellers.filter((s: DbSeller) => s.active);

  // Combine quotations with their lines
  const quotationsWithLines = useMemo(() => {
    return quotations.map(q => ({
      ...q,
      lines: quotationLines.filter(line => line.quotation_id === q.id)
    }));
  }, [quotations, quotationLines]);

  const filteredQuotations = quotationsWithLines.filter(
    (q) =>
      q.quotation_number.toLowerCase().includes(search.toLowerCase()) ||
      customers.find((c) => c.id === q.customer_id)?.name.toLowerCase().includes(search.toLowerCase())
  );

  const getCustomerName = (customerId: string) => {
    return customers.find((c) => c.id === customerId)?.name || 'Unknown';
  };

  const getProductName = (productId: string) => {
    return dbProducts.find((p) => p.id === productId)?.name || 'Unknown';
  };

  const getSellerName = (sellerId: string | null) => {
    if (!sellerId) return 'N/A';
    return sellers.find((s) => s.id === sellerId)?.name || 'N/A';
  };

  const getStoreName = (storeId: string | null) => {
    if (!storeId) return 'N/A';
    return stores.find((s) => s.id === storeId)?.name || 'N/A';
  };

  // Get available batches (with stock > 0 and not expired)
  const getAvailableBatches = (productId: string) => {
    return dbBatches.filter(
      (b) => b.product_id === productId && b.quantity > 0 && (!b.expiry_date || !isExpired(new Date(b.expiry_date)))
    ).sort((a, b) => {
      if (!a.expiry_date && !b.expiry_date) return 0;
      if (!a.expiry_date) return 1;
      if (!b.expiry_date) return -1;
      return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
    });
  };

  const printQuotation = (quotation: DbQuotation & { lines: DbQuotationLine[] }) => {
    const customer = customers.find((c) => c.id === quotation.customer_id);
    const seller = quotation.seller_id ? sellers.find((s) => s.id === quotation.seller_id) : null;
    const store = quotation.store_id ? stores.find((s) => s.id === quotation.store_id) : null;
    
    // Find signatures for this seller
    const getDefaultSignature = (sellerId: string | null, signatureType: 'prepared_by' | 'representative'): string | undefined => {
      if (sellerId) {
        const sellerDefault = signatures.find(
          (s: DbSignature) => s.seller_id === sellerId && s.signature_type === signatureType && s.is_default
        );
        if (sellerDefault) return sellerDefault.image_url;
      }
      const globalDefault = signatures.find(
        (s: DbSignature) => !s.seller_id && s.signature_type === signatureType && s.is_default
      );
      return globalDefault?.image_url;
    };
    
    const preparedBySignatureUrl = getDefaultSignature(quotation.seller_id, 'prepared_by');
    const representativeSignatureUrl = getDefaultSignature(quotation.seller_id, 'representative');
    
    const lineData = quotation.lines.map(line => {
      const product = dbProducts.find(p => p.id === line.product_id);
      return {
        id: line.id,
        productName: product?.name || 'Unknown',
        quantity: line.quantity,
        freeQuantity: 0,
        unitPrice: line.mrp,
        tpRate: line.tp_rate,
        discountType: line.discount_type,
        discountValue: line.discount_value,
        lineTotal: line.total,
      };
    });

    openQuotationWindow({
      quotationNumber: quotation.quotation_number,
      date: new Date(quotation.created_at),
      validUntil: quotation.valid_until ? new Date(quotation.valid_until) : new Date(),
      status: quotation.status,
      customerName: customer?.name || 'Unknown',
      customerAddress: customer?.address || undefined,
      customerPhone: customer?.phone || undefined,
      sellerName: seller?.name,
      sellerDesignation: seller?.designation || undefined,
      sellerPhone: seller?.phone || undefined,
      storeName: store?.name,
      lines: lineData,
      subtotal: quotation.subtotal,
      discount: quotation.discount,
      discountType: quotation.discount_type,
      total: quotation.total,
      preparedBySignatureUrl,
      representativeSignatureUrl,
    });
  };

  const exportToCSV = () => {
    const headers = ['Quotation #', 'Date', 'Valid Until', 'Customer', 'Store', 'Seller', 'Total Amount', 'Status'];
    const rows = filteredQuotations.map((q) => [
      q.quotation_number,
      formatDate(q.created_at),
      q.valid_until ? formatDate(q.valid_until) : 'N/A',
      getCustomerName(q.customer_id),
      getStoreName(q.store_id),
      getSellerName(q.seller_id),
      q.total.toFixed(2),
      q.status,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quotations-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Downloaded',
      description: `Exported ${filteredQuotations.length} quotations`,
    });
  };

  const addLine = () => {
    setFormData({
      ...formData,
      lines: [
        ...formData.lines,
        { 
          productId: '', 
          quantity: '', 
          freeQuantity: '0',
          mrp: '', 
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

    // Auto-set MRP and TP Rate when product is selected
    if (field === 'productId') {
      const product = dbProducts.find((p) => p.id === value);
      if (product) {
        newLines[index].mrp = product.sales_price.toString();
        newLines[index].tpRate = (product.tp_rate || product.cost_price).toString();
      }
    }

    setFormData({ ...formData, lines: newLines });
  };

  // Calculate line total with discount (based on TP Rate)
  const calculateLineTotal = (line: typeof formData.lines[0]) => {
    const qty = parseInt(line.quantity) || 0;
    const tpRate = parseFloat(line.tpRate) || 0;
    const subtotal = qty * tpRate;
    const discountValue = parseFloat(line.discountValue) || 0;
    
    if (line.discountType === 'PERCENT') {
      return subtotal - (subtotal * discountValue / 100);
    }
    return subtotal - discountValue;
  };

  const calculateSubtotal = () => {
    return formData.lines.reduce((sum, line) => sum + calculateLineTotal(line), 0);
  };

  const calculateTotal = () => {
    let subtotal = calculateSubtotal();
    const overallDiscount = parseFloat(formData.overallDiscountValue) || 0;
    
    if (formData.overallDiscountType === 'PERCENT') {
      subtotal = subtotal - (subtotal * overallDiscount / 100);
    } else {
      subtotal = subtotal - overallDiscount;
    }
    
    return Math.max(0, subtotal);
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

    for (const line of formData.lines) {
      if (!line.productId) {
        toast({
          title: 'Product Required',
          description: 'Please select a product for all lines',
          variant: 'destructive',
        });
        return;
      }
      const qty = parseInt(line.quantity) || 0;
      if (qty < 1) {
        toast({
          title: 'Invalid Quantity',
          description: 'Quantity must be at least 1 for all products',
          variant: 'destructive',
        });
        return;
      }
    }

    const validDays = parseInt(formData.validDays) || 7;
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + validDays);

    const quotationNumber = generateQuotationNumber();
    const subtotal = calculateSubtotal();
    const overallDiscountValue = parseFloat(formData.overallDiscountValue) || 0;
    let overallDiscountAmount = 0;
    if (formData.overallDiscountType === 'PERCENT') {
      overallDiscountAmount = subtotal * overallDiscountValue / 100;
    } else {
      overallDiscountAmount = overallDiscountValue;
    }

    try {
      // Create quotation
      const { data: newQuotation, error: quotationError } = await supabase
        .from('quotations')
        .insert({
          quotation_number: quotationNumber,
          customer_id: formData.customerId,
          seller_id: formData.sellerId || null,
          store_id: formData.storeId,
          status: 'DRAFT',
          subtotal: subtotal,
          discount: overallDiscountAmount,
          discount_type: formData.overallDiscountType,
          total: calculateTotal(),
          valid_until: validUntil.toISOString().split('T')[0],
          notes: null,
        })
        .select()
        .single();

      if (quotationError) throw quotationError;

      // Create quotation lines
      const lines = formData.lines.map(line => ({
        quotation_id: newQuotation.id,
        product_id: line.productId,
        quantity: parseInt(line.quantity) || 0,
        mrp: parseFloat(line.mrp) || 0,
        tp_rate: parseFloat(line.tpRate) || 0,
        unit_price: parseFloat(line.tpRate) || 0,
        discount_type: line.discountType,
        discount_value: parseFloat(line.discountValue) || 0,
        total: calculateLineTotal(line),
      }));

      const { error: linesError } = await supabase
        .from('quotation_lines')
        .insert(lines);

      if (linesError) throw linesError;

      toast({
        title: 'Quotation Created',
        description: `Quotation ${quotationNumber} has been created successfully`,
      });

      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      queryClient.invalidateQueries({ queryKey: ['quotation_lines'] });

      resetForm();
      setDialogOpen(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create quotation',
        variant: 'destructive',
      });
    }
  };

  const handleConvert = async (quotation: DbQuotation & { lines: DbQuotationLine[] }) => {
    // Check stock availability for conversion
    for (const line of quotation.lines) {
      const availableBatches = getAvailableBatches(line.product_id);
      const totalAvailable = availableBatches.reduce((sum, b) => sum + b.quantity, 0);
      
      if (totalAvailable < line.quantity) {
        toast({
          title: 'Insufficient Stock',
          description: `Not enough stock for ${getProductName(line.product_id)}. Available: ${totalAvailable}, Required: ${line.quantity}`,
          variant: 'destructive',
        });
        return;
      }
    }

    try {
      const invoiceNumber = generateInvoiceNumber();
      
      // Prepare invoice lines with batch selection (FIFO)
      const invoiceLines = quotation.lines.map(line => {
        const availableBatches = getAvailableBatches(line.product_id);
        const firstBatch = availableBatches[0];
        const product = dbProducts.find(p => p.id === line.product_id);
        
        return {
          product_id: line.product_id,
          batch_id: firstBatch?.id || null,
          quantity: line.quantity,
          free_quantity: 0,
          unit_price: line.mrp,
          total: line.total,
          cost_price: product?.cost_price || 0,
          tp_rate: line.tp_rate,
          discount_type: line.discount_type,
          discount_value: line.discount_value,
          returned_quantity: 0,
        };
      });

      // Create invoice
      const createdInvoice = await addInvoiceMutation.mutateAsync({
        invoice: {
          invoice_number: invoiceNumber,
          customer_id: quotation.customer_id,
          seller_id: quotation.seller_id,
          store_id: quotation.store_id,
          status: 'DRAFT',
          subtotal: quotation.subtotal,
          discount: quotation.discount,
          total: quotation.total,
          paid: 0,
          due: quotation.total,
          notes: `Converted from ${quotation.quotation_number}`,
        },
        lines: invoiceLines,
      });

      // Update quotation status to CONVERTED
      await supabase
        .from('quotations')
        .update({ status: 'CONVERTED' })
        .eq('id', quotation.id);

      queryClient.invalidateQueries({ queryKey: ['quotations'] });

      toast({
        title: 'Converted to Invoice',
        description: `Quotation converted to Invoice ${invoiceNumber}. Please review and confirm to deduct stock.`,
      });
      
      navigate('/sales');
    } catch (error: any) {
      toast({
        title: 'Conversion Failed',
        description: error.message || 'Failed to convert quotation to invoice',
        variant: 'destructive',
      });
    }
  };

  const handleCancel = async (quotationId: string) => {
    if (confirm('Are you sure you want to cancel this quotation?')) {
      try {
        await supabase
          .from('quotations')
          .update({ status: 'REJECTED' })
          .eq('id', quotationId);

        queryClient.invalidateQueries({ queryKey: ['quotations'] });

        toast({
          title: 'Quotation Cancelled',
          description: 'Quotation has been cancelled',
        });
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to cancel quotation',
          variant: 'destructive',
        });
      }
    }
  };

  const resetForm = () => {
    setFormData({ 
      customerId: '', 
      sellerId: '',
      storeId: '',
      validDays: '7', 
      overallDiscountType: 'AMOUNT',
      overallDiscountValue: '',
      lines: [] 
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'secondary';
      case 'SENT':
        return 'outline';
      case 'ACCEPTED':
        return 'default';
      case 'CONVERTED':
        return 'default';
      case 'REJECTED':
      case 'EXPIRED':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const isLoading = productsLoading || customersLoading || quotationsLoading;

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
          <h1 className="page-title">Quotations</h1>
          <p className="text-muted-foreground">Create and manage quotations</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportToCSV} disabled={filteredQuotations.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Quotation
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Quotation</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Customer, Store, Seller Row */}
                <div className="grid grid-cols-3 gap-4">
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
                        {stores.filter((s: DbStore) => s.active).map((store: DbStore) => (
                          <SelectItem key={store.id} value={store.id}>
                            {store.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="input-group">
                    <Label>Seller (Optional)</Label>
                    <Select
                      value={formData.sellerId}
                      onValueChange={(value) => setFormData({ ...formData, sellerId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select seller" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        {activeSellers.map((seller: DbSeller) => (
                          <SelectItem key={seller.id} value={seller.id}>
                            {seller.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="input-group max-w-xs">
                  <Label>Valid For (days)</Label>
                  <Input
                    type="number"
                    value={formData.validDays}
                    onChange={(e) => setFormData({ ...formData, validDays: e.target.value })}
                    placeholder="7"
                  />
                </div>

                {/* Quotation Lines */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Products</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addLine}>
                      <Plus className="w-4 h-4 mr-1" />
                      Add Line
                    </Button>
                  </div>

                  {/* Header Row */}
                  {formData.lines.length > 0 && (
                    <div className="grid grid-cols-12 gap-2 px-3 text-xs font-medium text-muted-foreground">
                      <div className="col-span-3">Product</div>
                      <div className="col-span-1">Qty</div>
                      <div className="col-span-1">Free</div>
                      <div className="col-span-2">MRP</div>
                      <div className="col-span-2">TP Rate</div>
                      <div className="col-span-2">Discount</div>
                      <div className="col-span-1"></div>
                    </div>
                  )}

                  {formData.lines.map((line, index) => {
                    const selectedProductIds = formData.lines
                      .filter((_, i) => i !== index)
                      .map((l) => l.productId)
                      .filter(Boolean);
                    const availableProducts = activeProducts.filter(
                      (p) => !selectedProductIds.includes(p.id)
                    );

                    return (
                      <div key={index} className="grid grid-cols-12 gap-2 p-3 bg-muted/50 rounded-lg items-center">
                        <div className="col-span-3">
                          <Select
                            value={line.productId}
                            onValueChange={(value) => updateLine(index, 'productId', value)}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Product" />
                            </SelectTrigger>
                            <SelectContent className="bg-popover">
                              {availableProducts.map((product) => (
                                <SelectItem key={product.id} value={product.id}>
                                  {product.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-1">
                          <Input
                            type="number"
                            placeholder="Qty"
                            value={line.quantity}
                            onChange={(e) => updateLine(index, 'quantity', e.target.value)}
                            className="h-9"
                          />
                        </div>
                        <div className="col-span-1">
                          <Input
                            type="number"
                            placeholder="Free"
                            value={line.freeQuantity}
                            onChange={(e) => updateLine(index, 'freeQuantity', e.target.value)}
                            className="h-9"
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="MRP"
                            value={line.mrp}
                            onChange={(e) => updateLine(index, 'mrp', e.target.value)}
                            className="h-9"
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="TP Rate"
                            value={line.tpRate}
                            onChange={(e) => updateLine(index, 'tpRate', e.target.value)}
                            className="h-9"
                          />
                        </div>
                        <div className="col-span-2 flex gap-1">
                          <Select
                            value={line.discountType}
                            onValueChange={(value) => updateLine(index, 'discountType', value)}
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
                          />
                        </div>
                        <div className="col-span-1 flex items-center justify-center">
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
                    );
                  })}

                  {formData.lines.length === 0 && (
                    <p className="text-center py-4 text-muted-foreground">
                      Click "Add Line" to add products
                    </p>
                  )}
                </div>

                {/* Overall Discount */}
                <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
                  <Label className="whitespace-nowrap">Overall Discount:</Label>
                  <Select
                    value={formData.overallDiscountType}
                    onValueChange={(value) => setFormData({ ...formData, overallDiscountType: value as 'AMOUNT' | 'PERCENT' })}
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
                  />
                </div>

                {/* Totals */}
                <div className="flex justify-end p-4 bg-muted/50 rounded-lg">
                  <div className="text-right space-y-1">
                    <div className="flex justify-between gap-8 text-sm">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span>{formatCurrency(calculateSubtotal())}</span>
                    </div>
                    {parseFloat(formData.overallDiscountValue) > 0 && (
                      <div className="flex justify-between gap-8 text-sm text-destructive">
                        <span>Discount:</span>
                        <span>-{formatCurrency(calculateSubtotal() - calculateTotal())}</span>
                      </div>
                    )}
                    <div className="flex justify-between gap-8 pt-2 border-t">
                      <span className="font-medium">Total Amount:</span>
                      <span className="text-2xl font-bold text-primary">{formatCurrency(calculateTotal())}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                    Cancel
                  </Button>
                  <Button type="submit">Create Quotation</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search quotations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Quotations Table */}
      <DataTable
        columns={[
          {
            key: 'quotationNumber',
            header: 'Quotation',
            render: (q) => (
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{q.quotation_number}</span>
              </div>
            ),
          },
          {
            key: 'date',
            header: 'Date',
            render: (q) => formatDateOnly(q.created_at),
          },
          {
            key: 'validUntil',
            header: 'Valid Until',
            render: (q) => q.valid_until ? formatDateOnly(q.valid_until) : 'N/A',
          },
          {
            key: 'customer',
            header: 'Customer',
            render: (q) => getCustomerName(q.customer_id),
          },
          {
            key: 'store',
            header: 'Store',
            render: (q) => getStoreName(q.store_id),
          },
          {
            key: 'totalAmount',
            header: 'Total',
            render: (q) => <span className="font-medium">{formatCurrency(q.total)}</span>,
          },
          {
            key: 'status',
            header: 'Status',
            render: (q) => (
              <Badge variant={getStatusBadge(q.status)}>{q.status}</Badge>
            ),
          },
          {
            key: 'actions',
            header: 'Actions',
            render: (q) => (
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => setViewQuotation(q)} title="View">
                  <Eye className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => printQuotation(q)} title="Print">
                  <Printer className="w-4 h-4" />
                </Button>
                {(q.status === 'DRAFT' || q.status === 'SENT' || q.status === 'ACCEPTED') && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => handleConvert(q)}>
                      <ArrowRight className="w-4 h-4 mr-1" />
                      To Invoice
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleCancel(q.id)}>
                      <X className="w-4 h-4 text-destructive" />
                    </Button>
                  </>
                )}
              </div>
            ),
          },
        ]}
        data={filteredQuotations.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())}
        keyExtractor={(q) => q.id}
        emptyMessage="No quotations found"
        onRowClick={(q) => setViewQuotation(q)}
      />

      {/* View Quotation Dialog */}
      <Dialog open={!!viewQuotation} onOpenChange={() => setViewQuotation(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Quotation {viewQuotation?.quotation_number}</DialogTitle>
          </DialogHeader>
          {viewQuotation && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Customer</p>
                  <p className="font-medium">{getCustomerName(viewQuotation.customer_id)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Store</p>
                  <p className="font-medium">{getStoreName(viewQuotation.store_id)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Valid Until</p>
                  <p className="font-medium">{viewQuotation.valid_until ? formatDate(viewQuotation.valid_until) : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge variant={getStatusBadge(viewQuotation.status)}>{viewQuotation.status}</Badge>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-3 py-2 text-left">Product</th>
                      <th className="px-3 py-2 text-right">Qty</th>
                      <th className="px-3 py-2 text-right">TP Rate</th>
                      <th className="px-3 py-2 text-right">MRP</th>
                      <th className="px-3 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewQuotation.lines.map((line) => (
                      <tr key={line.id} className="border-t">
                        <td className="px-3 py-2">{getProductName(line.product_id)}</td>
                        <td className="px-3 py-2 text-right">{line.quantity}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(line.tp_rate)}</td>
                        <td className="px-3 py-2 text-right text-muted-foreground">{formatCurrency(line.mrp)}</td>
                        <td className="px-3 py-2 text-right font-medium">{formatCurrency(line.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-1 text-right">
                <p className="text-sm">Subtotal: <span className="font-medium">{formatCurrency(viewQuotation.subtotal)}</span></p>
                {viewQuotation.discount > 0 && (
                  <p className="text-sm text-destructive">Discount: -{formatCurrency(viewQuotation.discount)}</p>
                )}
                <p className="text-lg border-t pt-2">Total: <span className="font-bold text-primary">{formatCurrency(viewQuotation.total)}</span></p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
