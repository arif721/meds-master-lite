import { useState } from 'react';
import { Plus, Search, FileText, Eye, Trash2, ArrowRight, X, Download, Printer, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/DataTable';
import { useStore } from '@/store/useStore';
import { useCustomers } from '@/hooks/useDatabase';
import { formatCurrency, formatDate, generateId } from '@/lib/format';
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
import { QuotationLine, Quotation } from '@/types';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

export default function Quotations() {
  const navigate = useNavigate();
  const { products, quotations, addQuotation, convertQuotationToInvoice, cancelQuotation } = useStore();
  const { data: customers = [], isLoading: customersLoading } = useCustomers();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewQuotation, setViewQuotation] = useState<typeof quotations[0] | null>(null);

  const [formData, setFormData] = useState({
    customerId: '',
    validDays: '7',
    lines: [] as {
      productId: string;
      quantity: string;
      unitPrice: string;
    }[],
  });

  const activeProducts = products.filter((p) => p.active);

  const filteredQuotations = quotations.filter(
    (q) =>
      q.quotationNumber.toLowerCase().includes(search.toLowerCase()) ||
      customers.find((c) => c.id === q.customerId)?.name.toLowerCase().includes(search.toLowerCase())
  );

  const getCustomerName = (customerId: string) => {
    return customers.find((c) => c.id === customerId)?.name || 'Unknown';
  };

  const getProductName = (productId: string) => {
    return products.find((p) => p.id === productId)?.name || 'Unknown';
  };

  const printQuotation = (quotation: Quotation) => {
    const customer = customers.find((c) => c.id === quotation.customerId);
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Quotation - ${quotation.quotationNumber}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; padding: 20px; background: #1e3a5f; color: white; border-radius: 8px 8px 0 0; }
          .logo { font-size: 20px; font-weight: bold; }
          .logo-sub { font-size: 12px; opacity: 0.8; }
          .quote-info { text-align: right; }
          .quote-info h2 { font-size: 24px; margin-bottom: 5px; }
          .quote-info p { font-size: 12px; opacity: 0.9; }
          .parties { display: flex; justify-content: space-between; padding: 20px; background: #f8f9fa; }
          .party h4 { color: #1e3a5f; font-size: 12px; margin-bottom: 8px; text-transform: uppercase; }
          .party p { font-size: 13px; line-height: 1.5; }
          .items { padding: 20px; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #1e3a5f; color: white; padding: 10px; text-align: left; font-size: 12px; }
          td { padding: 10px; border-bottom: 1px solid #eee; font-size: 13px; }
          tr:nth-child(even) { background: #f9f9f9; }
          .total-row { background: #1e3a5f !important; }
          .total-row td { color: white; font-weight: bold; font-size: 14px; }
          .footer { text-align: center; padding: 20px; background: #e3f2fd; border-radius: 0 0 8px 8px; }
          .footer p { font-size: 11px; color: #666; margin-top: 5px; }
          .validity { padding: 15px 20px; background: #fff3cd; font-size: 12px; color: #856404; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo">Gazi Laboratories Ltd.</div>
            <div class="logo-sub">Pharmaceutical Excellence</div>
          </div>
          <div class="quote-info">
            <h2>QUOTATION</h2>
            <p>${quotation.quotationNumber}</p>
            <p>Date: ${formatDate(quotation.date)}</p>
          </div>
        </div>
        
        <div class="validity">
          <strong>Valid Until:</strong> ${formatDate(quotation.validUntil)} | 
          <strong>Status:</strong> ${quotation.status}
        </div>
        
        <div class="parties">
          <div class="party">
            <h4>From</h4>
            <p><strong>Gazi Laboratories Ltd.</strong></p>
            <p>Mamtaj Center, Islamiahat</p>
            <p>Hathazari, Chattogram</p>
            <p>+880 1987-501700</p>
          </div>
          <div class="party" style="text-align: right;">
            <h4>To</h4>
            <p><strong>${customer?.name || 'Unknown'}</strong></p>
            <p>${customer?.phone || ''}</p>
            <p>${customer?.address || ''}</p>
          </div>
        </div>
        
        <div class="items">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Product</th>
                <th style="text-align: center;">Quantity</th>
                <th style="text-align: right;">Unit Price</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${quotation.lines.map((line, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${products.find(p => p.id === line.productId)?.name || 'Unknown'}</td>
                  <td style="text-align: center;">${line.quantity}</td>
                  <td style="text-align: right;">৳${line.unitPrice.toFixed(2)}</td>
                  <td style="text-align: right;">৳${line.lineTotal.toFixed(2)}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="4" style="text-align: right;">Total Amount:</td>
                <td style="text-align: right;">৳${quotation.totalAmount.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div class="footer">
          <p><strong>Thank you for your interest!</strong></p>
          <p>This quotation is valid until ${formatDate(quotation.validUntil)}. Contact us to place your order.</p>
          <p style="margin-top: 10px;">Email: gazilaboratories58@gmail.com | www.gazilaboratories.com</p>
        </div>
        
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const exportToCSV = () => {
    const headers = ['Quotation #', 'Date', 'Valid Until', 'Customer', 'Products', 'Total Amount', 'Status'];
    const rows = filteredQuotations.map((q) => [
      q.quotationNumber,
      formatDate(q.date),
      formatDate(q.validUntil),
      getCustomerName(q.customerId),
      q.lines.map(l => getProductName(l.productId)).join('; '),
      q.totalAmount.toFixed(2),
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
        { productId: '', quantity: '', unitPrice: '' },
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

    // Auto-set unit price when product is selected
    if (field === 'productId') {
      const product = products.find((p) => p.id === value);
      if (product) {
        newLines[index].unitPrice = product.salesPrice.toString();
      }
    }

    setFormData({ ...formData, lines: newLines });
  };

  const calculateTotal = () => {
    return formData.lines.reduce((sum, line) => {
      const qty = parseInt(line.quantity) || 0;
      const price = parseFloat(line.unitPrice) || 0;
      return sum + qty * price;
    }, 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
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

    if (formData.lines.length === 0) {
      toast({
        title: 'No Products',
        description: 'Please add at least one product',
        variant: 'destructive',
      });
      return;
    }

    // Validate each line has product and quantity >= 1
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

    const quotationLines: QuotationLine[] = formData.lines.map((line) => ({
      id: generateId(),
      quotationId: '',
      productId: line.productId,
      quantity: parseInt(line.quantity) || 0,
      unitPrice: parseFloat(line.unitPrice) || 0,
      lineTotal: (parseInt(line.quantity) || 0) * (parseFloat(line.unitPrice) || 0),
    }));

    addQuotation({
      date: new Date(),
      validUntil,
      customerId: formData.customerId,
      totalAmount: calculateTotal(),
      status: 'PENDING',
      lines: quotationLines,
    });

    toast({
      title: 'Quotation Created',
      description: 'Quotation has been created successfully',
    });

    resetForm();
    setDialogOpen(false);
  };

  const handleConvert = (quotationId: string) => {
    const invoiceId = convertQuotationToInvoice(quotationId);
    if (invoiceId) {
      toast({
        title: 'Converted to Invoice',
        description: 'Quotation has been converted to a draft invoice. Please select batches and confirm.',
      });
      navigate('/sales');
    }
  };

  const handleCancel = (quotationId: string) => {
    if (confirm('Are you sure you want to cancel this quotation?')) {
      cancelQuotation(quotationId);
      toast({
        title: 'Quotation Cancelled',
        description: 'Quotation has been cancelled',
      });
    }
  };

  const resetForm = () => {
    setFormData({ customerId: '', validDays: '7', lines: [] });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'badge-info';
      case 'CONVERTED':
        return 'badge-success';
      case 'CANCELLED':
        return 'badge-danger';
      default:
        return 'badge-info';
    }
  };

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
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Quotation</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
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
                    <Label>Valid For (days)</Label>
                    <Input
                      type="number"
                      value={formData.validDays}
                      onChange={(e) => setFormData({ ...formData, validDays: e.target.value })}
                      placeholder="7"
                    />
                  </div>
                </div>

                {/* Quotation Lines */}
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
                    <div key={index} className="grid grid-cols-12 gap-2 p-3 bg-muted/50 rounded-lg">
                      <div className="col-span-5">
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
                      <div className="col-span-3">
                        <Input
                          type="number"
                          placeholder="Qty"
                          value={line.quantity}
                          onChange={(e) => updateLine(index, 'quantity', e.target.value)}
                          className="h-9"
                        />
                      </div>
                      <div className="col-span-3">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Price"
                          value={line.unitPrice}
                          onChange={(e) => updateLine(index, 'unitPrice', e.target.value)}
                          className="h-9"
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

                {/* Total */}
                <div className="flex justify-end p-4 bg-muted/50 rounded-lg">
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total Amount</p>
                    <p className="text-2xl font-bold text-primary">{formatCurrency(calculateTotal())}</p>
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
                <span className="font-medium">{q.quotationNumber}</span>
              </div>
            ),
          },
          {
            key: 'date',
            header: 'Date',
            render: (q) => formatDate(q.date),
          },
          {
            key: 'validUntil',
            header: 'Valid Until',
            render: (q) => formatDate(q.validUntil),
          },
          {
            key: 'customer',
            header: 'Customer',
            render: (q) => getCustomerName(q.customerId),
          },
          {
            key: 'totalAmount',
            header: 'Total',
            render: (q) => <span className="font-medium">{formatCurrency(q.totalAmount)}</span>,
          },
          {
            key: 'status',
            header: 'Status',
            render: (q) => (
              <span className={getStatusBadge(q.status)}>{q.status}</span>
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
                {q.status === 'PENDING' && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => handleConvert(q.id)}>
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
        data={filteredQuotations.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())}
        keyExtractor={(q) => q.id}
        emptyMessage="No quotations found"
      />

      {/* View Quotation Dialog */}
      <Dialog open={!!viewQuotation} onOpenChange={() => setViewQuotation(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Quotation {viewQuotation?.quotationNumber}</DialogTitle>
          </DialogHeader>
          {viewQuotation && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Customer</p>
                  <p className="font-medium">{getCustomerName(viewQuotation.customerId)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Valid Until</p>
                  <p className="font-medium">{formatDate(viewQuotation.validUntil)}</p>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-3 py-2 text-left">Product</th>
                      <th className="px-3 py-2 text-right">Qty</th>
                      <th className="px-3 py-2 text-right">Price</th>
                      <th className="px-3 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewQuotation.lines.map((line) => (
                      <tr key={line.id} className="border-t">
                        <td className="px-3 py-2">{getProductName(line.productId)}</td>
                        <td className="px-3 py-2 text-right">{line.quantity}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(line.unitPrice)}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(line.lineTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="text-right">
                <p className="text-lg">Total: <span className="font-bold text-primary">{formatCurrency(viewQuotation.totalAmount)}</span></p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
