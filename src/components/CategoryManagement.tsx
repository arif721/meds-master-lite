import { useState } from 'react';
import { Plus, Edit2, Trash2, RotateCcw, Loader2, Tag, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DataTable } from '@/components/DataTable';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { useCategories, useProducts, useAddCategory, DbCategory } from '@/hooks/useDatabase';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export default function CategoryManagement() {
  const { data: categories = [], isLoading: categoriesLoading } = useCategories();
  const { data: products = [] } = useProducts();
  const addCategory = useAddCategory();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<DbCategory | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<DbCategory | null>(null);
  const [formName, setFormName] = useState('');

  // Filter active and deleted categories
  const activeCategories = categories.filter((c: any) => c.active !== false);
  const deletedCategories = categories.filter((c: any) => c.active === false);

  // Get product count for a category
  const getProductCount = (categoryId: string) => {
    return products.filter(p => p.category_id === categoryId && p.active).length;
  };

  // Update category mutation
  const updateCategory = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { data, error } = await supabase
        .from('categories')
        .update({ name })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      
      await supabase.from('audit_logs').insert({
        action: 'UPDATE',
        entity_type: 'CATEGORY',
        entity_id: id,
        entity_name: name,
      });
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['audit_logs'] });
      toast({ title: 'Category updated successfully' });
      resetForm();
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating category', description: error.message, variant: 'destructive' });
    },
  });

  // Soft delete category mutation
  const softDeleteCategory = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase
        .from('categories')
        .update({ active: false })
        .eq('id', id);
      if (error) throw error;
      
      await supabase.from('audit_logs').insert({
        action: 'DELETE',
        entity_type: 'CATEGORY',
        entity_id: id,
        entity_name: name,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['audit_logs'] });
      toast({ title: 'Category deleted successfully' });
      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting category', description: error.message, variant: 'destructive' });
    },
  });

  // Restore category mutation
  const restoreCategory = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase
        .from('categories')
        .update({ active: true })
        .eq('id', id);
      if (error) throw error;
      
      await supabase.from('audit_logs').insert({
        action: 'UPDATE',
        entity_type: 'CATEGORY',
        entity_id: id,
        entity_name: name,
        changes: { restored: true },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['audit_logs'] });
      toast({ title: 'Category restored successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error restoring category', description: error.message, variant: 'destructive' });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    if (editingCategory) {
      await updateCategory.mutateAsync({ id: editingCategory.id, name: formName.trim() });
    } else {
      await addCategory.mutateAsync(formName.trim());
      resetForm();
    }
  };

  const handleEdit = (category: DbCategory) => {
    setEditingCategory(category);
    setFormName(category.name);
    setDialogOpen(true);
  };

  const handleDeleteClick = (category: DbCategory) => {
    const productCount = getProductCount(category.id);
    if (productCount > 0) {
      toast({
        title: 'Cannot delete category',
        description: `This category has ${productCount} product(s). Move products to another category first.`,
        variant: 'destructive',
      });
      return;
    }
    setCategoryToDelete(category);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (categoryToDelete) {
      await softDeleteCategory.mutateAsync({ id: categoryToDelete.id, name: categoryToDelete.name });
    }
  };

  const handleRestore = async (category: DbCategory) => {
    await restoreCategory.mutateAsync({ id: category.id, name: category.name });
  };

  const resetForm = () => {
    setFormName('');
    setEditingCategory(null);
    setDialogOpen(false);
  };

  if (categoriesLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Category Management</h3>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingCategory ? 'Edit Category' : 'Add New Category'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="input-group">
                <Label htmlFor="categoryName">Category Name *</Label>
                <Input
                  id="categoryName"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., Inhaler"
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit" disabled={addCategory.isPending || updateCategory.isPending}>
                  {(addCategory.isPending || updateCategory.isPending) && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {editingCategory ? 'Update' : 'Add'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-xs">
          <TabsTrigger value="active">Active ({activeCategories.length})</TabsTrigger>
          <TabsTrigger value="deleted">Deleted ({deletedCategories.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          <DataTable
            columns={[
              {
                key: 'name',
                header: 'Category Name',
                render: (category) => (
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{category.name}</span>
                  </div>
                ),
              },
              {
                key: 'products',
                header: 'Products',
                render: (category) => {
                  const count = getProductCount(category.id);
                  return (
                    <span className={count > 0 ? 'badge-info' : 'text-muted-foreground'}>
                      {count} product{count !== 1 ? 's' : ''}
                    </span>
                  );
                },
              },
              {
                key: 'actions',
                header: 'Actions',
                render: (category) => (
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(category)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteClick(category)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ),
              },
            ]}
            data={activeCategories}
            keyExtractor={(category) => category.id}
            emptyMessage="No categories found"
          />
        </TabsContent>

        <TabsContent value="deleted" className="mt-4">
          {deletedCategories.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Archive className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No deleted categories</p>
            </div>
          ) : (
            <DataTable
              columns={[
                {
                  key: 'name',
                  header: 'Category Name',
                  render: (category) => (
                    <div className="flex items-center gap-2 opacity-60">
                      <Tag className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{category.name}</span>
                    </div>
                  ),
                },
                {
                  key: 'actions',
                  header: 'Actions',
                  render: (category) => (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRestore(category)}
                      disabled={restoreCategory.isPending}
                    >
                      {restoreCategory.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <RotateCcw className="w-4 h-4 mr-2" />
                      )}
                      Restore
                    </Button>
                  ),
                },
              ]}
              data={deletedCategories}
              keyExtractor={(category) => category.id}
              emptyMessage="No deleted categories"
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{categoryToDelete?.name}</strong>?
              This category will be moved to the deleted list and can be restored later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {softDeleteCategory.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
