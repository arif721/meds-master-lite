import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { generateSKU } from '@/lib/sku';
import { DbProduct } from '@/hooks/useDatabase';

interface ImportRow {
  rowNumber: number;
  product_name: string;
  category: string;
  unit: string;
  cost_price: string | number;
  sales_price: string | number;
  sku?: string;
  barcode?: string;
  errors: string[];
  status: 'pending' | 'valid' | 'error' | 'imported' | 'updated';
}

const VALID_UNITS: DbProduct['unit'][] = ['Tablet', 'Capsule', 'Bottle', 'Box', 'Strip', 'Piece', 'Tube', 'Jar', 'Pot'];

const TEMPLATE_COLUMNS = [
  'product_name',
  'category',
  'unit',
  'cost_price',
  'sales_price',
  'sku',
  'barcode',
];

export function ProductImport() {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<ImportRow[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    imported: number;
    updated: number;
    failed: number;
    errors: ImportRow[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const downloadTemplate = () => {
    const templateData = [
      {
        product_name: 'Napa 500mg',
        category: 'Tablet',
        unit: 'Strip',
        cost_price: 50,
        sales_price: 65,
        sku: '',
        barcode: '',
      },
      {
        product_name: 'Paracetamol Syrup 60ml',
        category: 'Syrup',
        unit: 'Bottle',
        cost_price: 80,
        sales_price: 120,
        sku: 'SYR-0001',
        barcode: '1234567890123',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Products');
    
    // Set column widths
    ws['!cols'] = [
      { wch: 25 }, // product_name
      { wch: 15 }, // category
      { wch: 10 }, // unit
      { wch: 12 }, // cost_price
      { wch: 12 }, // sales_price
      { wch: 15 }, // sku
      { wch: 15 }, // barcode
    ];

    XLSX.writeFile(wb, 'product_import_template.xlsx');
    toast({ title: 'Template downloaded', description: 'Fill in the template and import it back.' });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setImportResult(null);
    
    try {
      const data = await readFileData(selectedFile);
      const rows = parseExcelData(data);
      setPreviewData(rows.slice(0, 50)); // Show first 50 rows for preview
    } catch (error) {
      toast({
        title: 'Error reading file',
        description: error instanceof Error ? error.message : 'Failed to read file',
        variant: 'destructive',
      });
    }
  };

  const readFileData = (file: File): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as ArrayBuffer);
      reader.onerror = (e) => reject(e);
      reader.readAsArrayBuffer(file);
    });
  };

  const parseExcelData = (data: ArrayBuffer): ImportRow[] => {
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false });

    return jsonData.map((row: any, index) => ({
      rowNumber: index + 2, // +2 because Excel is 1-indexed and first row is header
      product_name: row.product_name?.toString().trim() || '',
      category: row.category?.toString().trim() || '',
      unit: row.unit?.toString().trim() || '',
      cost_price: row.cost_price?.toString().trim() || '',
      sales_price: row.sales_price?.toString().trim() || '',
      sku: row.sku?.toString().trim() || '',
      barcode: row.barcode?.toString().trim() || '',
      errors: [],
      status: 'pending' as const,
    }));
  };

  const validateData = async () => {
    setIsValidating(true);

    try {
      // Fetch existing categories
      const { data: categories } = await supabase.from('categories').select('*');
      const categoryMap = new Map((categories || []).map(c => [c.name.toLowerCase(), c.id]));

      // Fetch existing products for SKU check
      const { data: products } = await supabase.from('products').select('*');
      const skuMap = new Map((products || []).filter(p => p.sku).map(p => [p.sku!.toLowerCase(), p]));

      const validatedData = previewData.map(row => {
        const errors: string[] = [];

        // Required field validation
        if (!row.product_name) errors.push('Product name is required');
        if (!row.category) errors.push('Category is required');
        if (!row.unit) errors.push('Unit is required');
        if (!row.cost_price) errors.push('Cost price is required');
        if (!row.sales_price) errors.push('Sales price is required');

        // Unit validation
        if (row.unit && !VALID_UNITS.includes(row.unit as DbProduct['unit'])) {
          errors.push(`Invalid unit. Must be one of: ${VALID_UNITS.join(', ')}`);
        }

        // Numeric validation
        const costPrice = parseFloat(row.cost_price.toString());
        const salesPrice = parseFloat(row.sales_price.toString());
        
        if (row.cost_price && (isNaN(costPrice) || costPrice < 0)) {
          errors.push('Cost price must be a valid positive number');
        }
        if (row.sales_price && (isNaN(salesPrice) || salesPrice < 0)) {
          errors.push('Sales price must be a valid positive number');
        }

        return {
          ...row,
          errors,
          status: errors.length > 0 ? 'error' as const : 'valid' as const,
        };
      });

      setPreviewData(validatedData);
      
      const errorCount = validatedData.filter(r => r.status === 'error').length;
      const validCount = validatedData.filter(r => r.status === 'valid').length;
      
      toast({
        title: 'Validation complete',
        description: `${validCount} valid, ${errorCount} with errors`,
        variant: errorCount > 0 ? 'destructive' : 'default',
      });
    } catch (error) {
      toast({
        title: 'Validation error',
        description: error instanceof Error ? error.message : 'Failed to validate',
        variant: 'destructive',
      });
    } finally {
      setIsValidating(false);
    }
  };

  const importData = async () => {
    const validRows = previewData.filter(r => r.status === 'valid');
    if (validRows.length === 0) {
      toast({ title: 'No valid rows to import', variant: 'destructive' });
      return;
    }

    setIsImporting(true);
    let imported = 0;
    let updated = 0;
    let failed = 0;
    const errorRows: ImportRow[] = [];

    try {
      // Fetch existing data
      const { data: categories } = await supabase.from('categories').select('*');
      const categoryMap = new Map((categories || []).map(c => [c.name.toLowerCase(), c.id]));

      const { data: products } = await supabase.from('products').select('*');
      const skuMap = new Map((products || []).filter(p => p.sku).map(p => [p.sku!.toLowerCase(), p]));
      const existingSKUs = (products || []).map(p => p.sku).filter(Boolean) as string[];

      for (const row of validRows) {
        try {
          // Find or create category
          let categoryId = categoryMap.get(row.category.toLowerCase());
          if (!categoryId) {
            const { data: newCat, error: catError } = await supabase
              .from('categories')
              .insert({ name: row.category })
              .select()
              .single();
            
            if (catError) throw new Error(`Failed to create category: ${catError.message}`);
            categoryId = newCat.id;
            categoryMap.set(row.category.toLowerCase(), categoryId);
          }

          // Generate or use provided SKU
          let sku = row.sku || '';
          if (!sku) {
            sku = generateSKU(row.category, existingSKUs);
            existingSKUs.push(sku);
          }

          const productData = {
            name: row.product_name,
            category_id: categoryId,
            unit: row.unit as DbProduct['unit'],
            cost_price: parseFloat(row.cost_price.toString()),
            sales_price: parseFloat(row.sales_price.toString()),
            sku,
            active: true,
          };

          // Check if product with this SKU exists
          const existingProduct = skuMap.get(sku.toLowerCase());
          
          if (existingProduct) {
            // Update existing product
            const { error } = await supabase
              .from('products')
              .update(productData)
              .eq('id', existingProduct.id);
            
            if (error) throw error;
            updated++;
            row.status = 'updated';
          } else {
            // Insert new product
            const { data: newProduct, error } = await supabase
              .from('products')
              .insert(productData)
              .select()
              .single();
            
            if (error) throw error;
            
            // Add audit log
            await supabase.from('audit_logs').insert({
              action: 'CREATE',
              entity_type: 'PRODUCT',
              entity_id: newProduct.id,
              entity_name: newProduct.name,
              changes: { import: true, source: 'Excel/CSV Import' },
            });
            
            imported++;
            row.status = 'imported';
            skuMap.set(sku.toLowerCase(), newProduct);
          }
        } catch (error) {
          failed++;
          row.status = 'error';
          row.errors = [error instanceof Error ? error.message : 'Import failed'];
          errorRows.push(row);
        }
      }

      // Add bulk import audit log
      await supabase.from('audit_logs').insert({
        action: 'CREATE',
        entity_type: 'PRODUCT',
        entity_id: 'bulk-import',
        entity_name: `Bulk Import: ${imported} new, ${updated} updated, ${failed} failed`,
        changes: { 
          imported, 
          updated, 
          failed, 
          fileName: file?.name,
          totalRows: validRows.length,
        },
      });

      setImportResult({ imported, updated, failed, errors: errorRows });
      
      // Refresh queries
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['audit_logs'] });

      toast({
        title: 'Import complete',
        description: `Imported ${imported}, Updated ${updated}, Failed ${failed}`,
      });
    } catch (error) {
      toast({
        title: 'Import error',
        description: error instanceof Error ? error.message : 'Failed to import',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const downloadErrorReport = () => {
    if (!importResult?.errors.length) return;

    const errorData = importResult.errors.map(row => ({
      row_number: row.rowNumber,
      product_name: row.product_name,
      category: row.category,
      unit: row.unit,
      cost_price: row.cost_price,
      sales_price: row.sales_price,
      sku: row.sku,
      barcode: row.barcode,
      errors: row.errors.join('; '),
    }));

    const ws = XLSX.utils.json_to_sheet(errorData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Errors');
    XLSX.writeFile(wb, 'import_errors.csv');
  };

  const resetImport = () => {
    setFile(null);
    setPreviewData([]);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getStatusBadge = (status: ImportRow['status']) => {
    switch (status) {
      case 'valid':
        return <Badge variant="outline" className="bg-accent text-accent-foreground">Valid</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'imported':
        return <Badge>Imported</Badge>;
      case 'updated':
        return <Badge variant="secondary">Updated</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  return (
    <>
      <Button variant="outline" onClick={downloadTemplate}>
        <Download className="w-4 h-4 mr-2" />
        Download Template
      </Button>
      
      <Button variant="outline" onClick={() => setIsOpen(true)}>
        <Upload className="w-4 h-4 mr-2" />
        Import Excel/CSV
      </Button>

      <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetImport(); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              Import Products from Excel/CSV
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            {/* File Upload */}
            <div className="flex items-center gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.csv,.xls"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-4 h-4 mr-2" />
                Select File
              </Button>
              {file && (
                <div className="flex items-center gap-2 text-sm">
                  <FileSpreadsheet className="w-4 h-4 text-primary" />
                  <span>{file.name}</span>
                  <Button variant="ghost" size="icon" onClick={resetImport} className="h-6 w-6">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Import Result */}
            {importResult && (
              <Alert className={importResult.failed > 0 ? 'border-destructive' : 'border-primary'}>
                <div className="flex items-center gap-2">
                  {importResult.failed > 0 ? (
                    <AlertCircle className="w-4 h-4 text-destructive" />
                  ) : (
                    <CheckCircle className="w-4 h-4 text-primary" />
                  )}
                  <AlertDescription className="flex items-center gap-4">
                    <span>
                      Imported: <strong>{importResult.imported}</strong> | 
                      Updated: <strong>{importResult.updated}</strong> | 
                      Failed: <strong>{importResult.failed}</strong>
                    </span>
                    {importResult.failed > 0 && (
                      <Button variant="outline" size="sm" onClick={downloadErrorReport}>
                        <Download className="w-4 h-4 mr-2" />
                        Download Error Report
                      </Button>
                    )}
                  </AlertDescription>
                </div>
              </Alert>
            )}

            {/* Preview Table */}
            {previewData.length > 0 && (
              <ScrollArea className="flex-1 border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Row</TableHead>
                      <TableHead>Product Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Cost</TableHead>
                      <TableHead>Sales</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.map((row, idx) => (
                      <TableRow key={idx} className={row.status === 'error' ? 'bg-destructive/5' : ''}>
                        <TableCell className="font-mono text-xs">{row.rowNumber}</TableCell>
                        <TableCell className="font-medium">{row.product_name || '-'}</TableCell>
                        <TableCell>{row.category || '-'}</TableCell>
                        <TableCell>{row.unit || '-'}</TableCell>
                        <TableCell>৳{row.cost_price || '-'}</TableCell>
                        <TableCell>৳{row.sales_price || '-'}</TableCell>
                        <TableCell className="font-mono text-xs">{row.sku || 'Auto'}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {getStatusBadge(row.status)}
                            {row.errors.length > 0 && (
                              <span className="text-xs text-destructive">{row.errors[0]}</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}

            {previewData.length === 0 && !file && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg">
                <FileSpreadsheet className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="font-medium mb-1">No file selected</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Upload an Excel (.xlsx) or CSV file to import products
                </p>
                <Button variant="outline" onClick={downloadTemplate}>
                  <Download className="w-4 h-4 mr-2" />
                  Download Template First
                </Button>
              </div>
            )}

            {/* Action Buttons */}
            {previewData.length > 0 && (
              <div className="flex justify-between items-center pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  {previewData.length} rows found
                  {previewData.filter(r => r.status === 'valid').length > 0 && (
                    <span className="text-primary ml-2">
                      ({previewData.filter(r => r.status === 'valid').length} valid)
                    </span>
                  )}
                  {previewData.filter(r => r.status === 'error').length > 0 && (
                    <span className="text-destructive ml-2">
                      ({previewData.filter(r => r.status === 'error').length} errors)
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={validateData} disabled={isValidating || isImporting}>
                    {isValidating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Validate
                  </Button>
                  <Button 
                    onClick={importData} 
                    disabled={isImporting || previewData.filter(r => r.status === 'valid').length === 0}
                  >
                    {isImporting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Import {previewData.filter(r => r.status === 'valid').length} Products
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
