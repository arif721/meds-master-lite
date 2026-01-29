import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

// Store type matching Supabase schema
export type DbStore = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  contact_person: string | null;
  credit_limit: number;
  payment_terms: 'CASH' | '7_DAYS' | '15_DAYS' | '21_DAYS' | '30_DAYS';
  active: boolean;
  created_at: string;
  updated_at: string;
  customer_code?: string | null; // Auto-generated unique ID (GL-0001, GL-0002, etc.)
};

export const PAYMENT_TERMS_LABELS: Record<string, string> = {
  'CASH': 'Cash',
  '7_DAYS': '7 Days',
  '15_DAYS': '15 Days',
  '21_DAYS': '21 Days',
  '30_DAYS': '30 Days',
};

export const PAYMENT_TERMS_DAYS: Record<string, number> = {
  'CASH': 0,
  '7_DAYS': 7,
  '15_DAYS': 15,
  '21_DAYS': 21,
  '30_DAYS': 30,
};

// ============ STORES ============
export function useStores() {
  return useQuery({
    queryKey: ['stores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('is_deleted', false)
        .order('name');
      if (error) throw error;
      return data as DbStore[];
    },
  });
}

export function useStore(storeId: string | undefined) {
  return useQuery({
    queryKey: ['stores', storeId],
    queryFn: async () => {
      if (!storeId) return null;
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('id', storeId)
        .maybeSingle();
      if (error) throw error;
      return data as DbStore | null;
    },
    enabled: !!storeId,
  });
}

export function useAddStore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (store: Omit<DbStore, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('stores')
        .insert(store)
        .select()
        .single();
      if (error) throw error;
      
      await supabase.from('audit_logs').insert({
        action: 'CREATE',
        entity_type: 'CUSTOMER', // Using CUSTOMER type for stores in audit
        entity_id: data.id,
        entity_name: data.name,
      });
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      queryClient.invalidateQueries({ queryKey: ['audit_logs'] });
      toast({ title: 'Store added successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error adding store', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateStore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DbStore> & { id: string }) => {
      const { data, error } = await supabase
        .from('stores')
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
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      queryClient.invalidateQueries({ queryKey: ['audit_logs'] });
      toast({ title: 'Store updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating store', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteStore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name, soft = true }: { id: string; name: string; soft?: boolean }) => {
      if (soft) {
        // Soft delete - just mark as inactive
        const { error } = await supabase
          .from('stores')
          .update({ active: false })
          .eq('id', id);
        if (error) throw error;
      } else {
        // Hard delete
        const { error } = await supabase.from('stores').delete().eq('id', id);
        if (error) throw error;
      }
      
      await supabase.from('audit_logs').insert({
        action: 'DELETE',
        entity_type: 'CUSTOMER',
        entity_id: id,
        entity_name: name,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      queryClient.invalidateQueries({ queryKey: ['audit_logs'] });
      toast({ title: 'Store deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting store', description: error.message, variant: 'destructive' });
    },
  });
}

export function useRestoreStore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase
        .from('stores')
        .update({ active: true })
        .eq('id', id);
      if (error) throw error;
      
      await supabase.from('audit_logs').insert({
        action: 'UPDATE',
        entity_type: 'CUSTOMER',
        entity_id: id,
        entity_name: name,
        changes: { restored: true },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      queryClient.invalidateQueries({ queryKey: ['audit_logs'] });
      toast({ title: 'Store restored successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error restoring store', description: error.message, variant: 'destructive' });
    },
  });
}

// Helper hook to get store stats
export function useStoreStats(storeId?: string) {
  return useQuery({
    queryKey: ['store_stats', storeId],
    queryFn: async () => {
      // Get invoices for this store
      let query = supabase
        .from('invoices')
        .select('*, invoice_lines(*)')
        .neq('status', 'DRAFT')
        .neq('status', 'CANCELLED');
      
      if (storeId) {
        query = query.eq('store_id', storeId);
      }
      
      const { data: invoices, error } = await query;
      if (error) throw error;
      
      // Get payments
      const invoiceIds = invoices?.map(inv => inv.id) || [];
      let payments: any[] = [];
      
      if (invoiceIds.length > 0) {
        const { data: paymentData, error: paymentError } = await supabase
          .from('payments')
          .select('*')
          .in('invoice_id', invoiceIds);
        if (paymentError) throw paymentError;
        payments = paymentData || [];
      }
      
      return {
        invoices: invoices || [],
        payments,
      };
    },
    enabled: true,
  });
}
