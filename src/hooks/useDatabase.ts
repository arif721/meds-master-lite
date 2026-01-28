import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

// Helper function to check if error is JWT expired
function isJWTExpiredError(error: any): boolean {
  return (
    error?.message?.toLowerCase().includes('jwt expired') ||
    error?.code === 'PGRST301' ||
    error?.code === 'PGRST303'
  );
}

// Helper function to handle JWT expired errors
function handleJWTExpiredError() {
  toast({
    title: 'Session Expired',
    description: 'Your session has expired. Please login again.',
    variant: 'destructive',
  });
  
  // Sign out and redirect to login
  setTimeout(() => {
    supabase.auth.signOut().then(() => {
      window.location.href = '/auth';
    });
  }, 1500);
}

// Database types matching Supabase schema
export type DbCategory = {
  id: string;
  name: string;
  created_at: string;
};

export type DbProduct = {
  id: string;
  name: string;
  category_id: string | null;
  unit: 'Tablet' | 'Capsule' | 'Bottle' | 'Box' | 'Strip' | 'Piece' | 'Tube' | 'Jar' | 'Pot';
  cost_price: number; // Internal accounting cost for P&L
  tp_rate: number;    // Trade Price / Buying rate from supplier
  sales_price: number; // MRP - Maximum Retail Price
  sku: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type DbSeller = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  commission_type: 'PERCENTAGE' | 'FIXED';
  commission_value: number;
  active: boolean;
  created_at: string;
};

export type DbBatch = {
  id: string;
  product_id: string;
  batch_number: string;
  quantity: number;
  cost_price: number;
  expiry_date: string | null;
  created_at: string;
};

export type DbCustomer = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  seller_id: string | null;
  created_at: string;
};

export type DbInvoice = {
  id: string;
  invoice_number: string;
  customer_id: string;
  seller_id: string | null;
  store_id: string | null;
  status: 'DRAFT' | 'CONFIRMED' | 'PAID' | 'PARTIAL' | 'CANCELLED';
  subtotal: number;
  discount: number;
  total: number;
  paid: number;
  due: number;
  notes: string | null;
  created_at: string;
};

export type DbInvoiceLine = {
  id: string;
  invoice_id: string;
  product_id: string;
  batch_id: string | null;
  quantity: number;
  unit_price: number; // MRP at time of sale
  total: number;
  returned_quantity: number;
  cost_price: number;
  free_quantity: number;
  tp_rate: number; // TP Rate at time of sale
  discount_type: 'AMOUNT' | 'PERCENT';
  discount_value: number;
};

export type DbPayment = {
  id: string;
  invoice_id: string;
  amount: number;
  method: 'CASH' | 'BANK' | 'BKASH' | 'NAGAD' | 'CHECK' | 'OTHER';
  reference: string | null;
  notes: string | null;
  created_at: string;
};

export type DbStockLedger = {
  id: string;
  product_id: string;
  batch_id: string | null;
  type: 'OPENING' | 'PURCHASE' | 'SALE' | 'RETURN' | 'ADJUSTMENT' | 'DAMAGE' | 'EXPIRED' | 'FREE';
  quantity: number;
  reference: string | null;
  notes: string | null;
  created_at: string;
};

export type DbQuotation = {
  id: string;
  quotation_number: string;
  customer_id: string;
  seller_id: string | null;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CONVERTED';
  subtotal: number;
  discount: number;
  total: number;
  valid_until: string | null;
  notes: string | null;
  created_at: string;
};

export type DbQuotationLine = {
  id: string;
  quotation_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total: number;
  tp_rate: number;
  mrp: number;
  discount_type: 'AMOUNT' | 'PERCENT';
  discount_value: number;
};

export type DbStockAdjustment = {
  id: string;
  product_id: string;
  batch_id: string;
  type: 'DAMAGE' | 'EXPIRED' | 'LOST' | 'FOUND' | 'CORRECTION' | 'RETURN';
  quantity: number;
  reason: string | null;
  created_at: string;
  invoice_id: string | null;
  return_action: 'RESTOCK' | 'SCRAP' | null;
  return_value: number;
};

export type DbAuditLog = {
  id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entity_type: 'PRODUCT' | 'BATCH' | 'CUSTOMER' | 'SELLER' | 'INVOICE' | 'PAYMENT' | 'QUOTATION' | 'ADJUSTMENT' | 'CATEGORY';
  entity_id: string;
  entity_name: string | null;
  changes: Record<string, unknown> | null;
  user_id: string | null;
  user_name: string | null;
  timestamp: string;
};

// ============ CATEGORIES ============
export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as DbCategory[];
    },
  });
}

export function useAddCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from('categories')
        .insert({ name })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast({ title: 'Category added successfully' });
    },
    onError: (error: Error) => {
      // Check if JWT expired error
      if (isJWTExpiredError(error)) {
        handleJWTExpiredError();
        return;
      }
      
      // Handle duplicate category name
      if (error.message?.includes('duplicate key') || error.message?.includes('unique constraint')) {
        toast({ 
          title: 'Category already exists', 
          description: 'A category with this name already exists.', 
          variant: 'destructive' 
        });
        return;
      }
      
      // Generic error
      toast({ 
        title: 'Error adding category', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });
}

// ============ PRODUCTS ============
export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as DbProduct[];
    },
  });
}

export function useAddProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (product: Omit<DbProduct, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('products')
        .insert(product)
        .select()
        .single();
      if (error) throw error;
      
      // Add audit log
      await supabase.from('audit_logs').insert({
        action: 'CREATE',
        entity_type: 'PRODUCT',
        entity_id: data.id,
        entity_name: data.name,
      });
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['audit_logs'] });
      toast({ title: 'Product added successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error adding product', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DbProduct> & { id: string }) => {
      const { data, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      
      await supabase.from('audit_logs').insert({
        action: 'UPDATE',
        entity_type: 'PRODUCT',
        entity_id: data.id,
        entity_name: data.name,
        changes: updates,
      });
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['audit_logs'] });
      toast({ title: 'Product updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating product', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      
      await supabase.from('audit_logs').insert({
        action: 'DELETE',
        entity_type: 'PRODUCT',
        entity_id: id,
        entity_name: name,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['audit_logs'] });
      toast({ title: 'Product deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting product', description: error.message, variant: 'destructive' });
    },
  });
}

// ============ SELLERS ============
export function useSellers() {
  return useQuery({
    queryKey: ['sellers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sellers')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as DbSeller[];
    },
  });
}

export function useAddSeller() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (seller: Omit<DbSeller, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('sellers')
        .insert(seller)
        .select()
        .single();
      if (error) throw error;
      
      await supabase.from('audit_logs').insert({
        action: 'CREATE',
        entity_type: 'SELLER',
        entity_id: data.id,
        entity_name: data.name,
      });
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sellers'] });
      queryClient.invalidateQueries({ queryKey: ['audit_logs'] });
      toast({ title: 'Seller added successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error adding seller', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateSeller() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DbSeller> & { id: string }) => {
      const { data, error } = await supabase
        .from('sellers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      
      await supabase.from('audit_logs').insert({
        action: 'UPDATE',
        entity_type: 'SELLER',
        entity_id: data.id,
        entity_name: data.name,
        changes: updates,
      });
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sellers'] });
      queryClient.invalidateQueries({ queryKey: ['audit_logs'] });
      toast({ title: 'Seller updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating seller', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteSeller() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from('sellers').delete().eq('id', id);
      if (error) throw error;
      
      await supabase.from('audit_logs').insert({
        action: 'DELETE',
        entity_type: 'SELLER',
        entity_id: id,
        entity_name: name,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sellers'] });
      queryClient.invalidateQueries({ queryKey: ['audit_logs'] });
      toast({ title: 'Seller deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting seller', description: error.message, variant: 'destructive' });
    },
  });
}

// ============ BATCHES ============
export function useBatches() {
  return useQuery({
    queryKey: ['batches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('batches')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as DbBatch[];
    },
  });
}

export function useAddBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (batch: Omit<DbBatch, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('batches')
        .insert(batch)
        .select()
        .single();
      if (error) throw error;
      
      // Add opening stock ledger entry
      await supabase.from('stock_ledger').insert({
        product_id: data.product_id,
        batch_id: data.id,
        type: 'OPENING',
        quantity: data.quantity,
        notes: `Opening stock for batch ${data.batch_number}`,
      });
      
      await supabase.from('audit_logs').insert({
        action: 'CREATE',
        entity_type: 'BATCH',
        entity_id: data.id,
        entity_name: data.batch_number,
      });
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      queryClient.invalidateQueries({ queryKey: ['stock_ledger'] });
      queryClient.invalidateQueries({ queryKey: ['audit_logs'] });
      toast({ title: 'Batch added successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error adding batch', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DbBatch> & { id: string }) => {
      const { data, error } = await supabase
        .from('batches')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      
      await supabase.from('audit_logs').insert({
        action: 'UPDATE',
        entity_type: 'BATCH',
        entity_id: data.id,
        entity_name: data.batch_number,
        changes: updates,
      });
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      queryClient.invalidateQueries({ queryKey: ['audit_logs'] });
      toast({ title: 'Batch updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating batch', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, batchNumber }: { id: string; batchNumber: string }) => {
      const { error } = await supabase.from('batches').delete().eq('id', id);
      if (error) throw error;
      
      await supabase.from('audit_logs').insert({
        action: 'DELETE',
        entity_type: 'BATCH',
        entity_id: id,
        entity_name: batchNumber,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      queryClient.invalidateQueries({ queryKey: ['audit_logs'] });
      toast({ title: 'Batch deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting batch', description: error.message, variant: 'destructive' });
    },
  });
}

// ============ CUSTOMERS ============
export function useCustomers() {
  return useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as DbCustomer[];
    },
  });
}

export function useAddCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (customer: Omit<DbCustomer, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('customers')
        .insert(customer)
        .select()
        .single();
      if (error) throw error;
      
      await supabase.from('audit_logs').insert({
        action: 'CREATE',
        entity_type: 'CUSTOMER',
        entity_id: data.id,
        entity_name: data.name,
      });
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['audit_logs'] });
      toast({ title: 'Customer added successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error adding customer', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DbCustomer> & { id: string }) => {
      const { data, error } = await supabase
        .from('customers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      
      await supabase.from('audit_logs').insert({
        action: 'UPDATE',
        entity_type: 'CUSTOMER',
        entity_id: data.id,
        entity_name: data.name,
        changes: updates,
      });
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['audit_logs'] });
      toast({ title: 'Customer updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating customer', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from('customers').delete().eq('id', id);
      if (error) throw error;
      
      await supabase.from('audit_logs').insert({
        action: 'DELETE',
        entity_type: 'CUSTOMER',
        entity_id: id,
        entity_name: name,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['audit_logs'] });
      toast({ title: 'Customer deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting customer', description: error.message, variant: 'destructive' });
    },
  });
}

// ============ INVOICES ============
export function useInvoices() {
  return useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as DbInvoice[];
    },
  });
}

export function useInvoiceLines(invoiceId?: string) {
  return useQuery({
    queryKey: ['invoice_lines', invoiceId],
    queryFn: async () => {
      let query = supabase.from('invoice_lines').select('*');
      if (invoiceId) {
        query = query.eq('invoice_id', invoiceId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as DbInvoiceLine[];
    },
    enabled: true,
  });
}

export function useAddInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ 
      invoice, 
      lines 
    }: { 
      invoice: Omit<DbInvoice, 'id' | 'created_at'>; 
      lines: Omit<DbInvoiceLine, 'id' | 'invoice_id'>[] 
    }) => {
      // Insert invoice
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .insert(invoice)
        .select()
        .single();
      if (invoiceError) throw invoiceError;
      
      // Insert lines
      if (lines.length > 0) {
        const linesWithInvoiceId = lines.map(line => ({
          ...line,
          invoice_id: invoiceData.id,
        }));
        const { error: linesError } = await supabase
          .from('invoice_lines')
          .insert(linesWithInvoiceId);
        if (linesError) throw linesError;
      }
      
      await supabase.from('audit_logs').insert({
        action: 'CREATE',
        entity_type: 'INVOICE',
        entity_id: invoiceData.id,
        entity_name: invoiceData.invoice_number,
      });
      
      return invoiceData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice_lines'] });
      queryClient.invalidateQueries({ queryKey: ['audit_logs'] });
      toast({ title: 'Invoice created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating invoice', description: error.message, variant: 'destructive' });
    },
  });
}

export function useConfirmInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (invoiceId: string) => {
      // Get invoice and lines
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .single();
      if (invoiceError) throw invoiceError;
      
      const { data: lines, error: linesError } = await supabase
        .from('invoice_lines')
        .select('*')
        .eq('invoice_id', invoiceId);
      if (linesError) throw linesError;
      
      const lowStockWarnings: string[] = [];
      const LOW_STOCK_THRESHOLD = 50;
      
      // Validate stock for ALL lines first (Paid + Free quantity)
      for (const line of lines || []) {
        if (line.batch_id) {
          const { data: batch, error: batchError } = await supabase
            .from('batches')
            .select('quantity')
            .eq('id', line.batch_id)
            .single();
          if (batchError) throw batchError;
          
          // Total deduction = paid qty + free qty
          const totalDeduction = (line.quantity || 0) + (line.free_quantity || 0);
          
          // CRITICAL: Block if batch has zero stock
          if (batch.quantity <= 0) {
            const { data: product } = await supabase
              .from('products')
              .select('name')
              .eq('id', line.product_id)
              .single();
            throw new Error(`No stock available for ${product?.name || 'product'}. Add Opening Stock / Receive Stock first.`);
          }
          
          if (batch.quantity < totalDeduction) {
            const { data: product } = await supabase
              .from('products')
              .select('name')
              .eq('id', line.product_id)
              .single();
            throw new Error(`Insufficient stock for ${product?.name || 'product'}. Available: ${batch.quantity}, Required: ${totalDeduction}`);
          }
        }
      }
      
      // All validations passed - now deduct stock with separate ledger entries
      for (const line of lines || []) {
        if (line.batch_id) {
          const { data: batch } = await supabase
            .from('batches')
            .select('quantity')
            .eq('id', line.batch_id)
            .single();
          
          if (batch) {
            const paidQty = line.quantity || 0;
            const freeQty = line.free_quantity || 0;
            const totalDeduction = paidQty + freeQty;
            const newQuantity = batch.quantity - totalDeduction;
            
            // Deduct stock
            const { error: updateError } = await supabase
              .from('batches')
              .update({ quantity: Math.max(0, newQuantity) })
              .eq('id', line.batch_id);
            if (updateError) throw updateError;
            
            // Add SALE ledger entry (for paid qty only - this affects COGS)
            if (paidQty > 0) {
              await supabase.from('stock_ledger').insert({
                product_id: line.product_id,
                batch_id: line.batch_id,
                type: 'SALE',
                quantity: -paidQty,
                reference: invoice.invoice_number,
                notes: `Sold Qty: ${paidQty}`,
              });
            }
            
            // Add FREE ledger entry (for free qty - separate tracking, does NOT affect COGS)
            if (freeQty > 0) {
              await supabase.from('stock_ledger').insert({
                product_id: line.product_id,
                batch_id: line.batch_id,
                type: 'FREE',
                quantity: -freeQty,
                reference: invoice.invoice_number,
                notes: `Free Giveaway: ${freeQty}`,
              });
            }
            
            // Check low stock warning
            if (newQuantity <= LOW_STOCK_THRESHOLD && newQuantity > 0) {
              const { data: product } = await supabase
                .from('products')
                .select('name')
                .eq('id', line.product_id)
                .single();
              lowStockWarnings.push(`${product?.name || 'Product'}: only ${newQuantity} units left`);
            } else if (newQuantity <= 0) {
              const { data: product } = await supabase
                .from('products')
                .select('name')
                .eq('id', line.product_id)
                .single();
              lowStockWarnings.push(`${product?.name || 'Product'}: OUT OF STOCK`);
            }
          }
        }
      }
      
      // Update invoice status
      const { data, error } = await supabase
        .from('invoices')
        .update({ status: 'CONFIRMED' })
        .eq('id', invoiceId)
        .select()
        .single();
      if (error) throw error;
      
      return { invoice: data, lowStockWarnings };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      queryClient.invalidateQueries({ queryKey: ['stock_ledger'] });
      toast({ title: 'Invoice confirmed successfully' });
      
      // Show low stock warnings
      if (result.lowStockWarnings && result.lowStockWarnings.length > 0) {
        setTimeout(() => {
          toast({
            title: 'Low Stock Alert',
            description: result.lowStockWarnings.join(' | '),
            variant: 'destructive',
          });
        }, 500);
      }
    },
    onError: (error: Error) => {
      toast({ title: 'Error confirming invoice', description: error.message, variant: 'destructive' });
    },
  });
}

// ============ PAYMENTS ============
export function usePayments() {
  return useQuery({
    queryKey: ['payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as DbPayment[];
    },
  });
}

export function useAddPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payment: Omit<DbPayment, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('payments')
        .insert(payment)
        .select()
        .single();
      if (error) throw error;
      
      // Update invoice paid/due
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select('paid, due, invoice_number')
        .eq('id', payment.invoice_id)
        .single();
      if (invoiceError) throw invoiceError;
      
      const newPaid = Number(invoice.paid) + Number(payment.amount);
      const newDue = Number(invoice.due) - Number(payment.amount);
      const newStatus = newDue <= 0 ? 'PAID' : 'PARTIAL';
      
      await supabase
        .from('invoices')
        .update({ paid: newPaid, due: Math.max(0, newDue), status: newStatus })
        .eq('id', payment.invoice_id);
      
      await supabase.from('audit_logs').insert({
        action: 'CREATE',
        entity_type: 'PAYMENT',
        entity_id: data.id,
        entity_name: `Payment for ${invoice.invoice_number}`,
        changes: { amount: payment.amount },
      });
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['audit_logs'] });
      toast({ title: 'Payment recorded successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error recording payment', description: error.message, variant: 'destructive' });
    },
  });
}

// ============ STOCK LEDGER ============
export function useStockLedger() {
  return useQuery({
    queryKey: ['stock_ledger'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_ledger')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as DbStockLedger[];
    },
  });
}

// ============ QUOTATIONS ============
export function useQuotations() {
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

export function useQuotationLines(quotationId?: string) {
  return useQuery({
    queryKey: ['quotation_lines', quotationId],
    queryFn: async () => {
      let query = supabase.from('quotation_lines').select('*');
      if (quotationId) {
        query = query.eq('quotation_id', quotationId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as DbQuotationLine[];
    },
  });
}

export function useAddQuotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ 
      quotation, 
      lines 
    }: { 
      quotation: Omit<DbQuotation, 'id' | 'created_at'>; 
      lines: Omit<DbQuotationLine, 'id' | 'quotation_id'>[] 
    }) => {
      const { data: quotationData, error: quotationError } = await supabase
        .from('quotations')
        .insert(quotation)
        .select()
        .single();
      if (quotationError) throw quotationError;
      
      if (lines.length > 0) {
        const linesWithQuotationId = lines.map(line => ({
          ...line,
          quotation_id: quotationData.id,
        }));
        const { error: linesError } = await supabase
          .from('quotation_lines')
          .insert(linesWithQuotationId);
        if (linesError) throw linesError;
      }
      
      await supabase.from('audit_logs').insert({
        action: 'CREATE',
        entity_type: 'QUOTATION',
        entity_id: quotationData.id,
        entity_name: quotationData.quotation_number,
      });
      
      return quotationData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      queryClient.invalidateQueries({ queryKey: ['quotation_lines'] });
      queryClient.invalidateQueries({ queryKey: ['audit_logs'] });
      toast({ title: 'Quotation created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating quotation', description: error.message, variant: 'destructive' });
    },
  });
}

// ============ STOCK ADJUSTMENTS ============
export function useStockAdjustments() {
  return useQuery({
    queryKey: ['stock_adjustments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_adjustments')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as DbStockAdjustment[];
    },
  });
}

export function useAddStockAdjustment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (adjustment: Omit<DbStockAdjustment, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('stock_adjustments')
        .insert(adjustment)
        .select()
        .single();
      if (error) throw error;
      
      // Update batch quantity
      const { data: batch, error: batchError } = await supabase
        .from('batches')
        .select('quantity, batch_number')
        .eq('id', adjustment.batch_id)
        .single();
      if (batchError) throw batchError;
      
      const quantityChange = adjustment.type === 'FOUND' || adjustment.type === 'RETURN' 
        ? adjustment.quantity 
        : -adjustment.quantity;
      
      await supabase
        .from('batches')
        .update({ quantity: batch.quantity + quantityChange })
        .eq('id', adjustment.batch_id);
      
      // Add stock ledger entry
      const ledgerType = adjustment.type === 'RETURN' ? 'RETURN' : 
                        adjustment.type === 'DAMAGE' ? 'DAMAGE' :
                        adjustment.type === 'EXPIRED' ? 'EXPIRED' : 'ADJUSTMENT';
      
      await supabase.from('stock_ledger').insert({
        product_id: adjustment.product_id,
        batch_id: adjustment.batch_id,
        type: ledgerType,
        quantity: quantityChange,
        notes: adjustment.reason,
      });
      
      await supabase.from('audit_logs').insert({
        action: 'CREATE',
        entity_type: 'ADJUSTMENT',
        entity_id: data.id,
        entity_name: `${adjustment.type} - ${batch.batch_number}`,
      });
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock_adjustments'] });
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      queryClient.invalidateQueries({ queryKey: ['stock_ledger'] });
      queryClient.invalidateQueries({ queryKey: ['audit_logs'] });
      toast({ title: 'Stock adjustment recorded' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error recording adjustment', description: error.message, variant: 'destructive' });
    },
  });
}

// ============ AUDIT LOGS ============
export function useAuditLogs() {
  return useQuery({
    queryKey: ['audit_logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false });
      if (error) throw error;
      return data as DbAuditLog[];
    },
  });
}

// ============ DASHBOARD HELPERS ============
export function useDashboardMetrics() {
  const { data: products } = useProducts();
  const { data: batches } = useBatches();
  const { data: invoices } = useInvoices();
  const { data: payments } = usePayments();
  
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfYear = new Date(today.getFullYear(), 0, 1);
  
  const confirmedInvoices = invoices?.filter(i => i.status !== 'DRAFT' && i.status !== 'CANCELLED') || [];
  
  const todaySales = confirmedInvoices
    .filter(i => new Date(i.created_at) >= startOfDay)
    .reduce((sum, i) => sum + Number(i.total), 0);
    
  const monthSales = confirmedInvoices
    .filter(i => new Date(i.created_at) >= startOfMonth)
    .reduce((sum, i) => sum + Number(i.total), 0);
    
  const yearSales = confirmedInvoices
    .filter(i => new Date(i.created_at) >= startOfYear)
    .reduce((sum, i) => sum + Number(i.total), 0);
    
  const totalDue = confirmedInvoices.reduce((sum, i) => sum + Number(i.due), 0);
  
  const totalStockQuantity = batches?.reduce((sum, b) => sum + b.quantity, 0) || 0;
  
  const totalInventoryValue = batches?.reduce((sum, b) => sum + (b.quantity * Number(b.cost_price)), 0) || 0;
  
  const lowStockCount = batches?.filter(b => b.quantity > 0 && b.quantity < 50).length || 0;
  
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  const nearExpiryCount = batches?.filter(b => 
    b.expiry_date && new Date(b.expiry_date) <= thirtyDaysFromNow && b.quantity > 0
  ).length || 0;
  
  return {
    todaySales,
    monthSales,
    yearSales,
    totalDue,
    totalStockQuantity,
    totalInventoryValue,
    lowStockCount,
    nearExpiryCount,
    isLoading: !products || !batches || !invoices,
  };
}

// Helper to get customer due
export function useCustomerDue(customerId: string) {
  const { data: invoices } = useInvoices();
  
  const due = invoices
    ?.filter(i => i.customer_id === customerId && i.status !== 'DRAFT' && i.status !== 'CANCELLED')
    .reduce((sum, i) => sum + Number(i.due), 0) || 0;
    
  return due;
}
