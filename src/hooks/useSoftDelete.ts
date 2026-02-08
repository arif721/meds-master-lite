import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export type SoftDeleteTable = 
  | 'products' 
  | 'customers' 
  | 'stores' 
  | 'invoices' 
  | 'payments' 
  | 'batches' 
  | 'sellers' 
  | 'categories'
  | 'raw_materials'
  | 'raw_material_lots';

export type SoftDeleteEntityType = 
  | 'PRODUCT' 
  | 'CUSTOMER' 
  | 'INVOICE' 
  | 'PAYMENT' 
  | 'BATCH' 
  | 'SELLER' 
  | 'CATEGORY';

const TABLE_TO_ENTITY: Record<SoftDeleteTable, SoftDeleteEntityType> = {
  products: 'PRODUCT',
  customers: 'CUSTOMER',
  stores: 'CUSTOMER', // Stores use CUSTOMER entity type in audit
  invoices: 'INVOICE',
  payments: 'PAYMENT',
  batches: 'BATCH',
  sellers: 'SELLER',
  categories: 'CATEGORY',
  raw_materials: 'PRODUCT',
  raw_material_lots: 'BATCH',
};

const TABLE_LABELS: Record<SoftDeleteTable, { singular: string; pluralBn: string }> = {
  products: { singular: 'Product', pluralBn: 'প্রোডাক্ট' },
  customers: { singular: 'Customer', pluralBn: 'কাস্টমার' },
  stores: { singular: 'Store', pluralBn: 'স্টোর' },
  invoices: { singular: 'Invoice', pluralBn: 'ইনভয়েস' },
  payments: { singular: 'Payment', pluralBn: 'পেমেন্ট' },
  batches: { singular: 'Batch', pluralBn: 'স্টক' },
  sellers: { singular: 'Seller', pluralBn: 'সেলার' },
  categories: { singular: 'Category', pluralBn: 'ক্যাটাগরি' },
  raw_materials: { singular: 'Raw Material', pluralBn: 'কাঁচামাল' },
  raw_material_lots: { singular: 'Lot', pluralBn: 'লট' },
};

// Check for dependencies before permanent delete
export async function checkDependencies(
  table: SoftDeleteTable, 
  id: string
): Promise<{ hasDependencies: boolean; dependencyLabels: string[] }> {
  const dependencyLabels: string[] = [];
  
  try {
    // Check dependencies based on table type
    if (table === 'products') {
      const { data: invoiceLines } = await supabase.from('invoice_lines').select('id').eq('product_id', id).limit(5);
      if (invoiceLines && invoiceLines.length > 0) dependencyLabels.push(`${invoiceLines.length}+ ইনভয়েস লাইন`);
      
      const { data: batches } = await supabase.from('batches').select('id').eq('product_id', id).limit(5);
      if (batches && batches.length > 0) dependencyLabels.push(`${batches.length}+ স্টক ব্যাচ`);
    }
    
    if (table === 'customers') {
      const { data: invoices } = await supabase.from('invoices').select('id').eq('customer_id', id).limit(5);
      if (invoices && invoices.length > 0) dependencyLabels.push(`${invoices.length}+ ইনভয়েস`);
    }
    
    if (table === 'stores') {
      const { data: invoices } = await supabase.from('invoices').select('id').eq('store_id', id).limit(5);
      if (invoices && invoices.length > 0) dependencyLabels.push(`${invoices.length}+ ইনভয়েস`);
    }
    
    if (table === 'invoices') {
      const { data: payments } = await supabase.from('payments').select('id').eq('invoice_id', id).limit(5);
      if (payments && payments.length > 0) dependencyLabels.push(`${payments.length}+ পেমেন্ট`);
    }
    
    if (table === 'batches') {
      const { data: invoiceLines } = await supabase.from('invoice_lines').select('id').eq('batch_id', id).limit(5);
      if (invoiceLines && invoiceLines.length > 0) dependencyLabels.push(`${invoiceLines.length}+ ইনভয়েস লাইন`);
    }
    
    if (table === 'sellers') {
      const { data: invoices } = await supabase.from('invoices').select('id').eq('seller_id', id).limit(5);
      if (invoices && invoices.length > 0) dependencyLabels.push(`${invoices.length}+ ইনভয়েস`);
    }
    
    if (table === 'categories') {
      const { data: products } = await supabase.from('products').select('id').eq('category_id', id).limit(5);
      if (products && products.length > 0) dependencyLabels.push(`${products.length}+ প্রোডাক্ট`);
    }
  } catch (err) {
    console.warn('Dependency check error:', err);
  }
  
  return {
    hasDependencies: dependencyLabels.length > 0,
    dependencyLabels,
  };
}

// Soft Delete Hook
export function useSoftDelete(table: SoftDeleteTable) {
  const queryClient = useQueryClient();
  const label = TABLE_LABELS[table];
  const entityType = TABLE_TO_ENTITY[table];
  
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      // INVOICE STOCK ROLLBACK: If deleting a confirmed invoice, restore stock
      if (table === 'invoices') {
        const { data: invoice } = await supabase
          .from('invoices')
          .select('status, invoice_number')
          .eq('id', id)
          .single();
        
        if (invoice && (invoice.status === 'CONFIRMED' || invoice.status === 'PAID' || invoice.status === 'PARTIAL')) {
          // Get invoice lines
          const { data: lines } = await supabase
            .from('invoice_lines')
            .select('*')
            .eq('invoice_id', id);
          
          if (lines) {
            for (const line of lines) {
              if (line.batch_id) {
                const totalQty = (line.quantity || 0) + (line.free_quantity || 0);
                
                // Restore batch stock
                const { data: batch } = await supabase
                  .from('batches')
                  .select('quantity')
                  .eq('id', line.batch_id)
                  .single();
                
                if (batch) {
                  await supabase
                    .from('batches')
                    .update({ quantity: batch.quantity + totalQty })
                    .eq('id', line.batch_id);
                }
                
                // Add reversal stock ledger entries
                if (line.quantity > 0) {
                  await supabase.from('stock_ledger').insert({
                    product_id: line.product_id,
                    batch_id: line.batch_id,
                    type: 'RETURN',
                    quantity: line.quantity,
                    reference: invoice.invoice_number,
                    notes: `Stock reversal (invoice deleted): +${line.quantity}`,
                  });
                }
                if (line.free_quantity > 0) {
                  await supabase.from('stock_ledger').insert({
                    product_id: line.product_id,
                    batch_id: line.batch_id,
                    type: 'RETURN',
                    quantity: line.free_quantity,
                    reference: invoice.invoice_number,
                    notes: `Free qty reversal (invoice deleted): +${line.free_quantity}`,
                  });
                }
              }
            }
          }
        }
      }

      let error: any = null;
      
      // Use specific table updates to avoid TypeScript issues
      if (table === 'products') {
        const result = await supabase.from('products').update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: 'admin' }).eq('id', id);
        error = result.error;
      } else if (table === 'customers') {
        const result = await supabase.from('customers').update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: 'admin' }).eq('id', id);
        error = result.error;
      } else if (table === 'stores') {
        const result = await supabase.from('stores').update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: 'admin' }).eq('id', id);
        error = result.error;
      } else if (table === 'invoices') {
        const result = await supabase.from('invoices').update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: 'admin' }).eq('id', id);
        error = result.error;
      } else if (table === 'payments') {
        const result = await supabase.from('payments').update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: 'admin' }).eq('id', id);
        error = result.error;
      } else if (table === 'batches') {
        const result = await supabase.from('batches').update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: 'admin' }).eq('id', id);
        error = result.error;
      } else if (table === 'sellers') {
        const result = await supabase.from('sellers').update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: 'admin' }).eq('id', id);
        error = result.error;
      } else if (table === 'categories') {
        const result = await supabase.from('categories').update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: 'admin' }).eq('id', id);
        error = result.error;
      }
      
      if (error) throw error;
      
      await supabase.from('audit_logs').insert({
        action: 'DELETE',
        entity_type: entityType,
        entity_id: id,
        entity_name: name,
        changes: { soft_delete: true, stock_rollback: table === 'invoices' },
      });
      
      return { id, name };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [table] });
      queryClient.invalidateQueries({ queryKey: ['audit_logs'] });
      if (table === 'invoices') {
        queryClient.invalidateQueries({ queryKey: ['batches'] });
        queryClient.invalidateQueries({ queryKey: ['stock_ledger'] });
      }
      toast({ 
        title: `${label.pluralBn} ট্র্যাশে সরানো হয়েছে`,
        description: table === 'invoices' 
          ? `"${data.name}" ট্র্যাশে সরানো হয়েছে এবং স্টক ফিরিয়ে দেওয়া হয়েছে।`
          : `"${data.name}" ট্র্যাশে সরানো হয়েছে। পরে রিস্টোর করতে পারবেন।`,
      });
    },
    onError: (error: Error) => {
      toast({ 
        title: `Error deleting ${label.singular.toLowerCase()}`, 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });
}

// Restore Hook
export function useRestore(table: SoftDeleteTable) {
  const queryClient = useQueryClient();
  const label = TABLE_LABELS[table];
  const entityType = TABLE_TO_ENTITY[table];
  
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      let error: any = null;
      
      if (table === 'products') {
        const result = await supabase.from('products').update({ is_deleted: false, deleted_at: null, deleted_by: null }).eq('id', id);
        error = result.error;
      } else if (table === 'customers') {
        const result = await supabase.from('customers').update({ is_deleted: false, deleted_at: null, deleted_by: null }).eq('id', id);
        error = result.error;
      } else if (table === 'stores') {
        const result = await supabase.from('stores').update({ is_deleted: false, deleted_at: null, deleted_by: null }).eq('id', id);
        error = result.error;
      } else if (table === 'invoices') {
        const result = await supabase.from('invoices').update({ is_deleted: false, deleted_at: null, deleted_by: null }).eq('id', id);
        error = result.error;
      } else if (table === 'payments') {
        const result = await supabase.from('payments').update({ is_deleted: false, deleted_at: null, deleted_by: null }).eq('id', id);
        error = result.error;
      } else if (table === 'batches') {
        const result = await supabase.from('batches').update({ is_deleted: false, deleted_at: null, deleted_by: null }).eq('id', id);
        error = result.error;
      } else if (table === 'sellers') {
        const result = await supabase.from('sellers').update({ is_deleted: false, deleted_at: null, deleted_by: null }).eq('id', id);
        error = result.error;
      } else if (table === 'categories') {
        const result = await supabase.from('categories').update({ is_deleted: false, deleted_at: null, deleted_by: null }).eq('id', id);
        error = result.error;
      }
      
      if (error) throw error;
      
      await supabase.from('audit_logs').insert({
        action: 'UPDATE',
        entity_type: entityType,
        entity_id: id,
        entity_name: name,
        changes: { restored: true },
      });
      
      return { id, name };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [table] });
      queryClient.invalidateQueries({ queryKey: ['audit_logs'] });
      toast({ 
        title: `${label.pluralBn} রিস্টোর হয়েছে`,
        description: `"${data.name}" সফলভাবে রিস্টোর করা হয়েছে।`,
      });
    },
    onError: (error: Error) => {
      toast({ 
        title: `Error restoring ${label.singular.toLowerCase()}`, 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });
}

// Permanent Delete Hook
export function usePermanentDelete(table: SoftDeleteTable) {
  const queryClient = useQueryClient();
  const label = TABLE_LABELS[table];
  const entityType = TABLE_TO_ENTITY[table];
  
  return useMutation({
    mutationFn: async ({ id, name, skipDependencyCheck = false }: { id: string; name: string; skipDependencyCheck?: boolean }) => {
      // Check dependencies first unless explicitly skipped
      if (!skipDependencyCheck) {
        const { hasDependencies, dependencyLabels } = await checkDependencies(table, id);
        if (hasDependencies) {
          throw new Error(`সম্পর্কিত ডাটা আছে: ${dependencyLabels.join(', ')}। প্রথমে সেগুলো ডিলিট করুন।`);
        }
      }
      
      let error: any = null;
      
      if (table === 'products') {
        const result = await supabase.from('products').delete().eq('id', id);
        error = result.error;
      } else if (table === 'customers') {
        const result = await supabase.from('customers').delete().eq('id', id);
        error = result.error;
      } else if (table === 'stores') {
        const result = await supabase.from('stores').delete().eq('id', id);
        error = result.error;
      } else if (table === 'invoices') {
        const result = await supabase.from('invoices').delete().eq('id', id);
        error = result.error;
      } else if (table === 'payments') {
        const result = await supabase.from('payments').delete().eq('id', id);
        error = result.error;
      } else if (table === 'batches') {
        const result = await supabase.from('batches').delete().eq('id', id);
        error = result.error;
      } else if (table === 'sellers') {
        const result = await supabase.from('sellers').delete().eq('id', id);
        error = result.error;
      } else if (table === 'categories') {
        const result = await supabase.from('categories').delete().eq('id', id);
        error = result.error;
      }
      
      if (error) throw error;
      
      await supabase.from('audit_logs').insert({
        action: 'DELETE',
        entity_type: entityType,
        entity_id: id,
        entity_name: name,
        changes: { permanent_delete: true },
      });
      
      return { id, name };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [table] });
      queryClient.invalidateQueries({ queryKey: ['audit_logs'] });
      toast({ 
        title: `${label.pluralBn} স্থায়ীভাবে ডিলিট হয়েছে`,
        description: `"${data.name}" ডাটাবেস থেকে সম্পূর্ণ মুছে ফেলা হয়েছে।`,
      });
    },
    onError: (error: Error) => {
      toast({ 
        title: `ডিলিট করা যায়নি`, 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });
}
