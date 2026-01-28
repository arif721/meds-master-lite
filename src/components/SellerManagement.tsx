import { useState, useMemo } from 'react';
import { Plus, Search, Edit2, Trash2, User, Phone, MapPin, Eye, TrendingUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/DataTable';
import { useSellers, useInvoices, usePayments, useAddSeller, useUpdateSeller, DbSeller } from '@/hooks/useDatabase';
import { formatCurrency, formatDate } from '@/lib/format';
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
import { toast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type CommissionType = 'PERCENTAGE' | 'FIXED';

export default function SellerManagement() {
  const { data: sellers = [], isLoading } = useSellers();
  const { data: invoices = [] } = useInvoices();
  const { data: payments = [] } = usePayments();
  const addSeller = useAddSeller();
  const updateSeller = useUpdateSeller();

  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewSeller, setViewSeller] = useState<DbSeller | null>(null);
  const [editingSeller, setEditingSeller] = useState<DbSeller | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    commission_type: 'PERCENTAGE' as CommissionType,
    commission_value: '',
    active: true,
  });

  const filteredSellers = sellers.filter(
    (seller) =>
      seller.name.toLowerCase().includes(search.toLowerCase()) ||
      (seller.phone || '').includes(search)
  );

  // Calculate seller statistics
  const getSellerStats = (sellerId: string) => {
    const sellerInvoices = invoices.filter(
      (inv) => inv.seller_id === sellerId && inv.status !== 'DRAFT' && inv.status !== 'CANCELLED'
    );
    const sellerPayments = payments.filter((pay) =>
      sellerInvoices.some((inv) => inv.id === pay.invoice_id)
    );

    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    const todaySales = sellerInvoices
      .filter((inv) => new Date(inv.created_at) >= startOfDay)
      .reduce((sum, inv) => sum + Number(inv.total), 0);

    const monthSales = sellerInvoices
      .filter((inv) => new Date(inv.created_at) >= startOfMonth)
      .reduce((sum, inv) => sum + Number(inv.total), 0);

    const yearSales = sellerInvoices
      .filter((inv) => new Date(inv.created_at) >= startOfYear)
      .reduce((sum, inv) => sum + Number(inv.total), 0);

    const totalSales = sellerInvoices.reduce((sum, inv) => sum + Number(inv.total), 0);
    const totalCollected = sellerPayments.reduce((sum, pay) => sum + Number(pay.amount), 0);
    const totalDue = sellerInvoices.reduce((sum, inv) => sum + Number(inv.due), 0);
    const invoiceCount = sellerInvoices.length;

    return { todaySales, monthSales, yearSales, totalSales, totalCollected, totalDue, invoiceCount };
  };

  // Calculate commission for a seller
  const calculateCommission = (seller: DbSeller, totalSales: number) => {
    if (seller.commission_type === 'FIXED') {
      const stats = getSellerStats(seller.id);
      return Number(seller.commission_value) * stats.invoiceCount;
    } else {
      return (totalSales * Number(seller.commission_value)) / 100;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({
        title: 'Required Fields',
        description: 'Name is required',
        variant: 'destructive',
      });
      return;
    }

    const sellerData = {
      name: formData.name.trim(),
      phone: formData.phone.trim() || null,
      address: formData.address.trim() || null,
      commission_type: formData.commission_type,
      commission_value: parseFloat(formData.commission_value) || 0,
      active: formData.active,
    };

    if (editingSeller) {
      await updateSeller.mutateAsync({ id: editingSeller.id, ...sellerData });
    } else {
      await addSeller.mutateAsync(sellerData);
    }

    resetForm();
    setDialogOpen(false);
  };

  const handleEdit = (seller: DbSeller) => {
    setEditingSeller(seller);
    setFormData({
      name: seller.name,
      phone: seller.phone || '',
      address: seller.address || '',
      commission_type: seller.commission_type,
      commission_value: seller.commission_value.toString(),
      active: seller.active,
    });
    setDialogOpen(true);
  };

  const handleToggleStatus = async (seller: DbSeller) => {
    await updateSeller.mutateAsync({ id: seller.id, active: !seller.active });
    toast({
      title: seller.active ? 'Seller Disabled' : 'Seller Enabled',
      description: `${seller.name} is now ${seller.active ? 'inactive' : 'active'}`,
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      address: '',
      commission_type: 'PERCENTAGE',
      commission_value: '',
      active: true,
    });
    setEditingSeller(null);
  };

  const activeSellersCount = sellers.filter((s) => s.active).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Sellers</p>
              <p className="text-2xl font-bold">{sellers.length}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/10">
              <User className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Sellers</p>
              <p className="text-2xl font-bold">{activeSellersCount}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning/10">
              <TrendingUp className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Sales (All Sellers)</p>
              <p className="text-2xl font-bold">
                {formatCurrency(
                  invoices
                    .filter((inv) => inv.seller_id && inv.status !== 'DRAFT' && inv.status !== 'CANCELLED')
                    .reduce((sum, inv) => sum + Number(inv.total), 0)
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search sellers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Seller
        </Button>
      </div>

      {/* Sellers Table */}
      <DataTable
        columns={[
          {
            key: 'name',
            header: 'Seller',
            render: (seller) => (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{seller.name}</p>
                  {seller.phone && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {seller.phone}
                    </p>
                  )}
                </div>
              </div>
            ),
          },
          {
            key: 'address',
            header: 'Address',
            render: (seller) => (
              <div className="flex items-center gap-1 text-sm">
                <MapPin className="w-3 h-3 text-muted-foreground" />
                {seller.address || '—'}
              </div>
            ),
          },
          {
            key: 'commission',
            header: 'Commission',
            render: (seller) => (
              <Badge variant="outline">
                {seller.commission_type === 'FIXED'
                  ? `৳${seller.commission_value}/invoice`
                  : `${seller.commission_value}%`}
              </Badge>
            ),
          },
          {
            key: 'sales',
            header: 'Total Sales',
            render: (seller) => {
              const stats = getSellerStats(seller.id);
              return (
                <span className="font-medium text-primary">
                  {formatCurrency(stats.totalSales)}
                </span>
              );
            },
          },
          {
            key: 'status',
            header: 'Status',
            render: (seller) => (
              <Badge variant={seller.active ? 'default' : 'secondary'}>
                {seller.active ? 'Active' : 'Inactive'}
              </Badge>
            ),
          },
          {
            key: 'actions',
            header: 'Actions',
            render: (seller) => (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setViewSeller(seller)}
                  title="View Details"
                >
                  <Eye className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(seller)}
                  title="Edit"
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleToggleStatus(seller)}
                  title={seller.active ? 'Disable' : 'Enable'}
                >
                  <Trash2 className={`w-4 h-4 ${seller.active ? 'text-destructive' : 'text-success'}`} />
                </Button>
              </div>
            ),
          },
        ]}
        data={filteredSellers}
        keyExtractor={(seller) => seller.id}
        emptyMessage="No sellers found"
      />

      {/* Add/Edit Seller Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingSeller ? 'Edit Seller' : 'Add New Seller'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="input-group col-span-2">
                <Label htmlFor="name">Seller Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter full name"
                  required
                />
              </div>

              <div className="input-group">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="01XXX-XXXXXX"
                />
              </div>

              <div className="input-group">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Full address"
                />
              </div>

              <div className="input-group">
                <Label>Commission Type</Label>
                <Select
                  value={formData.commission_type}
                  onValueChange={(value: CommissionType) => setFormData({ ...formData, commission_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="PERCENTAGE">Percentage of Sales</SelectItem>
                    <SelectItem value="FIXED">Fixed per Invoice</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="input-group">
                <Label htmlFor="commission_value">
                  Commission Rate {formData.commission_type === 'PERCENTAGE' ? '(%)' : '(৳)'}
                </Label>
                <Input
                  id="commission_value"
                  type="number"
                  step="0.01"
                  value={formData.commission_value}
                  onChange={(e) => setFormData({ ...formData, commission_value: e.target.value })}
                  placeholder={formData.commission_type === 'PERCENTAGE' ? '5' : '100'}
                />
              </div>

              <div className="input-group">
                <Label>Status</Label>
                <Select
                  value={formData.active ? 'active' : 'inactive'}
                  onValueChange={(value) => setFormData({ ...formData, active: value === 'active' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                Cancel
              </Button>
              <Button type="submit" disabled={addSeller.isPending || updateSeller.isPending}>
                {(addSeller.isPending || updateSeller.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingSeller ? 'Update Seller' : 'Add Seller'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Seller Details Dialog */}
      <Dialog open={!!viewSeller} onOpenChange={(open) => !open && setViewSeller(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Seller Details</DialogTitle>
          </DialogHeader>
          {viewSeller && (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="performance">Performance</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4 mt-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{viewSeller.name}</h3>
                    <Badge variant={viewSeller.active ? 'default' : 'secondary'}>
                      {viewSeller.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{viewSeller.phone || '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Address</p>
                    <p className="font-medium">{viewSeller.address || '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Commission Type</p>
                    <p className="font-medium">{viewSeller.commission_type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Commission Rate</p>
                    <p className="font-medium">
                      {viewSeller.commission_type === 'FIXED'
                        ? `৳${viewSeller.commission_value}/invoice`
                        : `${viewSeller.commission_value}%`}
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="performance" className="space-y-4 mt-4">
                {(() => {
                  const stats = getSellerStats(viewSeller.id);
                  const commission = calculateCommission(viewSeller, stats.totalSales);
                  return (
                    <>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-4 bg-primary/10 rounded-lg text-center">
                          <p className="text-sm text-muted-foreground">Today</p>
                          <p className="text-lg font-bold text-primary">{formatCurrency(stats.todaySales)}</p>
                        </div>
                        <div className="p-4 bg-muted/50 rounded-lg text-center">
                          <p className="text-sm text-muted-foreground">This Month</p>
                          <p className="text-lg font-bold">{formatCurrency(stats.monthSales)}</p>
                        </div>
                        <div className="p-4 bg-muted/50 rounded-lg text-center">
                          <p className="text-sm text-muted-foreground">This Year</p>
                          <p className="text-lg font-bold">{formatCurrency(stats.yearSales)}</p>
                        </div>
                        <div className="p-4 bg-success/10 rounded-lg text-center">
                          <p className="text-sm text-muted-foreground">Total Sales</p>
                          <p className="text-lg font-bold text-success">{formatCurrency(stats.totalSales)}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">Total Invoices</p>
                          <p className="text-2xl font-bold">{stats.invoiceCount}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">Total Collected</p>
                          <p className="text-2xl font-bold text-success">{formatCurrency(stats.totalCollected)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">Outstanding Due</p>
                          <p className="text-2xl font-bold text-warning">{formatCurrency(stats.totalDue)}</p>
                        </div>
                      </div>

                      <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Earned Commission</p>
                            <p className="text-sm text-muted-foreground">
                              {viewSeller.commission_type === 'FIXED'
                                ? `৳${viewSeller.commission_value} × ${stats.invoiceCount} invoices`
                                : `${viewSeller.commission_value}% of ${formatCurrency(stats.totalSales)}`}
                            </p>
                          </div>
                          <p className="text-2xl font-bold text-primary">{formatCurrency(commission)}</p>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
