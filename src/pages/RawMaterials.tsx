import { useState } from 'react';
import { format } from 'date-fns';
import {
  Plus,
  Package,
  ArrowDownCircle,
  ArrowUpCircle,
  Settings,
  BarChart3,
  Search,
  Edit,
  Trash2,
  RotateCcw,
  AlertTriangle,
  Beaker,
  Leaf,
  Box,
  Layers,
  LayoutDashboard,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TrashToggle } from '@/components/TrashToggle';
import { SoftDeleteDialog, RestoreDialog, PermanentDeleteDialog } from '@/components/DeleteConfirmDialogs';
import { formatCurrency } from '@/lib/format';
import {
  useRawMaterials,
  useRawMaterialLots,
  useRawMaterialMovements,
  useSoftDeleteRawMaterial,
  useRestoreRawMaterial,
  usePermanentDeleteRawMaterial,
  useSoftDeleteRawMaterialLot,
  useRestoreRawMaterialLot,
  RAW_MATERIAL_TYPES,
  STORAGE_CONDITIONS,
  DbRawMaterial,
  DbRawMaterialLot,
} from '@/hooks/useRawMaterials';
import { RawMaterialForm } from '@/components/raw-materials/RawMaterialForm';
import { LotForm } from '@/components/raw-materials/LotForm';
import { StockMovementForm } from '@/components/raw-materials/StockMovementForm';
import { RawMaterialsDashboard } from '@/components/raw-materials/RawMaterialsDashboard';
import { CurrentStockReport } from '@/components/raw-materials/reports/CurrentStockReport';
import { StockMovementReport } from '@/components/raw-materials/reports/StockMovementReport';
import { ConsumptionReport } from '@/components/raw-materials/reports/ConsumptionReport';
import { ExpiryReport } from '@/components/raw-materials/reports/ExpiryReport';
import { ValuationReport } from '@/components/raw-materials/reports/ValuationReport';

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'CHEMICAL': return <Beaker className="w-4 h-4" />;
    case 'HERB': return <Leaf className="w-4 h-4" />;
    case 'PACKAGING': return <Box className="w-4 h-4" />;
    default: return <Layers className="w-4 h-4" />;
  }
};

export default function RawMaterials() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeReportTab, setActiveReportTab] = useState('current-stock');
  const [showDeleted, setShowDeleted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  
  // Forms
  const [materialFormOpen, setMaterialFormOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<DbRawMaterial | null>(null);
  const [lotFormOpen, setLotFormOpen] = useState(false);
  const [editingLot, setEditingLot] = useState<DbRawMaterialLot | null>(null);
  const [stockInFormOpen, setStockInFormOpen] = useState(false);
  const [stockOutFormOpen, setStockOutFormOpen] = useState(false);
  const [adjustmentFormOpen, setAdjustmentFormOpen] = useState(false);
  
  // Delete dialogs
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [permanentDeleteDialogOpen, setPermanentDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ id: string; name: string; type: 'material' | 'lot' } | null>(null);

  // Data
  const { data: materials, isLoading: materialsLoading } = useRawMaterials(showDeleted);
  const { data: lots, isLoading: lotsLoading } = useRawMaterialLots(undefined, showDeleted);
  const { data: movements } = useRawMaterialMovements();
  
  // Mutations
  const softDeleteMaterial = useSoftDeleteRawMaterial();
  const restoreMaterial = useRestoreRawMaterial();
  const permanentDeleteMaterial = usePermanentDeleteRawMaterial();
  const softDeleteLot = useSoftDeleteRawMaterialLot();
  const restoreLot = useRestoreRawMaterialLot();

  // Count deleted items
  const deletedMaterialsCount = materials?.filter(m => m.is_deleted).length || 0;
  const deletedLotsCount = lots?.filter(l => l.is_deleted).length || 0;

  // Filter materials
  const filteredMaterials = materials?.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || m.type === typeFilter;
    const matchesDeleted = showDeleted ? m.is_deleted : !m.is_deleted;
    return matchesSearch && matchesType && matchesDeleted;
  }) || [];

  // Filter lots
  const filteredLots = lots?.filter(lot => {
    const material = materials?.find(m => m.id === lot.material_id);
    const matchesSearch = 
      lot.lot_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      material?.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDeleted = showDeleted ? lot.is_deleted : !lot.is_deleted;
    return matchesSearch && matchesDeleted;
  }) || [];

  const handleDelete = (id: string, name: string, type: 'material' | 'lot') => {
    setSelectedItem({ id, name, type });
    if (showDeleted) {
      setPermanentDeleteDialogOpen(true);
    } else {
      setDeleteDialogOpen(true);
    }
  };

  const handleRestore = (id: string, name: string, type: 'material' | 'lot') => {
    setSelectedItem({ id, name, type });
    setRestoreDialogOpen(true);
  };

  const confirmSoftDelete = async () => {
    if (!selectedItem) return;
    if (selectedItem.type === 'material') {
      await softDeleteMaterial.mutateAsync(selectedItem.id);
    } else {
      await softDeleteLot.mutateAsync(selectedItem.id);
    }
    setDeleteDialogOpen(false);
    setSelectedItem(null);
  };

  const confirmRestore = async () => {
    if (!selectedItem) return;
    if (selectedItem.type === 'material') {
      await restoreMaterial.mutateAsync(selectedItem.id);
    } else {
      await restoreLot.mutateAsync(selectedItem.id);
    }
    setRestoreDialogOpen(false);
    setSelectedItem(null);
  };

  const confirmPermanentDelete = async () => {
    if (!selectedItem) return;
    if (selectedItem.type === 'material') {
      await permanentDeleteMaterial.mutateAsync(selectedItem.id);
    }
    setPermanentDeleteDialogOpen(false);
    setSelectedItem(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Raw Materials</h1>
          <p className="text-muted-foreground">Chemicals, Herbs & Packaging Management</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => { setEditingMaterial(null); setMaterialFormOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Add Material
          </Button>
          <Button variant="outline" onClick={() => { setEditingLot(null); setLotFormOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Add Lot
          </Button>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="dashboard" className="gap-2">
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="items" className="gap-2">
            <Package className="w-4 h-4" />
            Materials
          </TabsTrigger>
          <TabsTrigger value="lots" className="gap-2">
            <Layers className="w-4 h-4" />
            Lots
          </TabsTrigger>
          <TabsTrigger value="stock-in" className="gap-2">
            <ArrowDownCircle className="w-4 h-4" />
            Stock In
          </TabsTrigger>
          <TabsTrigger value="stock-out" className="gap-2">
            <ArrowUpCircle className="w-4 h-4" />
            Stock Out
          </TabsTrigger>
          <TabsTrigger value="adjustments" className="gap-2">
            <Settings className="w-4 h-4" />
            Adjustments
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            Reports
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard">
          <RawMaterialsDashboard />
        </TabsContent>

        {/* Materials Tab */}
        <TabsContent value="items" className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search materials..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {RAW_MATERIAL_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <TrashToggle 
              showDeleted={showDeleted} 
              onToggle={setShowDeleted} 
              deletedCount={deletedMaterialsCount}
            />
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Storage</TableHead>
                    <TableHead>Reorder Level</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {materialsLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">Loading...</TableCell>
                    </TableRow>
                  ) : filteredMaterials.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        {showDeleted ? 'No deleted materials' : 'No materials found'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMaterials.map(material => (
                      <TableRow key={material.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {getTypeIcon(material.type)}
                            {material.name}
                          </div>
                          {material.strength_purity && (
                            <span className="text-xs text-muted-foreground ml-6">
                              {material.strength_purity}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{material.type}</Badge>
                        </TableCell>
                        <TableCell>{material.unit}</TableCell>
                        <TableCell>
                          {STORAGE_CONDITIONS.find(s => s.value === material.storage_condition)?.label}
                        </TableCell>
                        <TableCell>{material.reorder_level || 0}</TableCell>
                        <TableCell>
                          {material.is_deleted ? (
                            <Badge variant="destructive">Deleted</Badge>
                          ) : material.active ? (
                            <Badge variant="default">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Archived</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {showDeleted ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleRestore(material.id, material.name, 'material')}
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-destructive"
                                  onClick={() => handleDelete(material.id, material.name, 'material')}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingMaterial(material);
                                    setMaterialFormOpen(true);
                                  }}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-destructive"
                                  onClick={() => handleDelete(material.id, material.name, 'material')}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Lots Tab */}
        <TabsContent value="lots" className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search lots..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <TrashToggle 
              showDeleted={showDeleted} 
              onToggle={setShowDeleted} 
              deletedCount={deletedLotsCount}
            />
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead>Lot No</TableHead>
                    <TableHead>Received</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead className="text-right">Qty Received</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="text-right">Unit Cost</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lotsLoading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">Loading...</TableCell>
                    </TableRow>
                  ) : filteredLots.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        {showDeleted ? 'No deleted lots' : 'No lots found'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLots.map(lot => {
                      const material = materials?.find(m => m.id === lot.material_id);
                      const today = new Date();
                      const isExpired = lot.expiry_date && new Date(lot.expiry_date) < today;
                      const isExpiringSoon = lot.expiry_date && !isExpired && 
                        new Date(lot.expiry_date) <= new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
                      
                      return (
                        <TableRow key={lot.id} className={isExpired ? 'bg-destructive/5' : isExpiringSoon ? 'bg-warning/5' : ''}>
                          <TableCell className="font-medium">{material?.name || 'Unknown'}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {lot.lot_number}
                              {isExpired && (
                                <Badge variant="destructive" className="text-xs">
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  Expired
                                </Badge>
                              )}
                              {isExpiringSoon && (
                                <Badge variant="outline" className="text-xs border-warning text-warning">
                                  Expiring Soon
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{lot.received_date}</TableCell>
                          <TableCell>{lot.expiry_date || '-'}</TableCell>
                          <TableCell className="text-right">{lot.quantity_received}</TableCell>
                          <TableCell className="text-right font-medium">{lot.current_balance}</TableCell>
                          <TableCell className="text-right">{formatCurrency(lot.unit_cost)}</TableCell>
                          <TableCell>{lot.location || '-'}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {showDeleted ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleRestore(lot.id, lot.lot_number, 'lot')}
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </Button>
                              ) : (
                                <>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setEditingLot(lot);
                                      setLotFormOpen(true);
                                    }}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-destructive"
                                    onClick={() => handleDelete(lot.id, lot.lot_number, 'lot')}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stock In Tab */}
        <TabsContent value="stock-in" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-muted-foreground">Receive stock from suppliers, opening stock, or transfers</p>
            <Button onClick={() => setStockInFormOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Stock In
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Lot</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements?.filter(m => m.quantity > 0).slice(0, 50).map(movement => (
                    <TableRow key={movement.id}>
                      <TableCell>{format(new Date(movement.created_at), 'dd/MM/yyyy HH:mm')}</TableCell>
                      <TableCell className="font-medium">{movement.material?.name}</TableCell>
                      <TableCell>{movement.lot?.lot_number || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{movement.type}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-primary">+{movement.quantity}</TableCell>
                      <TableCell>{movement.supplier || '-'}</TableCell>
                      <TableCell className="max-w-xs truncate">{movement.notes || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stock Out Tab */}
        <TabsContent value="stock-out" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-muted-foreground">Issue stock for production, samples, or waste</p>
            <Button onClick={() => setStockOutFormOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Stock Out
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Lot</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements?.filter(m => m.quantity < 0).slice(0, 50).map(movement => (
                    <TableRow key={movement.id}>
                      <TableCell>{format(new Date(movement.created_at), 'dd/MM/yyyy HH:mm')}</TableCell>
                      <TableCell className="font-medium">{movement.material?.name}</TableCell>
                      <TableCell>{movement.lot?.lot_number || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{movement.type}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-destructive">{movement.quantity}</TableCell>
                      <TableCell>{movement.reason || '-'}</TableCell>
                      <TableCell className="max-w-xs truncate">{movement.notes || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Adjustments Tab */}
        <TabsContent value="adjustments" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-muted-foreground">Stock corrections, damage write-offs, and adjustments</p>
            <Button onClick={() => setAdjustmentFormOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Adjustment
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Lot</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements?.filter(m => m.type === 'ADJUSTMENT').slice(0, 50).map(movement => (
                    <TableRow key={movement.id}>
                      <TableCell>{format(new Date(movement.created_at), 'dd/MM/yyyy HH:mm')}</TableCell>
                      <TableCell className="font-medium">{movement.material?.name}</TableCell>
                      <TableCell>{movement.lot?.lot_number || '-'}</TableCell>
                      <TableCell className={`text-right ${movement.quantity > 0 ? 'text-primary' : 'text-destructive'}`}>
                        {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                      </TableCell>
                      <TableCell>{movement.reason || '-'}</TableCell>
                      <TableCell>{movement.created_by || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          <Tabs value={activeReportTab} onValueChange={setActiveReportTab}>
            <TabsList>
              <TabsTrigger value="current-stock">Current Stock</TabsTrigger>
              <TabsTrigger value="movement">Stock Movement</TabsTrigger>
              <TabsTrigger value="consumption">Consumption</TabsTrigger>
              <TabsTrigger value="expiry">Expiry</TabsTrigger>
              <TabsTrigger value="valuation">Valuation</TabsTrigger>
            </TabsList>

            <TabsContent value="current-stock">
              <CurrentStockReport />
            </TabsContent>
            <TabsContent value="movement">
              <StockMovementReport />
            </TabsContent>
            <TabsContent value="consumption">
              <ConsumptionReport />
            </TabsContent>
            <TabsContent value="expiry">
              <ExpiryReport />
            </TabsContent>
            <TabsContent value="valuation">
              <ValuationReport />
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>

      {/* Forms */}
      <RawMaterialForm
        open={materialFormOpen}
        onOpenChange={setMaterialFormOpen}
        material={editingMaterial}
      />
      <LotForm
        open={lotFormOpen}
        onOpenChange={setLotFormOpen}
        lot={editingLot}
      />
      <StockMovementForm
        open={stockInFormOpen}
        onOpenChange={setStockInFormOpen}
        mode="in"
      />
      <StockMovementForm
        open={stockOutFormOpen}
        onOpenChange={setStockOutFormOpen}
        mode="out"
      />
      <StockMovementForm
        open={adjustmentFormOpen}
        onOpenChange={setAdjustmentFormOpen}
        mode="adjustment"
      />

      {/* Delete Dialogs */}
      <SoftDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmSoftDelete}
        itemName={selectedItem?.name || ''}
        isPending={softDeleteMaterial.isPending || softDeleteLot.isPending}
      />
      <RestoreDialog
        open={restoreDialogOpen}
        onOpenChange={setRestoreDialogOpen}
        onConfirm={confirmRestore}
        itemName={selectedItem?.name || ''}
        isPending={restoreMaterial.isPending || restoreLot.isPending}
      />
      <PermanentDeleteDialog
        open={permanentDeleteDialogOpen}
        onOpenChange={setPermanentDeleteDialogOpen}
        onConfirm={confirmPermanentDelete}
        itemName={selectedItem?.name || ''}
        itemId={selectedItem?.id || ''}
        table="raw_materials"
        isPending={permanentDeleteMaterial.isPending}
      />
    </div>
  );
}
