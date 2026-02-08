import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export type SampleStatus = 'DRAFT' | 'CONFIRMED' | 'CANCELLED';

export type DbSample = {
  id: string;
  sample_number: string;
  sale_date_time: string;
  store_id: string | null;
  customer_id: string | null;
  seller_id: string | null;
  receiver_name: string | null;
  receiver_phone: string | null;
  total_value: number;
  notes: string | null;
  status: SampleStatus;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
  created_at: string;
};

export type DbSampleLine = {
  id: string;
  sample_id: string;
  product_id: string;
  batch_id: string | null;
  quantity: number;
  tp_rate: number;
  cost_price: number;
  total: number;
};

export function useSamples() {
  return useQuery({
    queryKey: ['samples'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('samples')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as DbSample[];
    },
  });
}

export function useSampleLines() {
  return useQuery({
    queryKey: ['sample_lines'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sample_lines')
        .select('*');
      if (error) throw error;
      return data as DbSampleLine[];
    },
  });
}

export function generateSampleNumber() {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = (now.getMonth() + 1).toString().padStart(2, '0');
  const d = now.getDate().toString().padStart(2, '0');
  const r = Math.floor(1000 + Math.random() * 9000);
  return `SMP-${y}${m}${d}-${r}`;
}

/** Deduct stock for sample lines */
async function deductStock(lines: { product_id: string; batch_id: string | null; quantity: number }[], sampleNumber: string) {
  for (const line of lines) {
    if (line.batch_id) {
      const { data: batch } = await supabase
        .from('batches')
        .select('quantity')
        .eq('id', line.batch_id)
        .single();

      if (batch) {
        const newQty = Math.max(0, batch.quantity - line.quantity);
        await supabase
          .from('batches')
          .update({ quantity: newQty })
          .eq('id', line.batch_id);

        await supabase.from('stock_ledger').insert({
          product_id: line.product_id,
          batch_id: line.batch_id,
          type: 'FREE',
          quantity: -line.quantity,
          reference: sampleNumber,
          notes: `Sample: ${line.quantity} pcs`,
        });
      }
    }
  }
}

/** Restore stock for sample lines (reversal) */
async function restoreStock(sampleId: string, sampleNumber: string) {
  const { data: lines } = await supabase
    .from('sample_lines')
    .select('*')
    .eq('sample_id', sampleId);

  if (lines && lines.length > 0) {
    for (const line of lines) {
      if (line.batch_id) {
        const { data: batch } = await supabase
          .from('batches')
          .select('quantity')
          .eq('id', line.batch_id)
          .single();

        if (batch) {
          await supabase
            .from('batches')
            .update({ quantity: batch.quantity + line.quantity })
            .eq('id', line.batch_id);

          await supabase.from('stock_ledger').insert({
            product_id: line.product_id,
            batch_id: line.batch_id,
            type: 'RETURN',
            quantity: line.quantity,
            reference: sampleNumber,
            notes: `Sample reversal: ${line.quantity} pcs`,
          });
        }
      }
    }
  }
}

export function useAddSample() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      sample,
      lines,
      affectsInventory = true,
    }: {
      sample: Omit<DbSample, 'id' | 'created_at' | 'is_deleted' | 'deleted_at' | 'deleted_by'>;
      lines: Omit<DbSampleLine, 'id' | 'sample_id'>[];
      affectsInventory?: boolean;
    }) => {
      const { data: sampleData, error: sampleError } = await supabase
        .from('samples')
        .insert(sample)
        .select()
        .single();
      if (sampleError) throw sampleError;

      if (lines.length > 0) {
        const linesWithSampleId = lines.map(line => ({
          ...line,
          sample_id: sampleData.id,
        }));
        const { error: linesError } = await supabase
          .from('sample_lines')
          .insert(linesWithSampleId);
        if (linesError) throw linesError;
      }

      // Only deduct stock if CONFIRMED and affectsInventory
      if (sample.status === 'CONFIRMED' && affectsInventory) {
        await deductStock(lines, sampleData.sample_number);
      }

      await supabase.from('audit_logs').insert({
        action: 'CREATE',
        entity_type: 'INVOICE',
        entity_id: sampleData.id,
        entity_name: sampleData.sample_number,
        changes: { type: 'SAMPLE', status: sample.status },
      });

      return sampleData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['samples'] });
      queryClient.invalidateQueries({ queryKey: ['sample_lines'] });
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      queryClient.invalidateQueries({ queryKey: ['stock_ledger'] });
      queryClient.invalidateQueries({ queryKey: ['audit_logs'] });
      toast({ title: 'Sample entry created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating sample', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateSampleStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ sampleId, newStatus, oldStatus }: { sampleId: string; newStatus: SampleStatus; oldStatus: SampleStatus }) => {
      // Get sample info
      const { data: sample } = await supabase
        .from('samples')
        .select('*')
        .eq('id', sampleId)
        .single();
      if (!sample) throw new Error('Sample not found');

      // Status transitions with stock logic
      if (newStatus === 'CONFIRMED' && oldStatus === 'DRAFT') {
        // DRAFT → CONFIRMED: deduct stock
        const { data: lines } = await supabase.from('sample_lines').select('*').eq('sample_id', sampleId);
        if (lines) await deductStock(lines, sample.sample_number);
      } else if (newStatus === 'CANCELLED' && oldStatus === 'CONFIRMED') {
        // CONFIRMED → CANCELLED: restore stock
        await restoreStock(sampleId, sample.sample_number);
      }

      const { error } = await supabase
        .from('samples')
        .update({ status: newStatus })
        .eq('id', sampleId);
      if (error) throw error;

      await supabase.from('audit_logs').insert({
        action: 'UPDATE',
        entity_type: 'INVOICE',
        entity_id: sampleId,
        entity_name: sample.sample_number,
        changes: { type: 'SAMPLE', oldStatus, newStatus },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['samples'] });
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      queryClient.invalidateQueries({ queryKey: ['stock_ledger'] });
      queryClient.invalidateQueries({ queryKey: ['audit_logs'] });
      toast({ title: 'Sample status updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating sample', description: error.message, variant: 'destructive' });
    },
  });
}

export function useSoftDeleteSample() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ sampleId }: { sampleId: string }) => {
      const { data: sample } = await supabase
        .from('samples')
        .select('*')
        .eq('id', sampleId)
        .single();
      if (!sample) throw new Error('Sample not found');

      // If was CONFIRMED, restore stock
      if (sample.status === 'CONFIRMED') {
        await restoreStock(sampleId, sample.sample_number);
      }

      const { error } = await supabase
        .from('samples')
        .update({ is_deleted: true, deleted_at: new Date().toISOString(), status: 'CANCELLED' })
        .eq('id', sampleId);
      if (error) throw error;

      await supabase.from('audit_logs').insert({
        action: 'DELETE',
        entity_type: 'INVOICE',
        entity_id: sampleId,
        entity_name: sample.sample_number,
        changes: { type: 'SAMPLE' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['samples'] });
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      queryClient.invalidateQueries({ queryKey: ['stock_ledger'] });
      queryClient.invalidateQueries({ queryKey: ['audit_logs'] });
      toast({ title: 'Sample deleted & stock restored' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting sample', description: error.message, variant: 'destructive' });
    },
  });
}

export function useRestoreSample() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ sampleId }: { sampleId: string }) => {
      const { data: sample } = await supabase
        .from('samples')
        .select('*')
        .eq('id', sampleId)
        .single();
      if (!sample) throw new Error('Sample not found');

      const { error } = await supabase
        .from('samples')
        .update({ is_deleted: false, deleted_at: null, deleted_by: null, status: 'DRAFT' })
        .eq('id', sampleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['samples'] });
      toast({ title: 'Sample restored as Draft' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error restoring sample', description: error.message, variant: 'destructive' });
    },
  });
}
