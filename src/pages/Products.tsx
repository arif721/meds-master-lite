import { useState } from 'react';
import { Plus, Search, Edit2, Trash2, Package, Loader2, PlusCircle, X, Filter, Settings, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductImport } from '@/components/ProductImport';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/DataTable';
import { useProducts, useCategories, useAddProduct, useUpdateProduct, useBatches, useAddCategory } from '@/hooks/useDatabase';
import { useSoftDelete, useRestore, usePermanentDelete } from '@/hooks/useSoftDelete';
import { formatCurrency } from '@/lib/format';
import { generateSKU } from '@/lib/sku';
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { DbProduct } from '@/hooks/useDatabase';
import CategoryManagement from '@/components/CategoryManagement';
import { TrashToggle } from '@/components/TrashToggle';
import { SoftDeleteDialog, RestoreDialog, PermanentDeleteDialog } from '@/components/DeleteConfirmDialogs';

const UNIT_OPTIONS = ['Tablet', 'Capsule', 'Bottle', 'Box', 'Strip', 'Piece', 'Tube', 'Jar', 'Pot'] as const;

export default function Products() {
  const { data: products = [], isLoading: productsLoading } = useProducts();
  const { data: categories = [], isLoading: categoriesLoading, refetch: refetchCategories } = useCategories();
  const { data: batches = [] } = useBatches();
  const addProduct = useAddProduct();
  const updateProduct = useUpdateProduct();
  const addCategory = useAddCategory();

  // Soft delete hooks
  const softDelete = useSoftDelete('products');
  const restore = useRestore('products');
  const permanentDelete = usePermanentDelete('products');

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showCategoryManagement, setShowCategoryManagement] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<DbProduct | null>(null);
  
  // Delete dialogs
  const [softDeleteDialogOpen, setSoftDeleteDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [permanentDeleteDialogOpen, setPermanentDeleteDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<DbProduct | null>(null);
  
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    unit: 'Piece' as DbProduct['unit'],
    sales_price: '', // MRP
    cost_price: '', // TP Rate
    sku: '',
  });

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const newCat = await addCategory.mutateAsync(newCategoryName.trim());
      setFormData({ ...formData, category_id: newCat.id });
      setNewCategoryName('');
      setShowAddCategory(false);
      await refetchCategories();
    } catch (error) {
      // Error handled in mutation
    }
  };

  // Filter active categories for dropdown
  const activeCategories = categories.filter((c: any) => c.active !== false && !(c as any).is_deleted);

  // Separate active and deleted products
  const activeProducts = products.filter((p) => p.active && !(p as any).is_deleted);
  const deletedProducts = products.filter((p) => (p as any).is_deleted);

  const filteredProducts = (showDeleted ? deletedProducts : activeProducts).filter(
    (product) =>
      (categoryFilter === 'all' || product.category_id === categoryFilter) &&
      (product.name.toLowerCase().includes(search.toLowerCase()) ||
        product.sku?.toLowerCase().includes(search.toLowerCase()))
  );

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return 'Unknown';
    return categories.find((c) => c.id === categoryId)?.name || 'Unknown';
  };

  const getProductStock = (productId: string) => {
    return batches
      .filter(b => b.product_id === productId && !(b as any).is_deleted)
      .reduce((sum, b) => sum + b.quantity, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Auto-generate SKU if not provided
    let sku = formData.sku;
    if (!sku && !editingProduct) {
      const categoryName = categories.find(c => c.id === formData.category_id)?.name || '';
      const existingSKUs = products.map(p => p.sku).filter(Boolean) as string[];
      sku = generateSKU(categoryName, existingSKUs);
    }
    
    const productData = {
      name: formData.name,
      category_id: formData.category_id || null,
      unit: formData.unit,
      sales_price: parseFloat(formData.sales_price) || 0,
      cost_price: parseFloat(formData.cost_price) || 0,
      sku: sku || null,
      active: true,
    };

    if (editingProduct) {
      await updateProduct.mutateAsync({ id: editingProduct.id, ...productData });
    } else {
      await addProduct.mutateAsync(productData);
    }

    resetForm();
    setDialogOpen(false);
  };

  const handleEdit = (product: DbProduct) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      category_id: product.category_id || '',
      unit: product.unit,
      sales_price: product.sales_price.toString(),
      cost_price: product.cost_price.toString(),
      sku: product.sku || '',
    });
    setDialogOpen(true);
  };

  const handleSoftDelete = (product: DbProduct) => {
    setSelectedProduct(product);
    setSoftDeleteDialogOpen(true);
  };

  const handleRestore = (product: DbProduct) => {
    setSelectedProduct(product);
    setRestoreDialogOpen(true);
  };

  const handlePermanentDelete = (product: DbProduct) => {
    setSelectedProduct(product);
    setPermanentDeleteDialogOpen(true);
  };

  const confirmSoftDelete = async () => {
    if (selectedProduct) {
      await softDelete.mutateAsync({ id: selectedProduct.id, name: selectedProduct.name });
      setSoftDeleteDialogOpen(false);
      setSelectedProduct(null);
    }
  };

  const confirmRestore = async () => {
    if (selectedProduct) {
      await restore.mutateAsync({ id: selectedProduct.id, name: selectedProduct.name });
      setRestoreDialogOpen(false);
      setSelectedProduct(null);
    }
  };

  const confirmPermanentDelete = async () => {
    if (selectedProduct) {
      await permanentDelete.mutateAsync({ id: selectedProduct.id, name: selectedProduct.name });
      setPermanentDeleteDialogOpen(false);
      setSelectedProduct(null);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category_id: '',
      unit: 'Piece' as DbProduct['unit'],
      sales_price: '',
      cost_price: '',
      sku: '',
    });
    setEditingProduct(null);
    setNewCategoryName('');
    setShowAddCategory(false);
  };

  if (productsLoading) {
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
          <h1 className="page-title">Products</h1>
          <p className="text-muted-foreground">Manage your medicine inventory</p>
        </div>
        <div className="flex items-center gap-2">
          <TrashToggle 
            showDeleted={showDeleted} 
            onToggle={setShowDeleted} 
            deletedCount={deletedProducts.length} 
          />
          <Button variant="outline" onClick={() => setShowCategoryManagement(!showCategoryManagement)}>
            <Settings className="w-4 h-4 mr-2" />
            {showCategoryManagement ? 'Hide Categories' : 'Manage Categories'}
          </Button>
          <ProductImport />
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Product
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="input-group">
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Napa Syrup 60ml"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="input-group">
                  <Label htmlFor="category">Category *</Label>
                  <div className="flex gap-2">
                    <Select
                      value={formData.category_id}
                      onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                    >
                      <SelectTrigger className="flex-1">
                        {categoriesLoading ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Loading...
                          </span>
                        ) : (
                          <SelectValue placeholder="Select category" />
                        )}
                      </SelectTrigger>
                      <SelectContent className="bg-popover z-50">
                        {activeCategories.length === 0 && !categoriesLoading ? (
                          <div className="p-2 text-sm text-muted-foreground text-center">
                            No categories found
                          </div>
                        ) : (
                          activeCategories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <Popover open={showAddCategory} onOpenChange={setShowAddCategory}>
                      <PopoverTrigger asChild>
                        <Button type="button" variant="outline" size="icon" title="Add new category">
                          <PlusCircle className="w-4 h-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 bg-popover z-50" align="end">
                        <div className="space-y-3">
                          <Label>New Category Name</Label>
                          <Input
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            placeholder="e.g., Inhaler"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddCategory();
                              }
                            }}
                          />
                          <Button 
                            type="button" 
                            size="sm" 
                            className="w-full"
                            onClick={handleAddCategory}
                            disabled={!newCategoryName.trim() || addCategory.isPending}
                          >
                            {addCategory.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Add Category
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="input-group">
                  <Label htmlFor="unit">Unit *</Label>
                  <Select
                    value={formData.unit}
                    onValueChange={(value: DbProduct['unit']) => setFormData({ ...formData, unit: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      {UNIT_OPTIONS.map((unit) => (
                        <SelectItem key={unit} value={unit}>
                          {unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="input-group">
                  <Label htmlFor="cost_price">TP Rate (৳) *</Label>
                  <Input
                    id="cost_price"
                    type="number"
                    step="0.01"
                    value={formData.cost_price}
                    onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">Trade Price / Buying Rate</p>
                </div>

                <div className="input-group">
                  <Label htmlFor="sales_price">MRP (৳) *</Label>
                  <Input
                    id="sales_price"
                    type="number"
                    step="0.01"
                    value={formData.sales_price}
                    onChange={(e) => setFormData({ ...formData, sales_price: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">Maximum Retail Price</p>
                </div>
              </div>

              <div className="input-group">
                <Label htmlFor="sku">SKU {!editingProduct && <span className="text-xs text-muted-foreground">(Auto-generated if empty)</span>}</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder={editingProduct ? 'Enter SKU' : 'Leave empty for auto-generate'}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={addProduct.isPending || updateProduct.isPending}>
                  {(addProduct.isPending || updateProduct.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingProduct ? 'Update Product' : 'Add Product'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Category Management Section */}
      {showCategoryManagement && (
        <div className="bg-muted/50 rounded-lg p-4 border">
          <CategoryManagement />
        </div>
      )}

      {/* Trash view header */}
      {showDeleted && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-center gap-2">
          <Trash2 className="w-5 h-5 text-destructive" />
          <span className="font-medium text-destructive">Trash / ডিলিটেড প্রোডাক্ট</span>
          <span className="text-sm text-muted-foreground">({deletedProducts.length} items)</span>
        </div>
      )}

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {/* Category Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              <SelectItem value="all">All Categories</SelectItem>
              {activeCategories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {categoryFilter !== 'all' && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCategoryFilter('all')}
              className="h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Products Table */}
      <DataTable
        columns={[
          {
            key: 'name',
            header: 'Product',
            render: (product) => (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Package className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{product.name}</p>
                  <p className="text-xs text-muted-foreground">{product.sku || 'No SKU'}</p>
                </div>
              </div>
            ),
          },
          {
            key: 'category',
            header: 'Category',
            render: (product) => (
              <span className="badge-info">{getCategoryName(product.category_id)}</span>
            ),
          },
          { key: 'unit', header: 'Unit' },
          {
            key: 'cost_price',
            header: 'TP Rate',
            render: (product) => (
              <span className="text-muted-foreground">{formatCurrency(Number(product.cost_price))}</span>
            ),
          },
          {
            key: 'sales_price',
            header: 'MRP',
            render: (product) => (
              <span className="font-medium text-primary">{formatCurrency(Number(product.sales_price))}</span>
            ),
          },
          {
            key: 'stock',
            header: 'Stock',
            render: (product) => {
              const stock = getProductStock(product.id);
              return (
                <span className={stock < 50 ? 'badge-warning' : 'badge-success'}>
                  {stock} {product.unit}
                </span>
              );
            },
          },
          {
            key: 'actions',
            header: 'Actions',
            render: (product) => (
              <div className="flex items-center gap-1">
                {showDeleted ? (
                  // Trash view actions
                  <>
                    <Button variant="ghost" size="icon" onClick={() => handleRestore(product)} title="Restore">
                      <RotateCcw className="w-4 h-4 text-primary" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handlePermanentDelete(product)} className="text-destructive hover:text-destructive" title="Permanent Delete">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  // Active view actions
                  <>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(product)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleSoftDelete(product)} className="text-destructive hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            ),
          },
        ]}
        data={filteredProducts}
        keyExtractor={(product) => product.id}
        emptyMessage={showDeleted ? "Trash is empty" : "No products found"}
      />

      {/* Soft Delete Dialog */}
      <SoftDeleteDialog
        open={softDeleteDialogOpen}
        onOpenChange={setSoftDeleteDialogOpen}
        itemName={selectedProduct?.name || ''}
        onConfirm={confirmSoftDelete}
        isPending={softDelete.isPending}
      />

      {/* Restore Dialog */}
      <RestoreDialog
        open={restoreDialogOpen}
        onOpenChange={setRestoreDialogOpen}
        itemName={selectedProduct?.name || ''}
        onConfirm={confirmRestore}
        isPending={restore.isPending}
      />

      {/* Permanent Delete Dialog */}
      <PermanentDeleteDialog
        open={permanentDeleteDialogOpen}
        onOpenChange={setPermanentDeleteDialogOpen}
        itemName={selectedProduct?.name || ''}
        itemId={selectedProduct?.id || ''}
        table="products"
        onConfirm={confirmPermanentDelete}
        isPending={permanentDelete.isPending}
      />
    </div>
  );
}
