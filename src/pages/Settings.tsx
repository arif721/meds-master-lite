import React, { useState, useRef, useEffect } from 'react';
import { Download, Upload, Database, AlertTriangle, Users, Trash2, RefreshCw, Loader2, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStore } from '@/store/useStore';
import { toast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import SellerManagement from '@/components/SellerManagement';
import { MonthlyStatement } from '@/components/MonthlyStatement';
import { supabase } from '@/integrations/supabase/client';
import { 
  categories as demoCategories, 
  products as demoProducts, 
  batches as demoBatches, 
  customers as demoCustomers, 
  sellers as demoSellers, 
  invoices as demoInvoices, 
  payments as demoPayments, 
  stockLedger as demoStockLedger 
} from '@/data/mockData';

export default function Settings() {
  const store = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [clearDataDialogOpen, setClearDataDialogOpen] = useState(false);
  const [loadDemoDialogOpen, setLoadDemoDialogOpen] = useState(false);
  const [pendingRestoreData, setPendingRestoreData] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [rawMaterialsCount, setRawMaterialsCount] = useState({ materials: 0, lots: 0, movements: 0 });

  // Fetch raw materials counts on mount
  useEffect(() => {
    const fetchCounts = async () => {
      const [materials, lots, movements] = await Promise.all([
        supabase.from('raw_materials').select('id', { count: 'exact', head: true }),
        supabase.from('raw_material_lots').select('id', { count: 'exact', head: true }),
        supabase.from('raw_material_movements').select('id', { count: 'exact', head: true }),
      ]);
      setRawMaterialsCount({
        materials: materials.count || 0,
        lots: lots.count || 0,
        movements: movements.count || 0,
      });
    };
    fetchCounts();
  }, []);

  const handleLoadDemoData = () => {
    // Load demo data into localStorage and reload
    const storeData = {
      state: {
        categories: demoCategories,
        products: demoProducts,
        batches: demoBatches,
        customers: demoCustomers,
        sellers: demoSellers,
        invoices: demoInvoices,
        payments: demoPayments,
        stockLedger: demoStockLedger,
        quotations: [],
        stockAdjustments: [],
        auditLogs: [],
      },
      version: 0,
    };

    localStorage.setItem('pharma-inventory-store', JSON.stringify(storeData));

    toast({
      title: 'Demo Data Loaded',
      description: 'Demo products, customers, and stock loaded. Reloading page...',
    });

    setTimeout(() => {
      window.location.reload();
    }, 1000);

    setLoadDemoDialogOpen(false);
  };

  const handleClearAllData = () => {
    // Clear localStorage and reload
    localStorage.removeItem('pharma-inventory-store');
    
    toast({
      title: 'All Data Cleared',
      description: 'All data has been deleted. Reloading page...',
    });

    setTimeout(() => {
      window.location.reload();
    }, 1000);
    
    setClearDataDialogOpen(false);
  };

  const handleExportBackup = async () => {
    setIsExporting(true);
    try {
      // Fetch Raw Materials data from Supabase
      const [materialsRes, lotsRes, movementsRes] = await Promise.all([
        supabase.from('raw_materials').select('*'),
        supabase.from('raw_material_lots').select('*'),
        supabase.from('raw_material_movements').select('*'),
      ]);

      if (materialsRes.error) throw materialsRes.error;
      if (lotsRes.error) throw lotsRes.error;
      if (movementsRes.error) throw movementsRes.error;

      const backupData = {
        version: '2.0',
        exportedAt: new Date().toISOString(),
        data: {
          // LocalStorage data
          categories: store.categories,
          products: store.products,
          batches: store.batches,
          customers: store.customers,
          sellers: store.sellers,
          invoices: store.invoices,
          payments: store.payments,
          stockLedger: store.stockLedger,
          quotations: store.quotations,
          stockAdjustments: store.stockAdjustments,
          // Raw Materials (Supabase)
          rawMaterials: materialsRes.data || [],
          rawMaterialLots: lotsRes.data || [],
          rawMaterialMovements: movementsRes.data || [],
        },
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gazi-pharma-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Backup Created',
        description: `Exported ${materialsRes.data?.length || 0} raw materials, ${lotsRes.data?.length || 0} lots, ${movementsRes.data?.length || 0} movements`,
      });
    } catch (error: any) {
      toast({
        title: 'Backup Failed',
        description: error.message || 'Could not export data',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      try {
        const parsed = JSON.parse(content);
        if (!parsed.version || !parsed.data) {
          throw new Error('Invalid backup file format');
        }
        setPendingRestoreData(content);
        setRestoreDialogOpen(true);
      } catch (error) {
        toast({
          title: 'Invalid File',
          description: 'The selected file is not a valid backup file',
          variant: 'destructive',
        });
      }
    };
    reader.readAsText(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const confirmRestore = async () => {
    if (!pendingRestoreData) return;
    setIsRestoring(true);

    try {
      const parsed = JSON.parse(pendingRestoreData);
      const { data } = parsed;

      // Update localStorage directly
      const storeData = {
        state: {
          categories: data.categories || [],
          products: data.products || [],
          batches: data.batches || [],
          customers: data.customers || [],
          sellers: data.sellers || [],
          invoices: data.invoices || [],
          payments: data.payments || [],
          stockLedger: data.stockLedger || [],
          quotations: data.quotations || [],
          stockAdjustments: data.stockAdjustments || [],
        },
        version: 0,
      };

      localStorage.setItem('pharma-inventory-store', JSON.stringify(storeData));

      // Restore Raw Materials to Supabase (if present in backup)
      if (data.rawMaterials || data.rawMaterialLots || data.rawMaterialMovements) {
        // Clear existing data first
        await supabase.from('raw_material_movements').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('raw_material_lots').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('raw_materials').delete().neq('id', '00000000-0000-0000-0000-000000000000');

        // Insert restored data
        if (data.rawMaterials?.length > 0) {
          const { error: matError } = await supabase.from('raw_materials').insert(data.rawMaterials);
          if (matError) console.error('Error restoring raw_materials:', matError);
        }
        if (data.rawMaterialLots?.length > 0) {
          const { error: lotError } = await supabase.from('raw_material_lots').insert(data.rawMaterialLots);
          if (lotError) console.error('Error restoring raw_material_lots:', lotError);
        }
        if (data.rawMaterialMovements?.length > 0) {
          const { error: movError } = await supabase.from('raw_material_movements').insert(data.rawMaterialMovements);
          if (movError) console.error('Error restoring raw_material_movements:', movError);
        }
      }

      toast({
        title: 'Restore Successful',
        description: 'All data restored including Raw Materials. Reloading page...',
      });

      // Reload to apply changes
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error: any) {
      toast({
        title: 'Restore Failed',
        description: error.message || 'Could not restore data from backup',
        variant: 'destructive',
      });
    } finally {
      setIsRestoring(false);
    }

    setRestoreDialogOpen(false);
    setPendingRestoreData(null);
  };

  const stats = {
    products: store.products.length,
    customers: store.customers.length,
    sellers: store.sellers.length,
    invoices: store.invoices.length,
    batches: store.batches.length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="text-muted-foreground">Manage system settings and configurations</p>
        </div>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="backup" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-lg">
          <TabsTrigger value="backup" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            Backup
          </TabsTrigger>
          <TabsTrigger value="statement" className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4" />
            Monthly Statement
          </TabsTrigger>
          <TabsTrigger value="sellers" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Sellers
          </TabsTrigger>
        </TabsList>

        {/* Backup & Restore Tab */}
        <TabsContent value="backup" className="space-y-6 mt-6">
          {/* Backup Section */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Export */}
            <div className="card p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Download className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">Export Backup</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    Download all your data as a JSON file. Keep this file safe to restore later.
                  </p>
                  <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm">
                    <p className="font-medium mb-2">Current Data:</p>
                    <div className="grid grid-cols-2 gap-2">
                      <span>Products: {stats.products}</span>
                      <span>Customers: {stats.customers}</span>
                      <span>Sellers: {stats.sellers}</span>
                      <span>Invoices: {stats.invoices}</span>
                      <span>Batches: {stats.batches}</span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-border">
                      <p className="font-medium mb-1 text-primary">Raw Materials (Cloud):</p>
                      <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                        <span>Materials: {rawMaterialsCount.materials}</span>
                        <span>Lots: {rawMaterialsCount.lots}</span>
                        <span>Movements: {rawMaterialsCount.movements}</span>
                      </div>
                    </div>
                  </div>
                  <Button onClick={handleExportBackup} className="mt-4" disabled={isExporting}>
                    {isExporting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    {isExporting ? 'Exporting...' : 'Download Backup'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Import */}
            <div className="card p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-warning/10">
                  <Upload className="w-6 h-6 text-warning" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">Restore Backup</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    Upload a backup file to restore your data. This will replace all current data.
                  </p>
                  <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                    <span className="text-destructive">
                      Warning: Restoring will overwrite all existing data. Make sure to export a backup first!
                    </span>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-4"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Select Backup File
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Clear All Data */}
          <div className="card p-6 border-destructive/30">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-destructive/10">
                <Trash2 className="w-6 h-6 text-destructive" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-destructive">Clear All Data</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  Delete all data from the system. This includes products, customers, invoices, payments, and everything else.
                </p>
                <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                  <span className="text-destructive">
                    Warning: This action is irreversible! Make sure to export a backup first if you need to keep your data.
                  </span>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => setClearDataDialogOpen(true)}
                  className="mt-4"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear All Data
                </Button>
              </div>
            </div>
          </div>

          {/* Load Demo Data */}
          <div className="card p-6 border-primary/30">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <RefreshCw className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-primary">Load Demo Data</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  Load sample products, customers, sellers, inventory, and invoices to test the system.
                </p>
                <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-lg text-sm">
                  <p className="font-medium mb-2">Demo Data Includes:</p>
                  <div className="grid grid-cols-2 gap-1 text-muted-foreground">
                    <span>• 44 Products (Syrups, Capsules, etc.)</span>
                    <span>• 5 Customers</span>
                    <span>• 3 Sellers</span>
                    <span>• 12 Stock Batches</span>
                    <span>• 2 Sample Invoices</span>
                    <span>• 2 Payments</span>
                  </div>
                </div>
                <Button
                  onClick={() => setLoadDemoDialogOpen(true)}
                  className="mt-4"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Load Demo Data
                </Button>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="card p-6 bg-muted/30">
            <div className="flex items-start gap-4">
              <Database className="w-5 h-5 text-muted-foreground mt-1" />
              <div>
                <h4 className="font-medium">About Data Storage</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Your data is stored locally in your browser. Regular backups are recommended to prevent data loss.
                  For cloud storage and multi-device sync, contact support for Lovable Cloud integration.
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Monthly Statement Tab */}
        <TabsContent value="statement" className="mt-6">
          <MonthlyStatement />
        </TabsContent>

        {/* Seller Management Tab */}
        <TabsContent value="sellers" className="mt-6">
          <SellerManagement />
        </TabsContent>
      </Tabs>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              Confirm Data Restore
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will replace ALL your current data with the backup file, including Raw Materials data stored in the cloud.
              <br /><br />
              <strong>This action cannot be undone.</strong> Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRestoring}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmRestore} 
              className="bg-warning hover:bg-warning/90"
              disabled={isRestoring}
            >
              {isRestoring ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Restoring...
                </>
              ) : (
                'Yes, Restore Data'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear Data Confirmation Dialog */}
      <AlertDialog open={clearDataDialogOpen} onOpenChange={setClearDataDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              Delete All Data?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete ALL data including:
              <br /><br />
              • Products & Categories<br />
              • Batches & Inventory<br />
              • Customers & Sellers<br />
              • Invoices & Payments<br />
              • Quotations & Stock Adjustments<br />
              <br />
              <strong className="text-destructive">This action cannot be undone!</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearAllData} className="bg-destructive hover:bg-destructive/90">
              Yes, Delete Everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Load Demo Data Confirmation Dialog */}
      <AlertDialog open={loadDemoDialogOpen} onOpenChange={setLoadDemoDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-primary">
              <RefreshCw className="w-5 h-5" />
              Load Demo Data?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will replace your current data with demo data including:
              <br /><br />
              • 44 Products (G-Astakof, G-Karmo, etc.)<br />
              • 5 Customers<br />
              • 3 Sellers<br />
              • 12 Stock Batches with Expiry<br />
              • 2 Sample Invoices<br />
              • 2 Payments<br />
              <br />
              <strong className="text-primary">This will overwrite existing data!</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLoadDemoData}>
              Yes, Load Demo Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
