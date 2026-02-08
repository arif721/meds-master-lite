import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

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

export function useAddSample() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      sample,
      lines,
    }: {
      sample: Omit<DbSample, 'id' | 'created_at' | 'is_deleted' | 'deleted_at' | 'deleted_by'>;
      lines: Omit<DbSampleLine, 'id' | 'sample_id'>[];
    }) => {
      // Insert sample
      const { data: sampleData, error: sampleError } = await supabase
        .from('samples')
        .insert(sample)
        .select()
        .single();
      if (sampleError) throw sampleError;

      // Insert lines
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

      // Deduct stock from batches + add stock ledger entries
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
              reference: sampleData.sample_number,
              notes: `Sample: ${line.quantity} pcs`,
            });
          }
        }
      }

      // Audit log
      await supabase.from('audit_logs').insert({
        action: 'CREATE',
        entity_type: 'INVOICE', // reuse entity type
        entity_id: sampleData.id,
        entity_name: sampleData.sample_number,
        changes: { type: 'SAMPLE' },
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
