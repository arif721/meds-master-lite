import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DbSignature {
  id: string;
  seller_id: string | null;
  name: string;
  image_url: string;
  is_default: boolean;
  signature_type: 'prepared_by' | 'representative' | 'customer';
  created_at: string;
  updated_at: string;
}

export function useSignatures() {
  return useQuery({
    queryKey: ['signatures'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('signatures')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as DbSignature[];
    },
  });
}

export function useDefaultSignature(sellerId: string | null, signatureType: 'prepared_by' | 'representative' = 'prepared_by') {
  const { data: signatures = [] } = useSignatures();
  
  // First try to find seller-specific default
  if (sellerId) {
    const sellerDefault = signatures.find(
      s => s.seller_id === sellerId && s.signature_type === signatureType && s.is_default
    );
    if (sellerDefault) return sellerDefault;
  }
  
  // Fallback to global default (seller_id is null)
  const globalDefault = signatures.find(
    s => !s.seller_id && s.signature_type === signatureType && s.is_default
  );
  
  return globalDefault || null;
}

export function useSellerSignatures(sellerId: string | null, signatureType: 'prepared_by' | 'representative' = 'prepared_by') {
  const { data: signatures = [] } = useSignatures();
  
  // Get signatures for this seller + global signatures
  return signatures.filter(
    s => s.signature_type === signatureType && (s.seller_id === sellerId || !s.seller_id)
  );
}
