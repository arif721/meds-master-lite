import { useState } from 'react';
import { Plus, Search, Edit2, Phone, MapPin, Users, Trash2, Loader2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/DataTable';
import { useCustomers, useInvoices, useAddCustomer, useUpdateCustomer, DbCustomer } from '@/hooks/useDatabase';
import { useSoftDelete, useRestore, usePermanentDelete } from '@/hooks/useSoftDelete';
import { formatCurrency } from '@/lib/format';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { TrashToggle } from '@/components/TrashToggle';
import { SoftDeleteDialog, RestoreDialog, PermanentDeleteDialog } from '@/components/DeleteConfirmDialogs';

export default function Customers() {
  const { data: customers = [], isLoading } = useCustomers();
  const { data: invoices = [] } = useInvoices();
  const addCustomer = useAddCustomer();
  const updateCustomer = useUpdateCustomer();

  // Soft delete hooks
  const softDelete = useSoftDelete('customers');
  const restore = useRestore('customers');
  const permanentDelete = usePermanentDelete('customers');

  const [search, setSearch] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<DbCustomer | null>(null);
  
  // Delete dialogs
  const [softDeleteDialogOpen, setSoftDeleteDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [permanentDeleteDialogOpen, setPermanentDeleteDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<DbCustomer | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
  });

  // Separate active and deleted customers
  const activeCustomers = customers.filter((c) => !(c as any).is_deleted);
  const deletedCustomers = customers.filter((c) => (c as any).is_deleted);

  const filteredCustomers = (showDeleted ? deletedCustomers : activeCustomers).filter(
    (customer) =>
      customer.name.toLowerCase().includes(search.toLowerCase()) ||
      (customer.phone || '').includes(search)
  );

  const getCustomerStats = (customerId: string) => {
    const customerInvoices = invoices.filter(
      (inv) => inv.customer_id === customerId && inv.status !== 'DRAFT' && inv.status !== 'CANCELLED'
    );
    const totalPurchases = customerInvoices.reduce((sum, inv) => sum + Number(inv.total), 0);
    const totalDue = customerInvoices.reduce((sum, inv) => sum + Number(inv.due), 0);
    return { totalPurchases, totalDue, invoiceCount: customerInvoices.length };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const customerData = {
      name: formData.name,
      phone: formData.phone || null,
      address: formData.address || null,
      seller_id: null,
    };

    if (editingCustomer) {
      await updateCustomer.mutateAsync({ id: editingCustomer.id, ...customerData });
    } else {
      await addCustomer.mutateAsync(customerData);
    }

    resetForm();
    setDialogOpen(false);
  };

  const handleEdit = (customer: DbCustomer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone || '',
      address: customer.address || '',
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({ name: '', phone: '', address: '' });
    setEditingCustomer(null);
  };

  const handleSoftDelete = (customer: DbCustomer) => {
    setSelectedCustomer(customer);
    setSoftDeleteDialogOpen(true);
  };

  const handleRestore = (customer: DbCustomer) => {
    setSelectedCustomer(customer);
    setRestoreDialogOpen(true);
  };

  const handlePermanentDelete = (customer: DbCustomer) => {
    setSelectedCustomer(customer);
    setPermanentDeleteDialogOpen(true);
  };

  const confirmSoftDelete = async () => {
    if (selectedCustomer) {
      await softDelete.mutateAsync({ id: selectedCustomer.id, name: selectedCustomer.name });
      setSoftDeleteDialogOpen(false);
      setSelectedCustomer(null);
    }
  };

  const confirmRestore = async () => {
    if (selectedCustomer) {
      await restore.mutateAsync({ id: selectedCustomer.id, name: selectedCustomer.name });
      setRestoreDialogOpen(false);
      setSelectedCustomer(null);
    }
  };

  const confirmPermanentDelete = async () => {
    if (selectedCustomer) {
      await permanentDelete.mutateAsync({ id: selectedCustomer.id, name: selectedCustomer.name });
      setPermanentDeleteDialogOpen(false);
      setSelectedCustomer(null);
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
          <h1 className="page-title">Customers</h1>
          <p className="text-muted-foreground">Manage your customer database</p>
        </div>
        <div className="flex items-center gap-2">
          <TrashToggle 
            showDeleted={showDeleted} 
            onToggle={setShowDeleted} 
            deletedCount={deletedCustomers.length} 
          />
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Customer
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{editingCustomer ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="input-group">
                  <Label htmlFor="name">Customer Name *</Label>
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
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Shop address (optional)"
                    rows={2}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={addCustomer.isPending || updateCustomer.isPending}>
                    {(addCustomer.isPending || updateCustomer.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {editingCustomer ? 'Update Customer' : 'Add Customer'}
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
          <span className="font-medium text-destructive">Trash / ডিলিটেড কাস্টমার</span>
          <span className="text-sm text-muted-foreground">({deletedCustomers.length} items)</span>
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

      {/* Customers Table */}
      <DataTable
        columns={[
          {
            key: 'name',
            header: 'Customer',
            render: (customer) => (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{customer.name}</p>
                  {customer.phone && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {customer.phone}
                    </p>
                  )}
                </div>
              </div>
            ),
          },
          {
            key: 'address',
            header: 'Address',
            render: (customer) =>
              customer.address ? (
                <span className="flex items-center gap-1 text-sm">
                  <MapPin className="w-3 h-3" />
                  {customer.address}
                </span>
              ) : (
                <span className="text-muted-foreground">—</span>
              ),
          },
          {
            key: 'invoices',
            header: 'Invoices',
            render: (customer) => {
              const stats = getCustomerStats(customer.id);
              return <span>{stats.invoiceCount}</span>;
            },
          },
          {
            key: 'totalPurchases',
            header: 'Total Purchases',
            render: (customer) => {
              const stats = getCustomerStats(customer.id);
              return <span className="font-medium">{formatCurrency(stats.totalPurchases)}</span>;
            },
          },
          {
            key: 'due',
            header: 'Due Amount',
            render: (customer) => {
              const stats = getCustomerStats(customer.id);
              return (
                <span className={stats.totalDue > 0 ? 'badge-warning' : 'badge-success'}>
                  {formatCurrency(stats.totalDue)}
                </span>
              );
            },
          },
          {
            key: 'actions',
            header: 'Actions',
            render: (customer) => (
              <div className="flex gap-1">
                {showDeleted ? (
                  // Trash view actions
                  <>
                    <Button variant="ghost" size="icon" onClick={() => handleRestore(customer)} title="Restore">
                      <RotateCcw className="w-4 h-4 text-primary" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handlePermanentDelete(customer)} className="text-destructive hover:text-destructive" title="Permanent Delete">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  // Active view actions
                  <>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(customer)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleSoftDelete(customer)} className="text-destructive hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            ),
          },
        ]}
        data={filteredCustomers}
        keyExtractor={(customer) => customer.id}
        emptyMessage={showDeleted ? "Trash is empty" : "No customers found"}
      />

      {/* Soft Delete Dialog */}
      <SoftDeleteDialog
        open={softDeleteDialogOpen}
        onOpenChange={setSoftDeleteDialogOpen}
        itemName={selectedCustomer?.name || ''}
        onConfirm={confirmSoftDelete}
        isPending={softDelete.isPending}
      />

      {/* Restore Dialog */}
      <RestoreDialog
        open={restoreDialogOpen}
        onOpenChange={setRestoreDialogOpen}
        itemName={selectedCustomer?.name || ''}
        onConfirm={confirmRestore}
        isPending={restore.isPending}
      />

      {/* Permanent Delete Dialog */}
      <PermanentDeleteDialog
        open={permanentDeleteDialogOpen}
        onOpenChange={setPermanentDeleteDialogOpen}
        itemName={selectedCustomer?.name || ''}
        itemId={selectedCustomer?.id || ''}
        table="customers"
        onConfirm={confirmPermanentDelete}
        isPending={permanentDelete.isPending}
      />
    </div>
  );
}
