-- Create signatures table
CREATE TABLE public.signatures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID REFERENCES public.sellers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  signature_type TEXT NOT NULL DEFAULT 'prepared_by' CHECK (signature_type IN ('prepared_by', 'representative', 'customer')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.signatures ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Authenticated users can manage signatures" 
ON public.signatures 
FOR ALL 
TO authenticated
USING (true) 
WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_signatures_updated_at
  BEFORE UPDATE ON public.signatures
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create unique constraint for default signatures per seller
CREATE UNIQUE INDEX unique_default_signature_per_seller 
ON public.signatures (seller_id, signature_type) 
WHERE is_default = true;

-- Create storage bucket for signatures
INSERT INTO storage.buckets (id, name, public) 
VALUES ('signatures', 'signatures', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies
CREATE POLICY "Signature images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'signatures');

CREATE POLICY "Authenticated users can upload signatures" 
ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'signatures');

CREATE POLICY "Authenticated users can update signatures" 
ON storage.objects 
FOR UPDATE 
TO authenticated
USING (bucket_id = 'signatures');

CREATE POLICY "Authenticated users can delete signatures" 
ON storage.objects 
FOR DELETE 
TO authenticated
USING (bucket_id = 'signatures');