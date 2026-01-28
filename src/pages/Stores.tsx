import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Store, Phone, Edit2, Trash2, RotateCcw, Eye, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/DataTable';
import { 
  useStores, 
  useAddStore, 
  useUpdateStore, 
  DbStore,
  PAYMENT_TERMS_LABELS
} from '@/hooks/useStores';
import { useSoftDelete, useRestore, usePermanentDelete } from '@/hooks/useSoftDelete';
import { useInvoices, useInvoiceLines } from '@/hooks/useDatabase';
import { formatCurrency } from '@/lib/format';
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
import { Badge } from '@/components/ui/badge';
import { TrashToggle } from '@/components/TrashToggle';
import { SoftDeleteDialog, RestoreDialog, PermanentDeleteDialog } from '@/components/DeleteConfirmDialogs';
import { startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';

export default function Stores() {
  const navigate = useNavigate();
  const { data: stores = [], isLoading } = useStores();
  const { data: invoices = [] } = useInvoices();
  const { data: invoiceLines = [] } = useInvoiceLines();
  const addStore = useAddStore();
  const updateStore = useUpdateStore();

  // Soft delete hooks
  const softDelete = useSoftDelete('stores');
  const restore = useRestore('stores');
  const permanentDelete = usePermanentDelete('stores');

  const [search, setSearch] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<DbStore | null>(null);
  
  // Delete dialogs
  const [softDeleteDialogOpen, setSoftDeleteDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [permanentDeleteDialogOpen, setPermanentDeleteDialogOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState<DbStore | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    contact_person: '',
    credit_limit: '',
    payment_terms: 'CASH' as DbStore['payment_terms'],
  });

  // Current month date range
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  // Calculate store stats
  const getStoreStats = (storeId: string) => {
    const storeInvoices = invoices.filter(
      (inv) => inv.store_id === storeId && inv.status !== 'DRAFT' && inv.status !== 'CANCELLED'
    );
    
    const thisMonthInvoices = storeInvoices.filter((inv) => {
      const invoiceDate = parseISO(inv.created_at);
      return isWithinInterval(invoiceDate, { start: monthStart, end: monthEnd });
    });

    const totalDue = storeInvoices.reduce((sum, inv) => sum + Number(inv.due), 0);
    const thisMonthSales = thisMonthInvoices.reduce((sum, inv) => sum + Number(inv.total), 0);
    
    // Calculate profit from invoice lines
    const thisMonthInvoiceIds = thisMonthInvoices.map(inv => inv.id);
    const thisMonthLines = invoiceLines.filter(line => thisMonthInvoiceIds.includes(line.invoice_id));
    const thisMonthCogs = thisMonthLines.reduce((sum, line) => 
      sum + (Number(line.cost_price) * Number(line.quantity)), 0);
    const thisMonthProfit = thisMonthSales - thisMonthCogs;

    return {
      totalDue,
      thisMonthSales,
      thisMonthProfit,
      thisMonthInvoiceCount: thisMonthInvoices.length,
    };
  };

  // Separate active and deleted stores
  const activeStores = stores.filter((s) => !(s as any).is_deleted);
  const deletedStores = stores.filter((s) => (s as any).is_deleted);

  const filteredStores = useMemo(() => {
    return (showDeleted ? deletedStores : activeStores).filter((store) =>
      store.name.toLowerCase().includes(search.toLowerCase()) ||
      (store.phone || '').includes(search)
    );
  }, [stores, search, showDeleted, activeStores, deletedStores]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const storeData = {
      name: formData.name,
      address: formData.address || null,
      phone: formData.phone || null,
      contact_person: formData.contact_person || null,
      credit_limit: parseFloat(formData.credit_limit) || 0,
      payment_terms: formData.payment_terms,
      active: true,
    };

    if (editingStore) {
      await updateStore.mutateAsync({ id: editingStore.id, ...storeData });
    } else {
      await addStore.mutateAsync(storeData);
    }

    resetForm();
    setDialogOpen(false);
  };

  const handleEdit = (store: DbStore) => {
    setEditingStore(store);
    setFormData({
      name: store.name,
      address: store.address || '',
      phone: store.phone || '',
      contact_person: store.contact_person || '',
      credit_limit: store.credit_limit.toString(),
      payment_terms: store.payment_terms,
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      phone: '',
      contact_person: '',
      credit_limit: '',
      payment_terms: 'CASH',
    });
    setEditingStore(null);
  };

  const handleSoftDelete = (store: DbStore) => {
    setSelectedStore(store);
    setSoftDeleteDialogOpen(true);
  };

  const handleRestore = (store: DbStore) => {
    setSelectedStore(store);
    setRestoreDialogOpen(true);
  };

  const handlePermanentDelete = (store: DbStore) => {
    setSelectedStore(store);
    setPermanentDeleteDialogOpen(true);
  };

  const confirmSoftDelete = async () => {
    if (selectedStore) {
      await softDelete.mutateAsync({ id: selectedStore.id, name: selectedStore.name });
      setSoftDeleteDialogOpen(false);
      setSelectedStore(null);
    }
  };

  const confirmRestore = async () => {
    if (selectedStore) {
      await restore.mutateAsync({ id: selectedStore.id, name: selectedStore.name });
      setRestoreDialogOpen(false);
      setSelectedStore(null);
    }
  };

  const confirmPermanentDelete = async () => {
    if (selectedStore) {
      await permanentDelete.mutateAsync({ id: selectedStore.id, name: selectedStore.name });
      setPermanentDeleteDialogOpen(false);
      setSelectedStore(null);
    }
  };

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
          <h1 className="page-title">Stores</h1>
          <p className="text-muted-foreground">Manage your shop/store database</p>
        </div>
        <div className="flex items-center gap-2">
          <TrashToggle 
            showDeleted={showDeleted} 
            onToggle={setShowDeleted} 
            deletedCount={deletedStores.length} 
          />
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Store
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{editingStore ? 'Edit Store' : 'Add New Store'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="input-group">
                  <Label htmlFor="name">Store Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Rahman Medicine Corner"
                    required
                  />
                </div>

                <div className="input-group">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g., 01711-234567"
                  />
                </div>

                <div className="input-group">
                  <Label htmlFor="contact_person">Contact Person</Label>
                  <Input
                    id="contact_person"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                    placeholder="e.g., Mr. Rahman"
                  />
                </div>

                <div className="input-group">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Shop address (optional)"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="input-group">
                    <Label htmlFor="credit_limit">Credit Limit (৳) *</Label>
                    <Input
                      id="credit_limit"
                      type="number"
                      value={formData.credit_limit}
                      onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })}
                      placeholder="e.g., 50000"
                      required
                    />
                  </div>

                  <div className="input-group">
                    <Label htmlFor="payment_terms">Payment Terms *</Label>
                    <Select
                      value={formData.payment_terms}
                      onValueChange={(value) => setFormData({ ...formData, payment_terms: value as DbStore['payment_terms'] })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        <SelectItem value="CASH">Cash</SelectItem>
                        <SelectItem value="7_DAYS">7 Days</SelectItem>
                        <SelectItem value="15_DAYS">15 Days</SelectItem>
                        <SelectItem value="21_DAYS">21 Days</SelectItem>
                        <SelectItem value="30_DAYS">30 Days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={addStore.isPending || updateStore.isPending}>
                    {(addStore.isPending || updateStore.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {editingStore ? 'Update Store' : 'Add Store'}
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
          <span className="font-medium text-destructive">Trash / ডিলিটেড স্টোর</span>
          <span className="text-sm text-muted-foreground">({deletedStores.length} items)</span>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stores Table */}
      <DataTable
        columns={[
          {
            key: 'name',
            header: 'Store',
            render: (store) => (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Store className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{store.name}</p>
                  {store.phone && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {store.phone}
                    </p>
                  )}
                </div>
              </div>
            ),
          },
          {
            key: 'payment_terms',
            header: 'Payment Terms',
            render: (store) => (
              <Badge variant="secondary">
                {PAYMENT_TERMS_LABELS[store.payment_terms] || store.payment_terms}
              </Badge>
            ),
          },
          {
            key: 'credit_limit',
            header: 'Credit Limit',
            render: (store) => (
              <span className="font-medium">{formatCurrency(store.credit_limit)}</span>
            ),
          },
          {
            key: 'due',
            header: 'Total Due',
            render: (store) => {
              const stats = getStoreStats(store.id);
              return (
                <span className={stats.totalDue > 0 ? 'badge-warning' : 'badge-success'}>
                  {formatCurrency(stats.totalDue)}
                </span>
              );
            },
          },
          {
            key: 'thisMonthSales',
            header: 'This Month Sales',
            render: (store) => {
              const stats = getStoreStats(store.id);
              return <span className="font-medium">{formatCurrency(stats.thisMonthSales)}</span>;
            },
          },
          {
            key: 'thisMonthProfit',
            header: 'This Month Profit',
            render: (store) => {
              const stats = getStoreStats(store.id);
              return (
                <span className={stats.thisMonthProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {formatCurrency(stats.thisMonthProfit)}
                </span>
              );
            },
          },
          {
            key: 'invoiceCount',
            header: 'Invoices (Month)',
            render: (store) => {
              const stats = getStoreStats(store.id);
              return <span>{stats.thisMonthInvoiceCount}</span>;
            },
          },
          {
            key: 'actions',
            header: 'Actions',
            render: (store) => (
              <div className="flex gap-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => navigate(`/stores/${store.id}`)}
                  title="View Details"
                >
                  <Eye className="w-4 h-4" />
                </Button>
                {showDeleted ? (
                  // Trash view actions
                  <>
                    <Button variant="ghost" size="icon" onClick={() => handleRestore(store)} title="Restore">
                      <RotateCcw className="w-4 h-4 text-primary" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handlePermanentDelete(store)} className="text-destructive hover:text-destructive" title="Permanent Delete">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  // Active view actions
                  <>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(store)} title="Edit">
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleSoftDelete(store)} 
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
        data={filteredStores}
        keyExtractor={(store) => store.id}
        emptyMessage={showDeleted ? "Trash is empty" : "No stores found"}
        onRowClick={(store) => !showDeleted && navigate(`/stores/${store.id}`)}
      />

      {/* Soft Delete Dialog */}
      <SoftDeleteDialog
        open={softDeleteDialogOpen}
        onOpenChange={setSoftDeleteDialogOpen}
        itemName={selectedStore?.name || ''}
        onConfirm={confirmSoftDelete}
        isPending={softDelete.isPending}
      />

      {/* Restore Dialog */}
      <RestoreDialog
        open={restoreDialogOpen}
        onOpenChange={setRestoreDialogOpen}
        itemName={selectedStore?.name || ''}
        onConfirm={confirmRestore}
        isPending={restore.isPending}
      />

      {/* Permanent Delete Dialog */}
      <PermanentDeleteDialog
        open={permanentDeleteDialogOpen}
        onOpenChange={setPermanentDeleteDialogOpen}
        itemName={selectedStore?.name || ''}
        itemId={selectedStore?.id || ''}
        table="stores"
        onConfirm={confirmPermanentDelete}
        isPending={permanentDelete.isPending}
      />
    </div>
  );
}
