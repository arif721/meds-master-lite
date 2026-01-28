import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

// Type definitions
export type RawMaterialType = 'CHEMICAL' | 'HERB' | 'PACKAGING' | 'OTHER';
export type RawMaterialUnit = 'g' | 'kg' | 'ml' | 'l' | 'pcs';
export type StorageCondition = 'DRY' | 'COOL' | 'FRIDGE';
export type RMMovementType = 'OPENING' | 'RECEIVE' | 'PURCHASE' | 'PRODUCTION' | 'SAMPLE' | 'WASTE' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'ADJUSTMENT';

export interface DbRawMaterial {
  id: string;
  name: string;
  type: RawMaterialType;
  unit: RawMaterialUnit;
  strength_purity?: string;
  purchase_unit?: RawMaterialUnit;
  conversion_factor: number;
  min_stock: number;
  reorder_level: number;
  storage_condition: StorageCondition;
  hazard_class?: string;
  supplier?: string;
  active: boolean;
  is_deleted: boolean;
  deleted_at?: string;
  deleted_by?: string;
  created_at: string;
  updated_at: string;
}

export interface DbRawMaterialLot {
  id: string;
  material_id: string;
  lot_number: string;
  received_date: string;
  expiry_date?: string;
  coa_document?: string;
  unit_cost: number;
  quantity_received: number;
  current_balance: number;
  location?: string;
  is_deleted: boolean;
  deleted_at?: string;
  deleted_by?: string;
  created_at: string;
  // Joined data
  material?: DbRawMaterial;
}

export interface DbRawMaterialMovement {
  id: string;
  material_id: string;
  lot_id?: string;
  type: RMMovementType;
  quantity: number;
  unit_cost: number;
  supplier?: string;
  invoice_number?: string;
  from_location?: string;
  to_location?: string;
  reason?: string;
  notes?: string;
  reference?: string;
  created_by?: string;
  created_at: string;
  // Joined data
  material?: DbRawMaterial;
  lot?: DbRawMaterialLot;
}

// Constants
export const RAW_MATERIAL_TYPES: { value: RawMaterialType; label: string }[] = [
  { value: 'CHEMICAL', label: 'Chemical' },
  { value: 'HERB', label: 'Herb' },
  { value: 'PACKAGING', label: 'Packaging' },
  { value: 'OTHER', label: 'Other' },
];

export const RAW_MATERIAL_UNITS: { value: RawMaterialUnit; label: string }[] = [
  { value: 'g', label: 'Gram (g)' },
  { value: 'kg', label: 'Kilogram (kg)' },
  { value: 'ml', label: 'Milliliter (ml)' },
  { value: 'l', label: 'Liter (l)' },
  { value: 'pcs', label: 'Pieces (pcs)' },
];

export const STORAGE_CONDITIONS: { value: StorageCondition; label: string }[] = [
  { value: 'DRY', label: 'Dry Storage' },
  { value: 'COOL', label: 'Cool Storage' },
  { value: 'FRIDGE', label: 'Refrigerator' },
];

export const MOVEMENT_TYPES: { value: RMMovementType; label: string; direction: 'in' | 'out' | 'both' }[] = [
  { value: 'OPENING', label: 'Opening Stock', direction: 'in' },
  { value: 'RECEIVE', label: 'Receive', direction: 'in' },
  { value: 'PURCHASE', label: 'Purchase', direction: 'in' },
  { value: 'PRODUCTION', label: 'Production Use', direction: 'out' },
  { value: 'SAMPLE', label: 'Sample', direction: 'out' },
  { value: 'WASTE', label: 'Waste', direction: 'out' },
  { value: 'TRANSFER_IN', label: 'Transfer In', direction: 'in' },
  { value: 'TRANSFER_OUT', label: 'Transfer Out', direction: 'out' },
  { value: 'ADJUSTMENT', label: 'Adjustment', direction: 'both' },
];

// ========== RAW MATERIALS ==========
export function useRawMaterials(includeDeleted = false) {
  return useQuery({
    queryKey: ['raw_materials', includeDeleted],
    queryFn: async () => {
      let query = supabase
        .from('raw_materials')
        .select('*')
        .order('name');
      
      if (!includeDeleted) {
        query = query.eq('is_deleted', false);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as DbRawMaterial[];
    },
  });
}

export function useAddRawMaterial() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (material: Omit<DbRawMaterial, 'id' | 'created_at' | 'updated_at' | 'is_deleted' | 'deleted_at' | 'deleted_by'>) => {
      const { data, error } = await supabase
        .from('raw_materials')
        .insert(material)
        .select()
        .single();
      
      if (error) throw error;

      // Audit log
      await supabase.from('audit_logs').insert({
        action: 'CREATE',
        entity_type: 'PRODUCT',
        entity_id: data.id,
        entity_name: data.name,
        user_id: user?.id,
        user_name: user?.email,
        changes: { new: data },
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raw_materials'] });
      toast({ title: 'Success', description: 'Raw material added successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateRawMaterial() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DbRawMaterial> & { id: string }) => {
      const { data, error } = await supabase
        .from('raw_materials')
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
        user_id: user?.id,
        user_name: user?.email,
        changes: { updated: updates },
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raw_materials'] });
      toast({ title: 'Success', description: 'Raw material updated' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// ========== RAW MATERIAL LOTS ==========
export function useRawMaterialLots(materialId?: string, includeDeleted = false) {
  return useQuery({
    queryKey: ['raw_material_lots', materialId, includeDeleted],
    queryFn: async () => {
      let query = supabase
        .from('raw_material_lots')
        .select('*, material:raw_materials(*)')
        .order('received_date', { ascending: false });
      
      if (materialId) {
        query = query.eq('material_id', materialId);
      }
      
      if (!includeDeleted) {
        query = query.eq('is_deleted', false);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as DbRawMaterialLot[];
    },
  });
}

export function useAddRawMaterialLot() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (lot: Omit<DbRawMaterialLot, 'id' | 'created_at' | 'is_deleted' | 'deleted_at' | 'deleted_by' | 'material'>) => {
      const { data, error } = await supabase
        .from('raw_material_lots')
        .insert({
          ...lot,
          current_balance: lot.quantity_received,
        })
        .select()
        .single();
      
      if (error) throw error;

      // Create stock movement for opening/receive
      await supabase.from('raw_material_movements').insert({
        material_id: lot.material_id,
        lot_id: data.id,
        type: 'RECEIVE',
        quantity: lot.quantity_received,
        unit_cost: lot.unit_cost,
        notes: `Initial lot receipt: ${lot.lot_number}`,
        created_by: user?.email,
      });

      await supabase.from('audit_logs').insert({
        action: 'CREATE',
        entity_type: 'BATCH',
        entity_id: data.id,
        entity_name: lot.lot_number,
        user_id: user?.id,
        user_name: user?.email,
        changes: { new: data },
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raw_material_lots'] });
      queryClient.invalidateQueries({ queryKey: ['raw_material_movements'] });
      toast({ title: 'Success', description: 'Lot added successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateRawMaterialLot() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DbRawMaterialLot> & { id: string }) => {
      const { data, error } = await supabase
        .from('raw_material_lots')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raw_material_lots'] });
      toast({ title: 'Success', description: 'Lot updated' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// ========== STOCK MOVEMENTS ==========
export function useRawMaterialMovements(materialId?: string, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['raw_material_movements', materialId, startDate, endDate],
    queryFn: async () => {
      let query = supabase
        .from('raw_material_movements')
        .select('*, material:raw_materials(*), lot:raw_material_lots(*)')
        .order('created_at', { ascending: false });
      
      if (materialId) {
        query = query.eq('material_id', materialId);
      }
      
      if (startDate) {
        query = query.gte('created_at', startDate);
      }
      
      if (endDate) {
        query = query.lte('created_at', endDate);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as DbRawMaterialMovement[];
    },
  });
}

export function useAddStockIn() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (movement: {
      material_id: string;
      lot_id: string;
      type: 'OPENING' | 'RECEIVE' | 'PURCHASE' | 'TRANSFER_IN';
      quantity: number;
      unit_cost?: number;
      supplier?: string;
      invoice_number?: string;
      to_location?: string;
      notes?: string;
    }) => {
      // Insert movement
      const { data: movementData, error: movementError } = await supabase
        .from('raw_material_movements')
        .insert({
          ...movement,
          created_by: user?.email,
        })
        .select()
        .single();
      
      if (movementError) throw movementError;

      // Update lot balance
      const { data: lotData } = await supabase
        .from('raw_material_lots')
        .select('current_balance')
        .eq('id', movement.lot_id)
        .single();

      if (lotData) {
        await supabase
          .from('raw_material_lots')
          .update({ 
            current_balance: lotData.current_balance + movement.quantity,
            location: movement.to_location || undefined,
          })
          .eq('id', movement.lot_id);
      }

      await supabase.from('audit_logs').insert({
        action: 'CREATE',
        entity_type: 'ADJUSTMENT',
        entity_id: movementData.id,
        entity_name: `Stock In: ${movement.type}`,
        user_id: user?.id,
        user_name: user?.email,
        changes: { movement: movementData },
      });

      return movementData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raw_material_lots'] });
      queryClient.invalidateQueries({ queryKey: ['raw_material_movements'] });
      toast({ title: 'Success', description: 'Stock received successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useAddStockOut() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (movement: {
      material_id: string;
      lot_id: string;
      type: 'PRODUCTION' | 'SAMPLE' | 'WASTE' | 'TRANSFER_OUT';
      quantity: number;
      from_location?: string;
      to_location?: string;
      reason?: string;
      notes?: string;
    }) => {
      // Check current balance
      const { data: lotData, error: lotError } = await supabase
        .from('raw_material_lots')
        .select('current_balance, lot_number, expiry_date')
        .eq('id', movement.lot_id)
        .single();

      if (lotError) throw lotError;
      
      if (!lotData || lotData.current_balance < movement.quantity) {
        throw new Error(`Insufficient stock. Available: ${lotData?.current_balance || 0}`);
      }

      // Check if lot is expired
      if (lotData.expiry_date) {
        const expiryDate = new Date(lotData.expiry_date);
        const today = new Date();
        if (expiryDate < today) {
          throw new Error(`Cannot use expired lot (${lotData.lot_number}). Expired on: ${lotData.expiry_date}`);
        }
      }

      // Insert movement
      const { data: movementData, error: movementError } = await supabase
        .from('raw_material_movements')
        .insert({
          ...movement,
          quantity: -movement.quantity, // Negative for out
          created_by: user?.email,
        })
        .select()
        .single();
      
      if (movementError) throw movementError;

      // Update lot balance
      await supabase
        .from('raw_material_lots')
        .update({ current_balance: lotData.current_balance - movement.quantity })
        .eq('id', movement.lot_id);

      await supabase.from('audit_logs').insert({
        action: 'CREATE',
        entity_type: 'ADJUSTMENT',
        entity_id: movementData.id,
        entity_name: `Stock Out: ${movement.type}`,
        user_id: user?.id,
        user_name: user?.email,
        changes: { movement: movementData },
      });

      return movementData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raw_material_lots'] });
      queryClient.invalidateQueries({ queryKey: ['raw_material_movements'] });
      toast({ title: 'Success', description: 'Stock issued successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useAddAdjustment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (adjustment: {
      material_id: string;
      lot_id: string;
      quantity: number; // Can be positive (increase) or negative (decrease)
      reason: string;
      notes?: string;
    }) => {
      // Get current balance
      const { data: lotData, error: lotError } = await supabase
        .from('raw_material_lots')
        .select('current_balance')
        .eq('id', adjustment.lot_id)
        .single();

      if (lotError) throw lotError;
      
      const newBalance = lotData.current_balance + adjustment.quantity;
      if (newBalance < 0) {
        throw new Error(`Cannot reduce below zero. Current: ${lotData.current_balance}`);
      }

      // Insert movement
      const { data: movementData, error: movementError } = await supabase
        .from('raw_material_movements')
        .insert({
          material_id: adjustment.material_id,
          lot_id: adjustment.lot_id,
          type: 'ADJUSTMENT',
          quantity: adjustment.quantity,
          reason: adjustment.reason,
          notes: adjustment.notes,
          created_by: user?.email,
        })
        .select()
        .single();
      
      if (movementError) throw movementError;

      // Update lot balance
      await supabase
        .from('raw_material_lots')
        .update({ current_balance: newBalance })
        .eq('id', adjustment.lot_id);

      await supabase.from('audit_logs').insert({
        action: 'CREATE',
        entity_type: 'ADJUSTMENT',
        entity_id: movementData.id,
        entity_name: `Adjustment: ${adjustment.reason}`,
        user_id: user?.id,
        user_name: user?.email,
        changes: { adjustment: movementData },
      });

      return movementData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raw_material_lots'] });
      queryClient.invalidateQueries({ queryKey: ['raw_material_movements'] });
      toast({ title: 'Success', description: 'Adjustment recorded' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// ========== REPORTS ==========
export function useRawMaterialReports() {
  const { data: materials } = useRawMaterials();
  const { data: lots } = useRawMaterialLots();
  const { data: movements } = useRawMaterialMovements();

  const today = new Date();
  const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Current stock by material
  const currentStock = materials?.map(material => {
    const materialLots = lots?.filter(lot => lot.material_id === material.id && !lot.is_deleted) || [];
    const totalBalance = materialLots.reduce((sum, lot) => sum + (lot.current_balance || 0), 0);
    const totalValue = materialLots.reduce((sum, lot) => sum + (lot.current_balance || 0) * (lot.unit_cost || 0), 0);
    
    return {
      material,
      lots: materialLots,
      totalBalance,
      totalValue,
      isLowStock: totalBalance < material.reorder_level,
    };
  }) || [];

  // Low stock items
  const lowStockItems = currentStock.filter(item => item.isLowStock);

  // Expiring soon (within 30 days)
  const expiringSoonLots = lots?.filter(lot => {
    if (!lot.expiry_date || lot.is_deleted || lot.current_balance <= 0) return false;
    const expiryDate = new Date(lot.expiry_date);
    return expiryDate <= thirtyDaysFromNow && expiryDate >= today;
  }) || [];

  // Expired lots
  const expiredLots = lots?.filter(lot => {
    if (!lot.expiry_date || lot.is_deleted || lot.current_balance <= 0) return false;
    const expiryDate = new Date(lot.expiry_date);
    return expiryDate < today;
  }) || [];

  // Total valuation
  const totalValuation = currentStock.reduce((sum, item) => sum + item.totalValue, 0);

  return {
    currentStock,
    lowStockItems,
    expiringSoonLots,
    expiredLots,
    totalValuation,
    totalMaterials: materials?.length || 0,
    totalLots: lots?.length || 0,
  };
}

// Consumption report for date range
export function useConsumptionReport(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['raw_material_consumption', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('raw_material_movements')
        .select('*, material:raw_materials(*), lot:raw_material_lots(*)')
        .in('type', ['PRODUCTION', 'SAMPLE', 'WASTE'])
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      // Group by material
      const byMaterial: Record<string, { material: DbRawMaterial; totalQty: number; totalValue: number; movements: DbRawMaterialMovement[] }> = {};
      
      data.forEach(movement => {
        const materialId = movement.material_id;
        if (!byMaterial[materialId]) {
          byMaterial[materialId] = {
            material: movement.material!,
            totalQty: 0,
            totalValue: 0,
            movements: [],
          };
        }
        byMaterial[materialId].totalQty += Math.abs(movement.quantity);
        byMaterial[materialId].totalValue += Math.abs(movement.quantity) * (movement.unit_cost || movement.lot?.unit_cost || 0);
        byMaterial[materialId].movements.push(movement);
      });

      return {
        byMaterial: Object.values(byMaterial),
        totalMovements: data.length,
        totalConsumption: Object.values(byMaterial).reduce((sum, item) => sum + item.totalQty, 0),
        totalValue: Object.values(byMaterial).reduce((sum, item) => sum + item.totalValue, 0),
      };
    },
    enabled: !!startDate && !!endDate,
  });
}

// Soft delete for raw materials
export function useSoftDeleteRawMaterial() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('raw_materials')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by: user?.email,
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raw_materials'] });
      toast({ title: 'Success', description: 'Material moved to trash' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useRestoreRawMaterial() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('raw_materials')
        .update({
          is_deleted: false,
          deleted_at: null,
          deleted_by: null,
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raw_materials'] });
      toast({ title: 'Success', description: 'Material restored' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function usePermanentDeleteRawMaterial() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      // Check for dependencies
      const { count: lotsCount } = await supabase
        .from('raw_material_lots')
        .select('*', { count: 'exact', head: true })
        .eq('material_id', id);

      if (lotsCount && lotsCount > 0) {
        throw new Error(`Cannot delete: ${lotsCount} lot(s) exist for this material`);
      }

      const { error } = await supabase
        .from('raw_materials')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raw_materials'] });
      toast({ title: 'Success', description: 'Material permanently deleted' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// Soft delete for lots
export function useSoftDeleteRawMaterialLot() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('raw_material_lots')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by: user?.email,
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raw_material_lots'] });
      toast({ title: 'Success', description: 'Lot moved to trash' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useRestoreRawMaterialLot() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('raw_material_lots')
        .update({
          is_deleted: false,
          deleted_at: null,
          deleted_by: null,
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raw_material_lots'] });
      toast({ title: 'Success', description: 'Lot restored' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}
