import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  DbRawMaterial, 
  DbRawMaterialLot, 
  DbRawMaterialMovement,
  useRawMaterials,
  useRawMaterialLots,
  useRawMaterialMovements,
} from './useRawMaterials';

// ========== CURRENT STOCK REPORT ==========
export interface CurrentStockItem {
  material: DbRawMaterial;
  lots: DbRawMaterialLot[];
  totalBalance: number;
  totalValue: number;
  avgCost: number;
  isLowStock: boolean;
}

export function useCurrentStockReport() {
  const { data: materials } = useRawMaterials();
  const { data: lots } = useRawMaterialLots();

  return useMemo(() => {
    if (!materials || !lots) return [];

    return materials
      .filter(m => !m.is_deleted && m.active)
      .map(material => {
        const materialLots = lots.filter(
          lot => lot.material_id === material.id && !lot.is_deleted
        );
        
        const totalBalance = materialLots.reduce(
          (sum, lot) => sum + (lot.current_balance || 0), 
          0
        );
        
        const totalValue = materialLots.reduce(
          (sum, lot) => sum + (lot.current_balance || 0) * (lot.unit_cost || 0), 
          0
        );
        
        // Weighted average cost
        const avgCost = totalBalance > 0 ? totalValue / totalBalance : 0;

        return {
          material,
          lots: materialLots.filter(l => l.current_balance > 0),
          totalBalance,
          totalValue,
          avgCost,
          isLowStock: totalBalance <= (material.reorder_level || 0),
        };
      })
      .sort((a, b) => a.material.name.localeCompare(b.material.name));
  }, [materials, lots]);
}

// ========== STOCK MOVEMENT REPORT (Date Range) ==========
export interface MovementReportItem {
  material: DbRawMaterial;
  openingBalance: number;
  openingValue: number;
  totalIn: number;
  totalInValue: number;
  totalOut: number;
  totalOutValue: number;
  closingBalance: number;
  closingValue: number;
}

export function useStockMovementReport(startDate: string, endDate: string) {
  const { data: materials } = useRawMaterials();
  const { data: lots } = useRawMaterialLots();
  
  // Get all movements in the date range
  const { data: movements, isLoading } = useQuery({
    queryKey: ['rm_movement_report', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('raw_material_movements')
        .select('*')
        .gte('created_at', startDate)
        .lte('created_at', endDate + 'T23:59:59.999Z')
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as DbRawMaterialMovement[];
    },
    enabled: !!startDate && !!endDate,
  });

  // Get movements before start date for opening balance
  const { data: priorMovements } = useQuery({
    queryKey: ['rm_prior_movements', startDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('raw_material_movements')
        .select('*')
        .lt('created_at', startDate)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as DbRawMaterialMovement[];
    },
    enabled: !!startDate,
  });

  const report = useMemo((): MovementReportItem[] => {
    if (!materials || !movements || !priorMovements || !lots) return [];

    return materials
      .filter(m => !m.is_deleted)
      .map(material => {
        // Calculate opening balance from prior movements
        const materialPriorMovements = priorMovements.filter(
          m => m.material_id === material.id
        );
        const openingBalance = materialPriorMovements.reduce(
          (sum, m) => sum + (m.quantity || 0), 
          0
        );
        
        // Get avg cost for the opening
        const materialLots = lots.filter(l => l.material_id === material.id);
        const avgCost = materialLots.length > 0 
          ? materialLots.reduce((sum, l) => sum + l.unit_cost, 0) / materialLots.length 
          : 0;
        const openingValue = openingBalance * avgCost;

        // Movements in the period
        const periodMovements = movements.filter(m => m.material_id === material.id);
        
        const totalIn = periodMovements
          .filter(m => m.quantity > 0)
          .reduce((sum, m) => sum + m.quantity, 0);
        
        const totalInValue = periodMovements
          .filter(m => m.quantity > 0)
          .reduce((sum, m) => sum + m.quantity * (m.unit_cost || avgCost), 0);
        
        const totalOut = Math.abs(
          periodMovements
            .filter(m => m.quantity < 0)
            .reduce((sum, m) => sum + m.quantity, 0)
        );
        
        const totalOutValue = periodMovements
          .filter(m => m.quantity < 0)
          .reduce((sum, m) => sum + Math.abs(m.quantity) * (m.unit_cost || avgCost), 0);

        const closingBalance = openingBalance + totalIn - totalOut;
        const closingValue = closingBalance * avgCost;

        return {
          material,
          openingBalance,
          openingValue,
          totalIn,
          totalInValue,
          totalOut,
          totalOutValue,
          closingBalance,
          closingValue,
        };
      })
      .filter(item => 
        item.openingBalance !== 0 || 
        item.totalIn !== 0 || 
        item.totalOut !== 0 ||
        item.closingBalance !== 0
      )
      .sort((a, b) => a.material.name.localeCompare(b.material.name));
  }, [materials, movements, priorMovements, lots]);

  return { report, isLoading };
}

// ========== CONSUMPTION REPORT ==========
export interface ConsumptionItem {
  material: DbRawMaterial;
  byReason: { 
    reason: string; 
    quantity: number; 
    value: number; 
    movements: DbRawMaterialMovement[] 
  }[];
  totalQty: number;
  totalValue: number;
}

export function useConsumptionReport(startDate: string, endDate: string) {
  const { data: materials } = useRawMaterials();
  const { data: lots } = useRawMaterialLots();
  
  const { data: movements, isLoading } = useQuery({
    queryKey: ['rm_consumption_report', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('raw_material_movements')
        .select('*')
        .in('type', ['PRODUCTION', 'SAMPLE', 'WASTE', 'TRANSFER_OUT'])
        .gte('created_at', startDate)
        .lte('created_at', endDate + 'T23:59:59.999Z')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as DbRawMaterialMovement[];
    },
    enabled: !!startDate && !!endDate,
  });

  const report = useMemo((): ConsumptionItem[] => {
    if (!materials || !movements || !lots) return [];

    const materialMap = new Map<string, ConsumptionItem>();

    movements.forEach(movement => {
      const material = materials.find(m => m.id === movement.material_id);
      if (!material) return;

      const lot = lots.find(l => l.id === movement.lot_id);
      const unitCost = movement.unit_cost || lot?.unit_cost || 0;
      const qty = Math.abs(movement.quantity);
      const reason = movement.type || 'UNKNOWN';

      let item = materialMap.get(material.id);
      if (!item) {
        item = {
          material,
          byReason: [],
          totalQty: 0,
          totalValue: 0,
        };
        materialMap.set(material.id, item);
      }

      // Find or create reason group
      let reasonGroup = item.byReason.find(r => r.reason === reason);
      if (!reasonGroup) {
        reasonGroup = { reason, quantity: 0, value: 0, movements: [] };
        item.byReason.push(reasonGroup);
      }

      reasonGroup.quantity += qty;
      reasonGroup.value += qty * unitCost;
      reasonGroup.movements.push(movement);

      item.totalQty += qty;
      item.totalValue += qty * unitCost;
    });

    return Array.from(materialMap.values()).sort((a, b) => b.totalValue - a.totalValue);
  }, [materials, movements, lots]);

  const totals = useMemo(() => ({
    totalQty: report.reduce((sum, item) => sum + item.totalQty, 0),
    totalValue: report.reduce((sum, item) => sum + item.totalValue, 0),
    byReason: report.reduce((acc, item) => {
      item.byReason.forEach(r => {
        if (!acc[r.reason]) acc[r.reason] = { qty: 0, value: 0 };
        acc[r.reason].qty += r.quantity;
        acc[r.reason].value += r.value;
      });
      return acc;
    }, {} as Record<string, { qty: number; value: number }>),
  }), [report]);

  return { report, totals, isLoading };
}

// ========== EXPIRY REPORT ==========
export interface ExpiryReportItem {
  lot: DbRawMaterialLot;
  material: DbRawMaterial;
  daysUntilExpiry: number;
  status: 'expired' | 'critical' | 'warning' | 'ok';
  lossValue: number;
}

export function useExpiryReport(daysThreshold = 60) {
  const { data: materials } = useRawMaterials();
  const { data: lots } = useRawMaterialLots();

  return useMemo(() => {
    if (!materials || !lots) return { expired: [], expiringSoon: [], all: [] };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const items: ExpiryReportItem[] = lots
      .filter(lot => 
        !lot.is_deleted && 
        lot.current_balance > 0 && 
        lot.expiry_date
      )
      .map(lot => {
        const material = materials.find(m => m.id === lot.material_id);
        if (!material) return null;

        const expiryDate = new Date(lot.expiry_date!);
        expiryDate.setHours(0, 0, 0, 0);
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        let status: 'expired' | 'critical' | 'warning' | 'ok' = 'ok';
        if (daysUntilExpiry <= 0) status = 'expired';
        else if (daysUntilExpiry <= 7) status = 'critical';
        else if (daysUntilExpiry <= 30) status = 'warning';

        return {
          lot,
          material,
          daysUntilExpiry,
          status,
          lossValue: lot.current_balance * lot.unit_cost,
        };
      })
      .filter((item): item is ExpiryReportItem => item !== null)
      .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

    const expired = items.filter(i => i.status === 'expired');
    const expiringSoon = items.filter(i => i.status !== 'expired' && i.daysUntilExpiry <= daysThreshold);

    return {
      expired,
      expiringSoon,
      all: items,
      totalExpiredValue: expired.reduce((sum, i) => sum + i.lossValue, 0),
      totalExpiringSoonValue: expiringSoon.reduce((sum, i) => sum + i.lossValue, 0),
    };
  }, [materials, lots, daysThreshold]);
}

// ========== STOCK VALUATION REPORT ==========
export interface ValuationItem {
  material: DbRawMaterial;
  lots: {
    lot: DbRawMaterialLot;
    balance: number;
    unitCost: number;
    value: number;
  }[];
  totalBalance: number;
  weightedAvgCost: number;
  totalValue: number;
}

export function useValuationReport() {
  const { data: materials } = useRawMaterials();
  const { data: lots } = useRawMaterialLots();

  return useMemo(() => {
    if (!materials || !lots) return { items: [], grandTotal: 0 };

    const items: ValuationItem[] = materials
      .filter(m => !m.is_deleted && m.active)
      .map(material => {
        const materialLots = lots
          .filter(lot => 
            lot.material_id === material.id && 
            !lot.is_deleted && 
            lot.current_balance > 0
          )
          .map(lot => ({
            lot,
            balance: lot.current_balance,
            unitCost: lot.unit_cost,
            value: lot.current_balance * lot.unit_cost,
          }));

        const totalBalance = materialLots.reduce((sum, l) => sum + l.balance, 0);
        const totalValue = materialLots.reduce((sum, l) => sum + l.value, 0);
        const weightedAvgCost = totalBalance > 0 ? totalValue / totalBalance : 0;

        return {
          material,
          lots: materialLots,
          totalBalance,
          weightedAvgCost,
          totalValue,
        };
      })
      .filter(item => item.totalBalance > 0)
      .sort((a, b) => b.totalValue - a.totalValue);

    const grandTotal = items.reduce((sum, item) => sum + item.totalValue, 0);

    return { items, grandTotal };
  }, [materials, lots]);
}

// ========== DASHBOARD METRICS ==========
export function useRawMaterialDashboard() {
  const currentStock = useCurrentStockReport();
  const expiryReport = useExpiryReport(30);
  const valuation = useValuationReport();
  
  // Get recent movements
  const { data: recentMovements } = useQuery({
    queryKey: ['rm_recent_movements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('raw_material_movements')
        .select('*, material:raw_materials(*), lot:raw_material_lots(*)')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data as DbRawMaterialMovement[];
    },
  });

  // Get top consumed materials (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const { data: topConsumed } = useQuery({
    queryKey: ['rm_top_consumed'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('raw_material_movements')
        .select('*, material:raw_materials(*)')
        .in('type', ['PRODUCTION', 'SAMPLE', 'WASTE', 'TRANSFER_OUT'])
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Group by material and sum consumption
      const consumptionMap = new Map<string, { material: DbRawMaterial; totalQty: number }>();
      
      data.forEach((movement: any) => {
        if (!movement.material) return;
        const existing = consumptionMap.get(movement.material_id);
        const qty = Math.abs(movement.quantity);
        
        if (existing) {
          existing.totalQty += qty;
        } else {
          consumptionMap.set(movement.material_id, {
            material: movement.material,
            totalQty: qty,
          });
        }
      });
      
      return Array.from(consumptionMap.values())
        .sort((a, b) => b.totalQty - a.totalQty)
        .slice(0, 10);
    },
  });

  return {
    // Summary metrics
    totalMaterials: currentStock.filter(s => s.totalBalance > 0).length,
    totalValue: valuation.grandTotal,
    lowStockCount: currentStock.filter(s => s.isLowStock && s.totalBalance > 0).length,
    expiredCount: expiryReport.expired.length,
    expiringSoonCount: expiryReport.expiringSoon.length,
    
    // Lists
    lowStockItems: currentStock.filter(s => s.isLowStock && s.totalBalance > 0).slice(0, 10),
    expiredLots: expiryReport.expired.slice(0, 10),
    expiringSoonLots: expiryReport.expiringSoon.slice(0, 10),
    recentMovements: recentMovements || [],
    topConsumed: topConsumed || [],
    
    // For charts
    stockByType: currentStock.reduce((acc, item) => {
      const type = item.material.type;
      if (!acc[type]) acc[type] = { count: 0, value: 0 };
      acc[type].count += 1;
      acc[type].value += item.totalValue;
      return acc;
    }, {} as Record<string, { count: number; value: number }>),
  };
}
