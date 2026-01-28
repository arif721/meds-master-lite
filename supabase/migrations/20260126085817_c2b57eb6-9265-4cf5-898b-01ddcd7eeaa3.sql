-- Create ENUMs for Raw Materials module
CREATE TYPE public.raw_material_type AS ENUM ('CHEMICAL', 'HERB', 'PACKAGING', 'OTHER');
CREATE TYPE public.raw_material_unit AS ENUM ('g', 'kg', 'ml', 'l', 'pcs');
CREATE TYPE public.storage_condition AS ENUM ('DRY', 'COOL', 'FRIDGE');
CREATE TYPE public.rm_movement_type AS ENUM ('OPENING', 'RECEIVE', 'PURCHASE', 'PRODUCTION', 'SAMPLE', 'WASTE', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT');

-- Raw Materials Master Table
CREATE TABLE public.raw_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type public.raw_material_type NOT NULL DEFAULT 'CHEMICAL',
  unit public.raw_material_unit NOT NULL DEFAULT 'kg',
  strength_purity TEXT,
  purchase_unit public.raw_material_unit,
  conversion_factor NUMERIC DEFAULT 1,
  min_stock NUMERIC DEFAULT 0,
  reorder_level NUMERIC DEFAULT 0,
  storage_condition public.storage_condition DEFAULT 'DRY',
  hazard_class TEXT,
  supplier TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Raw Material Lots/Batches
CREATE TABLE public.raw_material_lots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  material_id UUID NOT NULL REFERENCES public.raw_materials(id) ON DELETE CASCADE,
  lot_number TEXT NOT NULL,
  received_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE,
  coa_document TEXT,
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  quantity_received NUMERIC NOT NULL DEFAULT 0,
  current_balance NUMERIC NOT NULL DEFAULT 0,
  location TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Raw Material Stock Movements
CREATE TABLE public.raw_material_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  material_id UUID NOT NULL REFERENCES public.raw_materials(id) ON DELETE CASCADE,
  lot_id UUID REFERENCES public.raw_material_lots(id) ON DELETE SET NULL,
  type public.rm_movement_type NOT NULL,
  quantity NUMERIC NOT NULL,
  unit_cost NUMERIC DEFAULT 0,
  supplier TEXT,
  invoice_number TEXT,
  from_location TEXT,
  to_location TEXT,
  reason TEXT,
  notes TEXT,
  reference TEXT,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.raw_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_material_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_material_movements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can manage raw_materials"
ON public.raw_materials FOR ALL
USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage raw_material_lots"
ON public.raw_material_lots FOR ALL
USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage raw_material_movements"
ON public.raw_material_movements FOR ALL
USING (true) WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_raw_materials_type ON public.raw_materials(type);
CREATE INDEX idx_raw_materials_active ON public.raw_materials(active);
CREATE INDEX idx_raw_material_lots_material_id ON public.raw_material_lots(material_id);
CREATE INDEX idx_raw_material_lots_expiry ON public.raw_material_lots(expiry_date);
CREATE INDEX idx_raw_material_movements_material_id ON public.raw_material_movements(material_id);
CREATE INDEX idx_raw_material_movements_type ON public.raw_material_movements(type);
CREATE INDEX idx_raw_material_movements_created_at ON public.raw_material_movements(created_at);

-- Trigger for updated_at
CREATE TRIGGER update_raw_materials_updated_at
  BEFORE UPDATE ON public.raw_materials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();