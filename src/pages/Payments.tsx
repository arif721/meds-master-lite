import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, CreditCard, Wallet, Smartphone, FileText, Printer, Loader2, Trash2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/DataTable';
import { useInvoices, usePayments, useAddPayment, useCustomers, DbPayment, DbInvoice } from '@/hooks/useDatabase';
import { useStores } from '@/hooks/useStores';
import { useSoftDelete, useRestore, usePermanentDelete } from '@/hooks/useSoftDelete';
import { formatCurrency, formatDate, formatDateOnly, formatTimeWithSeconds } from '@/lib/format';
import { openReceiptWindow } from '@/lib/receipt';
import { TrashToggle } from '@/components/TrashToggle';
import { SoftDeleteDialog, RestoreDialog, PermanentDeleteDialog } from '@/components/DeleteConfirmDialogs';
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
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';

type PaymentMethod = 'CASH' | 'BANK' | 'BKASH' | 'NAGAD' | 'CHECK' | 'OTHER';

type PaymentWithInfo = DbPayment & {
  invoice?: DbInvoice;
  customer?: { id: string; name: string };
  store?: { id: string; name: string };
  is_deleted?: boolean;
  deleted_at?: string | null;
  deleted_by?: string | null;
};

const paymentMethods: { value: PaymentMethod; label: string; icon: typeof CreditCard }[] = [
  { value: 'CASH', label: 'Cash', icon: Wallet },
  { value: 'BANK', label: 'Bank Transfer', icon: CreditCard },
  { value: 'BKASH', label: 'bKash', icon: Smartphone },
  { value: 'NAGAD', label: 'Nagad', icon: Smartphone },
  { value: 'CHECK', label: 'Check', icon: FileText },
  { value: 'OTHER', label: 'Other', icon: Wallet },
];

export default function Payments() {
  // URL params for pre-selecting invoice
  const [searchParams, setSearchParams] = useSearchParams();
  const invoiceFromUrl = searchParams.get('invoice');

  // Database hooks
  const { data: dbInvoices = [], isLoading: invoicesLoading } = useInvoices();
  const { data: dbPayments = [], isLoading: paymentsLoading } = usePayments();
  const { data: customers = [], isLoading: customersLoading } = useCustomers();
  const { data: stores = [], isLoading: storesLoading } = useStores();
  
  const addPaymentMutation = useAddPayment();
  
  // Soft delete hooks
  const softDeleteMutation = useSoftDelete('payments');
  const restoreMutation = useRestore('payments');
  const permanentDeleteMutation = usePermanentDelete('payments');
  
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  
  // Delete dialog states
  const [softDeleteTarget, setSoftDeleteTarget] = useState<PaymentWithInfo | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<PaymentWithInfo | null>(null);
  const [permanentDeleteTarget, setPermanentDeleteTarget] = useState<PaymentWithInfo | null>(null);

  const [formData, setFormData] = useState({
    invoiceId: '',
    amount: '',
    paymentMethod: 'CASH' as PaymentMethod,
    referenceNote: '',
  });

  // Only show invoices with due amount (CONFIRMED, PARTIAL, or DRAFT with due > 0)
  const unpaidInvoices = useMemo(() => {
    return dbInvoices.filter(
      (inv) => (inv.status === 'CONFIRMED' || inv.status === 'PARTIAL' || inv.status === 'DRAFT') && inv.due > 0
    );
  }, [dbInvoices]);

  // Auto-open dialog and pre-select invoice from URL
  useEffect(() => {
    if (invoiceFromUrl && unpaidInvoices.length > 0 && !invoicesLoading) {
      const matchingInvoice = unpaidInvoices.find(
        inv => inv.invoice_number.toLowerCase() === invoiceFromUrl.toLowerCase()
      );
      if (matchingInvoice) {
        setFormData(prev => ({ ...prev, invoiceId: matchingInvoice.id }));
        setDialogOpen(true);
        // Clear URL param
        setSearchParams({});
      }
    }
  }, [invoiceFromUrl, unpaidInvoices, invoicesLoading, setSearchParams]);

  // Enrich payments with invoice and customer info for display
  const enrichedPayments = useMemo((): PaymentWithInfo[] => {
    return dbPayments.map(payment => {
      const invoice = dbInvoices.find(inv => inv.id === payment.invoice_id);
      const customer = invoice ? customers.find(c => c.id === invoice.customer_id) : null;
      const store = invoice?.store_id ? stores.find(s => s.id === invoice.store_id) : null;
      return {
        ...payment,
        invoice,
        customer: customer ? { id: customer.id, name: customer.name } : undefined,
        store: store ? { id: store.id, name: store.name } : undefined,
      };
    });
  }, [dbPayments, dbInvoices, customers, stores]);

  // Separate active and deleted payments
  const activePayments = useMemo(() => 
    enrichedPayments.filter(p => !(p as any).is_deleted), 
    [enrichedPayments]
  );
  
  const deletedPayments = useMemo(() => 
    enrichedPayments.filter(p => (p as any).is_deleted), 
    [enrichedPayments]
  );

  const filteredPayments = useMemo(() => {
    const paymentsToFilter = showDeleted ? deletedPayments : activePayments;
    return paymentsToFilter.filter((payment) => {
      return (
        payment.invoice?.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
        payment.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
        payment.store?.name?.toLowerCase().includes(search.toLowerCase())
      );
    });
  }, [activePayments, deletedPayments, search, showDeleted]);

  const getInvoiceLabel = (invoice: DbInvoice | undefined) => {
    if (!invoice) return 'Unknown';
    const customer = customers.find(c => c.id === invoice.customer_id);
    return `${invoice.invoice_number} - ${customer?.name || 'Unknown'} (Due: ${formatCurrency(invoice.due)})`;
  };

  const getSelectedInvoice = () => {
    return dbInvoices.find((inv) => inv.id === formData.invoiceId);
  };

  // Handle soft delete
  const handleSoftDelete = (payment: PaymentWithInfo) => {
    softDeleteMutation.mutate(
      { id: payment.id, name: `Payment ৳${payment.amount} for ${payment.invoice?.invoice_number || 'Unknown'}` },
      { onSuccess: () => setSoftDeleteTarget(null) }
    );
  };
  
  // Handle restore
  const handleRestore = (payment: PaymentWithInfo) => {
    restoreMutation.mutate(
      { id: payment.id, name: `Payment ৳${payment.amount}` },
      { onSuccess: () => setRestoreTarget(null) }
    );
  };
  
  // Handle permanent delete
  const handlePermanentDelete = (payment: PaymentWithInfo) => {
    permanentDeleteMutation.mutate(
      { id: payment.id, name: `Payment ৳${payment.amount}` },
      { onSuccess: () => setPermanentDeleteTarget(null) }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const invoice = getSelectedInvoice();
    if (!invoice) {
      toast({
        title: 'Invoice Required',
        description: 'Please select an invoice',
        variant: 'destructive',
      });
      return;
    }

    const amount = parseFloat(formData.amount) || 0;
    if (amount <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid payment amount',
        variant: 'destructive',
      });
      return;
    }

    if (amount > invoice.due) {
      toast({
        title: 'Amount Exceeds Due',
        description: `Maximum payable amount is ${formatCurrency(invoice.due)}`,
        variant: 'destructive',
      });
      return;
    }

    try {
      await addPaymentMutation.mutateAsync({
        invoice_id: formData.invoiceId,
        amount,
        method: formData.paymentMethod,
        reference: formData.referenceNote || null,
        notes: null,
      });

      toast({
        title: 'Payment Recorded',
        description: `${formatCurrency(amount)} payment recorded successfully`,
      });

      resetForm();
      setDialogOpen(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to record payment',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      invoiceId: '',
      amount: '',
      paymentMethod: 'CASH',
      referenceNote: '',
    });
  };

  const getPaymentIcon = (method: string) => {
    const methodConfig = paymentMethods.find((m) => m.value === method);
    const Icon = methodConfig?.icon || Wallet;
    return <Icon className="w-4 h-4" />;
  };

  const handlePrintReceipt = (payment: PaymentWithInfo) => {
    const receiptPayment = {
      id: payment.id,
      invoiceId: payment.invoice_id,
      customerId: payment.customer?.id || '',
      amount: payment.amount,
      paymentMethod: payment.method as any,
      referenceNote: payment.reference || undefined,
      date: new Date(payment.created_at),
    };
    
    openReceiptWindow({
      payment: receiptPayment,
      customerName: payment.customer?.name || 'Unknown',
      invoiceNumber: payment.invoice?.invoice_number || 'Unknown',
      receivedBy: 'Admin',
    });
  };

  const isLoading = invoicesLoading || paymentsLoading || customersLoading || storesLoading;

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
          <h1 className="page-title">Payments</h1>
          <p className="text-muted-foreground">Record and track customer payments</p>
        </div>
        <div className="flex items-center gap-2">
          <TrashToggle 
            showDeleted={showDeleted} 
            onToggle={setShowDeleted} 
            deletedCount={deletedPayments.length} 
          />
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Receive Payment
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Receive Payment</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="input-group">
                  <Label>Select Invoice *</Label>
                  <Select
                    value={formData.invoiceId}
                    onValueChange={(value) => setFormData({ ...formData, invoiceId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select unpaid invoice" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      {unpaidInvoices.map((inv) => (
                        <SelectItem key={inv.id} value={inv.id}>
                          {getInvoiceLabel(inv)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.invoiceId && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Total Amount</p>
                        <p className="font-medium">{formatCurrency(getSelectedInvoice()?.total || 0)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Already Paid</p>
                        <p className="font-medium text-success">{formatCurrency(getSelectedInvoice()?.paid || 0)}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-muted-foreground">Due Amount</p>
                        <p className="text-lg font-bold text-primary">{formatCurrency(getSelectedInvoice()?.due || 0)}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="input-group">
                  <Label htmlFor="amount">Payment Amount (৳) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="input-group">
                  <Label>Payment Method *</Label>
                  <Select
                    value={formData.paymentMethod}
                    onValueChange={(value: PaymentMethod) => setFormData({ ...formData, paymentMethod: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      {paymentMethods.map((method) => (
                        <SelectItem key={method.value} value={method.value}>
                          <div className="flex items-center gap-2">
                            <method.icon className="w-4 h-4" />
                            {method.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="input-group">
                  <Label htmlFor="referenceNote">Reference Note</Label>
                  <Textarea
                    id="referenceNote"
                    value={formData.referenceNote}
                    onChange={(e) => setFormData({ ...formData, referenceNote: e.target.value })}
                    placeholder="e.g., Transaction ID, receipt number..."
                    rows={2}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={addPaymentMutation.isPending}>
                    {addPaymentMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Record Payment
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Trash view header */}
      {showDeleted && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-center gap-2">
          <Trash2 className="w-5 h-5 text-destructive" />
          <span className="font-medium text-destructive">Trash / ডিলিটেড পেমেন্ট</span>
          <span className="text-sm text-muted-foreground">({deletedPayments.length} items)</span>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by invoice, customer, or store..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Payments Table */}
      <DataTable
        columns={[
          {
            key: 'date',
            header: 'Date',
            render: (payment) => (
              <div className="flex flex-col">
                <span className="font-medium">{formatDateOnly(payment.created_at)}</span>
                <span className="text-xs text-muted-foreground">{formatTimeWithSeconds(payment.created_at)}</span>
              </div>
            ),
          },
          {
            key: 'invoice',
            header: 'Invoice',
            render: (payment) => (
              <span className="font-medium">{payment.invoice?.invoice_number || 'Unknown'}</span>
            ),
          },
          {
            key: 'customer',
            header: 'Customer',
            render: (payment) => payment.customer?.name || 'Unknown',
          },
          {
            key: 'store',
            header: 'Store',
            render: (payment) => payment.store?.name || 'N/A',
          },
          {
            key: 'amount',
            header: 'Amount',
            render: (payment) => (
              <span className="font-medium text-success">{formatCurrency(payment.amount)}</span>
            ),
          },
          {
            key: 'method',
            header: 'Method',
            render: (payment) => (
              <div className="flex items-center gap-2">
                {getPaymentIcon(payment.method)}
                <span>{payment.method}</span>
              </div>
            ),
          },
          {
            key: 'reference',
            header: 'Reference',
            render: (payment) => (
              <span className="text-muted-foreground">
                {payment.reference || '—'}
              </span>
            ),
          },
          {
            key: 'actions',
            header: 'Actions',
            render: (payment) => (
              <div className="flex items-center gap-1">
                {showDeleted ? (
                  // Trash view actions
                  <>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={(e) => { e.stopPropagation(); setRestoreTarget(payment); }} 
                      title="Restore"
                    >
                      <RotateCcw className="w-4 h-4 text-primary" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={(e) => { e.stopPropagation(); setPermanentDeleteTarget(payment); }} 
                      className="text-destructive hover:text-destructive" 
                      title="Permanent Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  // Active view actions
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => { e.stopPropagation(); handlePrintReceipt(payment); }}
                      title="View & Print Receipt"
                    >
                      <FileText className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => { e.stopPropagation(); handlePrintReceipt(payment); }}
                      title="Print Receipt"
                    >
                      <Printer className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => { e.stopPropagation(); setSoftDeleteTarget(payment); }}
                      className="text-destructive hover:text-destructive"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            ),
          },
        ]}
        data={filteredPayments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())}
        keyExtractor={(payment) => payment.id}
        emptyMessage={showDeleted ? "No deleted payments" : "No payments recorded"}
        onRowClick={(payment) => !showDeleted && handlePrintReceipt(payment)}
      />

      {/* Delete Confirmation Dialogs */}
      <SoftDeleteDialog
        open={!!softDeleteTarget}
        onOpenChange={(open) => !open && setSoftDeleteTarget(null)}
        itemName={softDeleteTarget ? `Payment ৳${softDeleteTarget.amount}` : ''}
        onConfirm={() => softDeleteTarget && handleSoftDelete(softDeleteTarget)}
        isPending={softDeleteMutation.isPending}
      />

      <RestoreDialog
        open={!!restoreTarget}
        onOpenChange={(open) => !open && setRestoreTarget(null)}
        itemName={restoreTarget ? `Payment ৳${restoreTarget.amount}` : ''}
        onConfirm={() => restoreTarget && handleRestore(restoreTarget)}
        isPending={restoreMutation.isPending}
      />

      <PermanentDeleteDialog
        open={!!permanentDeleteTarget}
        onOpenChange={(open) => !open && setPermanentDeleteTarget(null)}
        itemName={permanentDeleteTarget ? `Payment ৳${permanentDeleteTarget.amount}` : ''}
        itemId={permanentDeleteTarget?.id || ''}
        table="payments"
        onConfirm={() => permanentDeleteTarget && handlePermanentDelete(permanentDeleteTarget)}
        isPending={permanentDeleteMutation.isPending}
      />
    </div>
  );
}
