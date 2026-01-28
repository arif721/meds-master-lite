import React, { useState, useRef } from 'react';
import { Upload, Trash2, Check, Loader2, PenTool, Star, StarOff, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSellers, DbSeller } from '@/hooks/useDatabase';

interface Signature {
  id: string;
  seller_id: string | null;
  name: string;
  image_url: string;
  is_default: boolean;
  signature_type: 'prepared_by' | 'representative' | 'customer';
  created_at: string;
  updated_at: string;
}

const MAX_FILE_SIZE = 500 * 1024; // 500KB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];

export default function SignatureManagement() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [signatureToDelete, setSignatureToDelete] = useState<Signature | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [editingSignature, setEditingSignature] = useState<Signature | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    sellerId: '',
    signatureType: 'prepared_by' as 'prepared_by' | 'representative',
    isDefault: false,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { data: sellers = [] } = useSellers();
  const activeSellers = sellers.filter((s: DbSeller) => s.active);

  // Fetch signatures
  const { data: signatures = [], isLoading } = useQuery({
    queryKey: ['signatures'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('signatures')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Signature[];
    },
  });

  // Add signature mutation
  const addSignatureMutation = useMutation({
    mutationFn: async (data: { 
      name: string; 
      sellerId: string | null; 
      signatureType: string;
      isDefault: boolean;
      imageUrl: string;
    }) => {
      // If setting as default, unset other defaults for same seller/type
      if (data.isDefault) {
        await supabase
          .from('signatures')
          .update({ is_default: false })
          .eq('seller_id', data.sellerId || '')
          .eq('signature_type', data.signatureType);
      }

      const { data: result, error } = await supabase
        .from('signatures')
        .insert({
          name: data.name,
          seller_id: data.sellerId || null,
          signature_type: data.signatureType,
          is_default: data.isDefault,
          image_url: data.imageUrl,
        })
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['signatures'] });
      toast({ title: 'Signature Added', description: 'Signature saved successfully' });
      resetForm();
      setDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Update signature mutation
  const updateSignatureMutation = useMutation({
    mutationFn: async (data: { 
      id: string;
      name: string; 
      sellerId: string | null; 
      signatureType: string;
      isDefault: boolean;
      imageUrl?: string;
    }) => {
      // If setting as default, unset other defaults for same seller/type
      if (data.isDefault) {
        await supabase
          .from('signatures')
          .update({ is_default: false })
          .eq('seller_id', data.sellerId || '')
          .eq('signature_type', data.signatureType)
          .neq('id', data.id);
      }

      const updateData: any = {
        name: data.name,
        seller_id: data.sellerId || null,
        signature_type: data.signatureType,
        is_default: data.isDefault,
      };
      
      if (data.imageUrl) {
        updateData.image_url = data.imageUrl;
      }

      const { data: result, error } = await supabase
        .from('signatures')
        .update(updateData)
        .eq('id', data.id)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['signatures'] });
      toast({ title: 'Signature Updated', description: 'Signature updated successfully' });
      resetForm();
      setDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Delete signature mutation
  const deleteSignatureMutation = useMutation({
    mutationFn: async (signature: Signature) => {
      // Delete from storage first
      const fileName = signature.image_url.split('/').pop();
      if (fileName) {
        await supabase.storage.from('signatures').remove([fileName]);
      }
      
      const { error } = await supabase
        .from('signatures')
        .delete()
        .eq('id', signature.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['signatures'] });
      toast({ title: 'Signature Deleted', description: 'Signature removed successfully' });
      setDeleteDialogOpen(false);
      setSignatureToDelete(null);
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Set as default mutation
  const setDefaultMutation = useMutation({
    mutationFn: async (signature: Signature) => {
      // Unset other defaults for same seller/type
      await supabase
        .from('signatures')
        .update({ is_default: false })
        .eq('seller_id', signature.seller_id || '')
        .eq('signature_type', signature.signature_type);

      const { error } = await supabase
        .from('signatures')
        .update({ is_default: true })
        .eq('id', signature.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['signatures'] });
      toast({ title: 'Default Set', description: 'Signature set as default' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({
        title: 'Invalid File Type',
        description: 'Please upload a PNG or JPG image',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: 'File Too Large',
        description: 'Maximum file size is 500KB',
        variant: 'destructive',
      });
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const uploadImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('signatures')
      .upload(fileName, file, { contentType: file.type });
    
    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('signatures')
      .getPublicUrl(fileName);
    
    return urlData.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({ title: 'Name Required', description: 'Please enter a signature name', variant: 'destructive' });
      return;
    }

    if (!editingSignature && !selectedFile) {
      toast({ title: 'Image Required', description: 'Please upload a signature image', variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    try {
      let imageUrl = editingSignature?.image_url;
      
      if (selectedFile) {
        imageUrl = await uploadImage(selectedFile);
      }

      if (editingSignature) {
        await updateSignatureMutation.mutateAsync({
          id: editingSignature.id,
          name: formData.name,
          sellerId: formData.sellerId || null,
          signatureType: formData.signatureType,
          isDefault: formData.isDefault,
          imageUrl: selectedFile ? imageUrl : undefined,
        });
      } else {
        await addSignatureMutation.mutateAsync({
          name: formData.name,
          sellerId: formData.sellerId || null,
          signatureType: formData.signatureType,
          isDefault: formData.isDefault,
          imageUrl: imageUrl!,
        });
      }
    } catch (error: any) {
      toast({ title: 'Upload Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', sellerId: '', signatureType: 'prepared_by', isDefault: false });
    setSelectedFile(null);
    setPreviewUrl(null);
    setEditingSignature(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleEdit = (signature: Signature) => {
    setEditingSignature(signature);
    setFormData({
      name: signature.name,
      sellerId: signature.seller_id || '',
      signatureType: signature.signature_type as 'prepared_by' | 'representative',
      isDefault: signature.is_default,
    });
    setPreviewUrl(signature.image_url);
    setDialogOpen(true);
  };

  const handleDelete = (signature: Signature) => {
    setSignatureToDelete(signature);
    setDeleteDialogOpen(true);
  };

  const getSellerName = (sellerId: string | null) => {
    if (!sellerId) return 'All Sellers';
    return sellers.find((s: DbSeller) => s.id === sellerId)?.name || 'Unknown';
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'prepared_by': return 'Prepared By';
      case 'representative': return 'Representative';
      default: return type;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Signature Management</h3>
          <p className="text-muted-foreground text-sm">Manage signatures for invoices</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { 
          setDialogOpen(open); 
          if (!open) resetForm(); 
        }}>
          <DialogTrigger asChild>
            <Button>
              <PenTool className="w-4 h-4 mr-2" />
              Add Signature
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingSignature ? 'Edit Signature' : 'Add New Signature'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Signature Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., My Signature, Official Signature"
                />
              </div>

              <div className="space-y-2">
                <Label>Assign to Seller</Label>
                <Select
                  value={formData.sellerId}
                  onValueChange={(value) => setFormData({ ...formData, sellerId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select seller (optional)" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="">All Sellers (Global)</SelectItem>
                    {activeSellers.map((seller: DbSeller) => (
                      <SelectItem key={seller.id} value={seller.id}>
                        {seller.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Signature Type *</Label>
                <Select
                  value={formData.signatureType}
                  onValueChange={(value: 'prepared_by' | 'representative') => 
                    setFormData({ ...formData, signatureType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="prepared_by">Prepared By</SelectItem>
                    <SelectItem value="representative">Representative</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Signature Image * (PNG/JPG, max 500KB)</Label>
                <div className="border-2 border-dashed rounded-lg p-4 text-center">
                  {previewUrl ? (
                    <div className="space-y-3">
                      <img 
                        src={previewUrl} 
                        alt="Signature preview" 
                        className="max-h-24 mx-auto bg-white p-2 rounded"
                      />
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedFile(null);
                          setPreviewUrl(editingSignature?.image_url || null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                      >
                        Change Image
                      </Button>
                    </div>
                  ) : (
                    <div 
                      className="cursor-pointer py-6"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Click to upload signature</p>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="isDefault" className="cursor-pointer">Set as default signature</Label>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isUploading}>
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      {editingSignature ? 'Update' : 'Save'}
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Signatures Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : signatures.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <PenTool className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No signatures added yet</p>
            <p className="text-sm text-muted-foreground mt-1">Add your first signature to use in invoices</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {signatures.map((signature) => (
            <Card key={signature.id} className={signature.is_default ? 'border-primary' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {signature.name}
                      {signature.is_default && (
                        <Star className="w-4 h-4 text-primary fill-primary" />
                      )}
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">
                      {getSellerName(signature.seller_id)} • {getTypeLabel(signature.signature_type)}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="bg-muted/50 rounded-lg p-3 flex items-center justify-center min-h-[80px]">
                  <img 
                    src={signature.image_url} 
                    alt={signature.name}
                    className="max-h-16 max-w-full object-contain"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleEdit(signature)}
                  >
                    <Edit2 className="w-3.5 h-3.5 mr-1" />
                    Edit
                  </Button>
                  {!signature.is_default && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDefaultMutation.mutate(signature)}
                    >
                      <Star className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(signature)}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Signature?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{signatureToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => signatureToDelete && deleteSignatureMutation.mutate(signatureToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
