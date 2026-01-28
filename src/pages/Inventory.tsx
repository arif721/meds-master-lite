import { useState } from 'react';
import { Plus, Search, AlertTriangle, Clock, Package, Trash2, Edit2, Loader2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/DataTable';
import { useProducts, useBatches, useAddBatch, useUpdateBatch, DbBatch } from '@/hooks/useDatabase';
import { useSoftDelete, useRestore, usePermanentDelete } from '@/hooks/useSoftDelete';
import { formatCurrency, formatDate, isExpired, isExpiringSoon, getDaysUntilExpiry } from '@/lib/format';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrashToggle } from '@/components/TrashToggle';
import { SoftDeleteDialog, RestoreDialog, PermanentDeleteDialog } from '@/components/DeleteConfirmDialogs';

export default function Inventory() {
  const { data: products = [] } = useProducts();
  const { data: batches = [], isLoading } = useBatches();
  const addBatch = useAddBatch();
  const updateBatch = useUpdateBatch();
  
  // Soft delete hooks
  const softDelete = useSoftDelete('batches');
  const restore = useRestore('batches');
  const permanentDelete = usePermanentDelete('batches');

  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [showDeleted, setShowDeleted] = useState(false);
  
  // Delete dialogs
  const [softDeleteDialogOpen, setSoftDeleteDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [permanentDeleteDialogOpen, setPermanentDeleteDialogOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<DbBatch | null>(null);
  const [editingBatch, setEditingBatch] = useState<DbBatch | null>(null);

  const [formData, setFormData] = useState({
    product_id: '',
    batch_number: '',
    expiry_date: '',
    quantity: '',
    cost_price: '',
  });

  const activeProducts = products.filter((p) => p.active && !(p as any).is_deleted);

  const getProductName = (productId: string) => {
    return products.find((p) => p.id === productId)?.name || 'Unknown';
  };

  const getProductUnit = (productId: string) => {
    return products.find((p) => p.id === productId)?.unit || 'Piece';
  };

  // Separate active and deleted batches
  const activeBatches = batches.filter((b) => !(b as any).is_deleted);
  const deletedBatches = batches.filter((b) => (b as any).is_deleted);

  const filteredBatches = (showDeleted ? deletedBatches : activeBatches).filter((batch) => {
    const product = products.find((p) => p.id === batch.product_id);
    const matchesSearch =
      product?.name.toLowerCase().includes(search.toLowerCase()) ||
      batch.batch_number.toLowerCase().includes(search.toLowerCase());

    if (showDeleted) return matchesSearch; // Show all deleted regardless of quantity/expiry

    const expiryDate = batch.expiry_date ? new Date(batch.expiry_date) : null;

    if (activeTab === 'all') return matchesSearch && batch.quantity > 0;
    if (activeTab === 'low') return matchesSearch && batch.quantity > 0 && batch.quantity < 50;
    if (activeTab === 'expiring') return matchesSearch && batch.quantity > 0 && expiryDate && isExpiringSoon(expiryDate, 60);
    if (activeTab === 'expired') return matchesSearch && batch.quantity > 0 && expiryDate && isExpired(expiryDate);
    return matchesSearch;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const batchData = {
      product_id: formData.product_id,
      batch_number: formData.batch_number,
      expiry_date: formData.expiry_date || null,
      quantity: parseInt(formData.quantity) || 0,
      cost_price: parseFloat(formData.cost_price) || 0,
    };

    if (editingBatch) {
      await updateBatch.mutateAsync({ id: editingBatch.id, ...batchData });
    } else {
      await addBatch.mutateAsync(batchData);
    }

    resetForm();
    setDialogOpen(false);
  };

  const handleEdit = (batch: DbBatch) => {
    setEditingBatch(batch);
    setFormData({
      product_id: batch.product_id,
      batch_number: batch.batch_number,
      expiry_date: batch.expiry_date ? new Date(batch.expiry_date).toISOString().split('T')[0] : '',
      quantity: batch.quantity.toString(),
      cost_price: batch.cost_price.toString(),
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      product_id: '',
      batch_number: '',
      expiry_date: '',
      quantity: '',
      cost_price: '',
    });
    setEditingBatch(null);
  };

  const handleSoftDelete = (batch: DbBatch) => {
    setSelectedBatch(batch);
    setSoftDeleteDialogOpen(true);
  };

  const handleRestore = (batch: DbBatch) => {
    setSelectedBatch(batch);
    setRestoreDialogOpen(true);
  };

  const handlePermanentDelete = (batch: DbBatch) => {
    setSelectedBatch(batch);
    setPermanentDeleteDialogOpen(true);
  };

  const confirmSoftDelete = async () => {
    if (selectedBatch) {
      await softDelete.mutateAsync({ id: selectedBatch.id, name: `${getProductName(selectedBatch.product_id)} - ${selectedBatch.batch_number}` });
      setSoftDeleteDialogOpen(false);
      setSelectedBatch(null);
    }
  };

  const confirmRestore = async () => {
    if (selectedBatch) {
      await restore.mutateAsync({ id: selectedBatch.id, name: `${getProductName(selectedBatch.product_id)} - ${selectedBatch.batch_number}` });
      setRestoreDialogOpen(false);
      setSelectedBatch(null);
    }
  };

  const confirmPermanentDelete = async () => {
    if (selectedBatch) {
      await permanentDelete.mutateAsync({ id: selectedBatch.id, name: `${getProductName(selectedBatch.product_id)} - ${selectedBatch.batch_number}` });
      setPermanentDeleteDialogOpen(false);
      setSelectedBatch(null);
    }
  };

  const stats = {
    all: activeBatches.filter((b) => b.quantity > 0).length,
    low: activeBatches.filter((b) => b.quantity > 0 && b.quantity < 50).length,
    expiring: activeBatches.filter((b) => b.quantity > 0 && b.expiry_date && isExpiringSoon(new Date(b.expiry_date), 60)).length,
    expired: activeBatches.filter((b) => b.quantity > 0 && b.expiry_date && isExpired(new Date(b.expiry_date))).length,
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
          <h1 className="page-title">Inventory</h1>
          <p className="text-muted-foreground">Manage stock batches and lots</p>
        </div>
        <div className="flex items-center gap-2">
          <TrashToggle 
            showDeleted={showDeleted} 
            onToggle={setShowDeleted} 
            deletedCount={deletedBatches.length} 
          />
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Opening Stock
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{editingBatch ? 'Edit Stock' : 'Add Opening Stock'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="input-group">
                  <Label htmlFor="product">Product *</Label>
                  <Select
                    value={formData.product_id}
                    onValueChange={(value) => setFormData({ ...formData, product_id: value })}
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
                  <Label htmlFor="batch_number">Batch/Lot Number *</Label>
                  <Input
                    id="batch_number"
                    value={formData.batch_number}
                    onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
                    placeholder="e.g., LOT-2024-001"
                    required
                  />
                </div>

                <div className="input-group">
                  <Label htmlFor="expiry_date">Expiry Date</Label>
                  <Input
                    id="expiry_date"
                    type="date"
                    value={formData.expiry_date}
                    onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="input-group">
                    <Label htmlFor="quantity">Quantity *</Label>
                    <Input
                      id="quantity"
                      type="number"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      placeholder="0"
                      required
                    />
                  </div>

                  <div className="input-group">
                    <Label htmlFor="cost_price">Unit Cost (৳) *</Label>
                    <Input
                      id="cost_price"
                      type="number"
                      step="0.01"
                      value={formData.cost_price}
                      onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={addBatch.isPending || updateBatch.isPending}>
                    {(addBatch.isPending || updateBatch.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {editingBatch ? 'Update Stock' : 'Add Stock'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabs - only show when not in trash view */}
      {!showDeleted && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all" className="gap-2">
              <Package className="w-4 h-4" />
              All Stock ({stats.all})
            </TabsTrigger>
            <TabsTrigger value="low" className="gap-2">
              <AlertTriangle className="w-4 h-4" />
              Low Stock ({stats.low})
            </TabsTrigger>
            <TabsTrigger value="expiring" className="gap-2">
              <Clock className="w-4 h-4" />
              Expiring Soon ({stats.expiring})
            </TabsTrigger>
            <TabsTrigger value="expired" className="gap-2">
              <AlertTriangle className="w-4 h-4" />
              Expired ({stats.expired})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {/* Trash view header */}
      {showDeleted && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-center gap-2">
          <Trash2 className="w-5 h-5 text-destructive" />
          <span className="font-medium text-destructive">Trash / ডিলিটেড স্টক</span>
          <span className="text-sm text-muted-foreground">({deletedBatches.length} items)</span>
        </div>
      )}

      <div className="space-y-4">
        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by product or lot number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Inventory Table */}
        <DataTable
          columns={[
            {
              key: 'product',
              header: 'Product',
              render: (batch) => (
                <div>
                  <p className="font-medium">{getProductName(batch.product_id)}</p>
                  <p className="text-xs text-muted-foreground">{getProductUnit(batch.product_id)}</p>
                </div>
              ),
            },
            { key: 'batch_number', header: 'Lot Number' },
            {
              key: 'expiry_date',
              header: 'Expiry Date',
              render: (batch) => {
                if (!batch.expiry_date) return <span className="text-muted-foreground">—</span>;
                const expiryDate = new Date(batch.expiry_date);
                const expired = isExpired(expiryDate);
                const expiringSoon = isExpiringSoon(expiryDate, 60);
                return (
                  <div>
                    <p className={expired ? 'text-destructive' : expiringSoon ? 'text-warning' : ''}>
                      {formatDate(expiryDate)}
                    </p>
                    {(expired || expiringSoon) && (
                      <p className="text-xs">
                        {expired ? (
                          <span className="badge-danger">Expired</span>
                        ) : (
                          <span className="badge-warning">{getDaysUntilExpiry(expiryDate)} days left</span>
                        )}
                      </p>
                    )}
                  </div>
                );
              },
            },
            {
              key: 'quantity',
              header: 'Quantity',
              render: (batch) => (
                <span className={batch.quantity < 50 ? 'badge-warning' : 'badge-success'}>
                  {batch.quantity}
                </span>
              ),
            },
            {
              key: 'cost_price',
              header: 'Unit Cost',
              render: (batch) => formatCurrency(Number(batch.cost_price)),
            },
            {
              key: 'value',
              header: 'Total Value',
              render: (batch) => (
                <span className="font-medium">{formatCurrency(batch.quantity * Number(batch.cost_price))}</span>
              ),
            },
            {
              key: 'actions',
              header: 'Actions',
              render: (batch) => (
                <div className="flex gap-1">
                  {showDeleted ? (
                    // Trash view actions
                    <>
                      <Button variant="ghost" size="icon" onClick={() => handleRestore(batch)} title="Restore">
                        <RotateCcw className="w-4 h-4 text-primary" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handlePermanentDelete(batch)} className="text-destructive hover:text-destructive" title="Permanent Delete">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    // Active view actions
                    <>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(batch)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleSoftDelete(batch)} className="text-destructive hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              ),
            },
          ]}
          data={filteredBatches}
          keyExtractor={(batch) => batch.id}
          emptyMessage={showDeleted ? "Trash is empty" : "No stock found"}
        />
      </div>

      {/* Soft Delete Dialog */}
      <SoftDeleteDialog
        open={softDeleteDialogOpen}
        onOpenChange={setSoftDeleteDialogOpen}
        itemName={selectedBatch ? `${getProductName(selectedBatch.product_id)} - ${selectedBatch.batch_number}` : ''}
        onConfirm={confirmSoftDelete}
        isPending={softDelete.isPending}
      />

      {/* Restore Dialog */}
      <RestoreDialog
        open={restoreDialogOpen}
        onOpenChange={setRestoreDialogOpen}
        itemName={selectedBatch ? `${getProductName(selectedBatch.product_id)} - ${selectedBatch.batch_number}` : ''}
        onConfirm={confirmRestore}
        isPending={restore.isPending}
      />

      {/* Permanent Delete Dialog */}
      <PermanentDeleteDialog
        open={permanentDeleteDialogOpen}
        onOpenChange={setPermanentDeleteDialogOpen}
        itemName={selectedBatch ? `${getProductName(selectedBatch.product_id)} - ${selectedBatch.batch_number}` : ''}
        itemId={selectedBatch?.id || ''}
        table="batches"
        onConfirm={confirmPermanentDelete}
        isPending={permanentDelete.isPending}
      />
    </div>
  );
}
