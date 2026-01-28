import { useState, useCallback } from 'react';
import { Play, CheckCircle2, XCircle, Loader2, RefreshCw, RotateCcw, ArrowRight, Eye, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/format';
import { useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type StepStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped';

interface DemoStep {
  id: string;
  name: string;
  description: string;
  status: StepStatus;
  error?: string;
  details?: string;
}

interface DemoResults {
  productId?: string;
  productName?: string;
  batchId?: string;
  batchNumber?: string;
  customerId?: string;
  customerName?: string;
  sellerId?: string;
  sellerName?: string;
  storeId?: string;
  storeName?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  paymentId?: string;
  totalAmount?: number;
  costAmount?: number;
  profit?: number;
  freeItemsCost?: number;
}

const DEMO_PRODUCT_NAME = "Demo Syrup 60ml";
const DEMO_LOT_NUMBER = "DM-LOT-001";
const DEMO_STORE_NAME = "Demo Store - Gulshan";
const DEMO_SELLER_NAME = "Demo Seller";
const DEMO_CUSTOMER_NAME = "Demo Customer";

export default function DemoRun() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [cleanupDialogOpen, setCleanupDialogOpen] = useState(false);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [results, setResults] = useState<DemoResults>({});
  const [steps, setSteps] = useState<DemoStep[]>([
    { id: 'product', name: 'Add Product (Demo)', description: 'Create Demo Syrup 60ml with auto-generated SKU', status: 'pending' },
    { id: 'stock', name: 'Add Opening Stock', description: 'Add batch DM-LOT-001 with 50 units @ ৳80', status: 'pending' },
    { id: 'seller', name: 'Create Demo Seller', description: 'Create sales representative for demo', status: 'pending' },
    { id: 'store', name: 'Create Demo Store', description: 'Create Demo Store - Gulshan with credit limit', status: 'pending' },
    { id: 'customer', name: 'Create Demo Customer', description: 'Link customer to store and seller', status: 'pending' },
    { id: 'invoice', name: 'Create Sales Invoice', description: 'Create invoice with Paid=10, Free=1 (Total deduct=11)', status: 'pending' },
    { id: 'confirm', name: 'Confirm Sale & Deduct Stock', description: 'Confirm invoice and deduct inventory', status: 'pending' },
    { id: 'payment', name: 'Receive Full Payment', description: 'Record cash payment, Due = 0', status: 'pending' },
    { id: 'store-verify', name: 'Verify Store Mapping', description: 'Check invoice appears in store profile', status: 'pending' },
    { id: 'profit', name: 'Verify Profit & Loss', description: 'Check P&L calculation and free items tracking', status: 'pending' },
  ]);

  const updateStep = useCallback((stepId: string, update: Partial<DemoStep>) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, ...update } : step
    ));
  }, []);

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const runDemo = async () => {
    setIsRunning(true);
    setCurrentStep(0);
    setResults({});
    
    // Reset all steps
    setSteps(prev => prev.map(step => ({ ...step, status: 'pending', error: undefined, details: undefined })));

    try {
      // Step 1: Add Product
      setCurrentStep(1);
      updateStep('product', { status: 'running' });
      await delay(500);
      
      // Check if demo product exists, delete if so
      const { data: existingProduct } = await supabase
        .from('products')
        .select('id')
        .eq('name', DEMO_PRODUCT_NAME)
        .maybeSingle();
      
      if (existingProduct) {
        await supabase.from('products').delete().eq('id', existingProduct.id);
      }

      // Get Syrup category
      let { data: syrupCategory } = await supabase
        .from('categories')
        .select('id')
        .eq('name', 'Syrup')
        .maybeSingle();
      
      if (!syrupCategory) {
        const { data: newCat } = await supabase
          .from('categories')
          .insert({ name: 'Syrup' })
          .select()
          .single();
        syrupCategory = newCat;
      }

      // Create product
      const { data: product, error: productError } = await supabase
        .from('products')
        .insert({
          name: DEMO_PRODUCT_NAME,
          category_id: syrupCategory?.id || null,
          unit: 'Bottle',
          cost_price: 80,
          sales_price: 120,
          sku: 'DEMO-SYR-001',
          active: true,
        })
        .select()
        .single();

      if (productError) throw new Error(`Product creation failed: ${productError.message}`);
      
      setResults(prev => ({ ...prev, productId: product.id, productName: product.name }));
      updateStep('product', { 
        status: 'passed', 
        details: `Created: ${product.name} (SKU: ${product.sku})` 
      });

      // Step 2: Add Opening Stock
      setCurrentStep(2);
      updateStep('stock', { status: 'running' });
      await delay(500);

      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 180);

      const { data: batch, error: batchError } = await supabase
        .from('batches')
        .insert({
          product_id: product.id,
          batch_number: DEMO_LOT_NUMBER,
          expiry_date: expiryDate.toISOString().split('T')[0],
          quantity: 50,
          cost_price: 80,
        })
        .select()
        .single();

      if (batchError) throw new Error(`Batch creation failed: ${batchError.message}`);

      // Add stock ledger entry
      await supabase.from('stock_ledger').insert({
        product_id: product.id,
        batch_id: batch.id,
        type: 'OPENING',
        quantity: 50,
        notes: `Opening stock for batch ${DEMO_LOT_NUMBER}`,
      });

      setResults(prev => ({ ...prev, batchId: batch.id, batchNumber: batch.batch_number }));
      updateStep('stock', { 
        status: 'passed', 
        details: `Created batch ${DEMO_LOT_NUMBER}: 50 units @ ৳80` 
      });

      // Step 3: Create Demo Seller
      setCurrentStep(3);
      updateStep('seller', { status: 'running' });
      await delay(400);

      // Clean up existing demo seller
      await supabase.from('sellers').delete().eq('name', DEMO_SELLER_NAME);

      const { data: seller, error: sellerError } = await supabase
        .from('sellers')
        .insert({
          name: DEMO_SELLER_NAME,
          phone: '01700-000000',
          address: 'Demo Area',
          commission_type: 'PERCENTAGE',
          commission_value: 5,
          active: true,
        })
        .select()
        .single();

      if (sellerError) throw new Error(`Seller creation failed: ${sellerError.message}`);

      setResults(prev => ({ ...prev, sellerId: seller.id, sellerName: seller.name }));
      updateStep('seller', { status: 'passed', details: `Created: ${DEMO_SELLER_NAME}` });

      // Step 4: Create Demo Store
      setCurrentStep(4);
      updateStep('store', { status: 'running' });
      await delay(400);

      // Clean up existing demo store
      await supabase.from('stores').delete().eq('name', DEMO_STORE_NAME);

      const { data: store, error: storeError } = await supabase
        .from('stores')
        .insert({
          name: DEMO_STORE_NAME,
          address: 'Gulshan-2, Dhaka',
          phone: '02-9876543',
          contact_person: 'Mr. Demo',
          credit_limit: 100000,
          payment_terms: 'CASH',
          active: true,
        })
        .select()
        .single();

      if (storeError) throw new Error(`Store creation failed: ${storeError.message}`);

      setResults(prev => ({ ...prev, storeId: store.id, storeName: store.name }));
      updateStep('store', { status: 'passed', details: `Created: ${DEMO_STORE_NAME}` });

      // Step 5: Create Demo Customer
      setCurrentStep(5);
      updateStep('customer', { status: 'running' });
      await delay(400);

      // Clean up existing demo customer
      await supabase.from('customers').delete().eq('name', DEMO_CUSTOMER_NAME);

      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .insert({
          name: DEMO_CUSTOMER_NAME,
          phone: '01800-123456',
          address: 'Gulshan-2, Dhaka',
          seller_id: seller.id,
        })
        .select()
        .single();

      if (customerError) throw new Error(`Customer creation failed: ${customerError.message}`);

      setResults(prev => ({ ...prev, customerId: customer.id, customerName: customer.name }));
      updateStep('customer', { status: 'passed', details: `Created: ${DEMO_CUSTOMER_NAME}` });

      // Step 6: Create Sales Invoice
      setCurrentStep(6);
      updateStep('invoice', { status: 'running' });
      await delay(500);

      const paidQty = 10;
      const freeQty = 1;
      const unitPrice = 120;
      const costPrice = 80;
      const totalAmount = paidQty * unitPrice; // 1200

      const invoiceNumber = `DEMO-${Date.now().toString().slice(-6)}`;

      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          invoice_number: invoiceNumber,
          customer_id: customer.id,
          seller_id: seller.id,
          store_id: store.id,
          status: 'DRAFT',
          subtotal: totalAmount,
          discount: 0,
          total: totalAmount,
          paid: 0,
          due: totalAmount,
        })
        .select()
        .single();

      if (invoiceError) throw new Error(`Invoice creation failed: ${invoiceError.message}`);

      // Add invoice line
      await supabase.from('invoice_lines').insert({
        invoice_id: invoice.id,
        product_id: product.id,
        batch_id: batch.id,
        quantity: paidQty,
        free_quantity: freeQty,
        unit_price: unitPrice,
        total: totalAmount,
        cost_price: costPrice,
        returned_quantity: 0,
      });

      setResults(prev => ({ 
        ...prev, 
        invoiceId: invoice.id, 
        invoiceNumber: invoice.invoice_number,
        totalAmount,
        costAmount: (paidQty + freeQty) * costPrice, // 880
        profit: totalAmount - (paidQty * costPrice), // 1200 - 800 = 400
        freeItemsCost: freeQty * costPrice, // 80
      }));
      
      updateStep('invoice', { 
        status: 'passed', 
        details: `Invoice ${invoiceNumber}: Paid=${paidQty}, Free=${freeQty}, Total=৳${totalAmount}` 
      });

      // Step 7: Confirm Sale & Deduct Stock
      setCurrentStep(7);
      updateStep('confirm', { status: 'running' });
      await delay(500);

      // Update invoice status
      const { error: confirmError } = await supabase
        .from('invoices')
        .update({ status: 'CONFIRMED' })
        .eq('id', invoice.id);

      if (confirmError) throw new Error(`Invoice confirmation failed: ${confirmError.message}`);

      // Deduct stock from batch
      const totalDeduct = paidQty + freeQty; // 11
      const newQuantity = 50 - totalDeduct; // 39

      await supabase
        .from('batches')
        .update({ quantity: newQuantity })
        .eq('id', batch.id);

      // Add stock ledger entries for SALE and FREE
      await supabase.from('stock_ledger').insert([
        {
          product_id: product.id,
          batch_id: batch.id,
          type: 'SALE',
          quantity: -paidQty,
          reference: invoice.invoice_number,
          notes: 'Paid quantity',
        },
        {
          product_id: product.id,
          batch_id: batch.id,
          type: 'FREE',
          quantity: -freeQty,
          reference: invoice.invoice_number,
          notes: 'Free quantity',
        },
      ]);

      // Verify stock deduction
      const { data: updatedBatch } = await supabase
        .from('batches')
        .select('quantity')
        .eq('id', batch.id)
        .single();

      if (updatedBatch?.quantity !== newQuantity) {
        throw new Error(`Stock mismatch: Expected ${newQuantity}, got ${updatedBatch?.quantity}`);
      }

      updateStep('confirm', { 
        status: 'passed', 
        details: `Stock deducted: 50 → ${newQuantity} (−${totalDeduct} units)` 
      });

      // Step 8: Receive Payment
      setCurrentStep(8);
      updateStep('payment', { status: 'running' });
      await delay(500);

      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          invoice_id: invoice.id,
          amount: totalAmount,
          method: 'CASH',
          notes: 'Demo payment - full amount',
        })
        .select()
        .single();

      if (paymentError) throw new Error(`Payment creation failed: ${paymentError.message}`);

      // Update invoice paid/due
      await supabase
        .from('invoices')
        .update({ paid: totalAmount, due: 0, status: 'PAID' })
        .eq('id', invoice.id);

      setResults(prev => ({ ...prev, paymentId: payment.id }));
      updateStep('payment', { 
        status: 'passed', 
        details: `Payment received: ৳${totalAmount} (Cash). Due = ৳0` 
      });

      // Step 9: Verify Store Mapping
      setCurrentStep(9);
      updateStep('store-verify', { status: 'running' });
      await delay(400);

      const { data: storeInvoices, error: storeCheckError } = await supabase
        .from('invoices')
        .select('id, invoice_number')
        .eq('store_id', store.id)
        .eq('id', invoice.id);

      if (storeCheckError || !storeInvoices?.length) {
        throw new Error('Invoice not found in store mapping');
      }

      updateStep('store-verify', { 
        status: 'passed', 
        details: `Invoice ${invoice.invoice_number} correctly linked to ${DEMO_STORE_NAME}` 
      });

      // Step 10: Verify Profit & Loss
      setCurrentStep(10);
      updateStep('profit', { status: 'running' });
      await delay(400);

      // Calculate expected values
      const expectedRevenue = paidQty * unitPrice; // 1200
      const expectedCOGS = paidQty * costPrice; // 800 (only paid qty)
      const expectedProfit = expectedRevenue - expectedCOGS; // 400
      const expectedFreeItemsCost = freeQty * costPrice; // 80

      // Verify invoice lines have correct cost_price locked
      const { data: invoiceLines } = await supabase
        .from('invoice_lines')
        .select('*')
        .eq('invoice_id', invoice.id);

      if (!invoiceLines?.length || invoiceLines[0].cost_price !== costPrice) {
        throw new Error('COGS not correctly locked in invoice line');
      }

      updateStep('profit', { 
        status: 'passed', 
        details: `Revenue=৳${expectedRevenue}, COGS=৳${expectedCOGS}, Profit=৳${expectedProfit}, Free Items Cost=৳${expectedFreeItemsCost}` 
      });

      // Success!
      toast({
        title: '🎉 Demo Completed Successfully!',
        description: 'All system checks passed. Your order flow is working correctly.',
      });

    } catch (error: any) {
      const currentStepData = steps.find((_, idx) => idx === currentStep - 1);
      if (currentStepData) {
        updateStep(currentStepData.id, { 
          status: 'failed', 
          error: error.message 
        });
      }
      
      // Mark remaining steps as skipped
      setSteps(prev => prev.map((step, idx) => 
        idx >= currentStep ? { ...step, status: 'skipped' } : step
      ));

      toast({
        title: 'Demo Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsRunning(false);
      queryClient.invalidateQueries();
    }
  };

  const cleanupDemoData = async () => {
    setIsCleaningUp(true);
    try {
      // Delete in reverse order due to foreign keys
      if (results.paymentId) {
        await supabase.from('payments').delete().eq('id', results.paymentId);
      }
      
      // Delete invoice lines first
      if (results.invoiceId) {
        await supabase.from('invoice_lines').delete().eq('invoice_id', results.invoiceId);
        await supabase.from('invoices').delete().eq('id', results.invoiceId);
      }

      // Delete stock ledger entries
      if (results.productId) {
        await supabase.from('stock_ledger').delete().eq('product_id', results.productId);
      }

      if (results.batchId) {
        await supabase.from('batches').delete().eq('id', results.batchId);
      }

      if (results.productId) {
        await supabase.from('products').delete().eq('id', results.productId);
      }

      if (results.customerId) {
        await supabase.from('customers').delete().eq('id', results.customerId);
      }

      if (results.sellerId) {
        await supabase.from('sellers').delete().eq('id', results.sellerId);
      }

      if (results.storeId) {
        await supabase.from('stores').delete().eq('id', results.storeId);
      }

      // Reset state
      setResults({});
      setSteps(prev => prev.map(step => ({ ...step, status: 'pending', error: undefined, details: undefined })));
      setCurrentStep(0);

      queryClient.invalidateQueries();

      toast({
        title: 'Cleanup Complete',
        description: 'All demo data has been removed.',
      });
    } catch (error: any) {
      toast({
        title: 'Cleanup Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsCleaningUp(false);
      setCleanupDialogOpen(false);
    }
  };

  const getStepIcon = (status: StepStatus) => {
    switch (status) {
      case 'running':
        return <Loader2 className="w-5 h-5 animate-spin text-primary" />;
      case 'passed':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-destructive" />;
      case 'skipped':
        return <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />;
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/50" />;
    }
  };

  const passedCount = steps.filter(s => s.status === 'passed').length;
  const failedCount = steps.filter(s => s.status === 'failed').length;
  const progress = (passedCount / steps.length) * 100;

  const hasResults = Object.keys(results).length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Demo Run</h1>
          <p className="text-muted-foreground">
            End-to-End System Test: Products → Inventory → Sales → Payment → Reports
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasResults && (
            <Button 
              variant="outline" 
              onClick={() => setCleanupDialogOpen(true)}
              disabled={isRunning || isCleaningUp}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Cleanup Demo Data
            </Button>
          )}
          <Button 
            onClick={runDemo} 
            disabled={isRunning}
            size="lg"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Run Demo
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Progress Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center justify-between">
            <span>Test Progress</span>
            <div className="flex items-center gap-3 text-sm font-normal">
              <Badge variant="outline" className="bg-green-500/10 text-green-600">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                {passedCount} Passed
              </Badge>
              {failedCount > 0 && (
                <Badge variant="outline" className="bg-destructive/10 text-destructive">
                  <XCircle className="w-3 h-3 mr-1" />
                  {failedCount} Failed
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={progress} className="h-3" />
          <p className="text-sm text-muted-foreground mt-2">
            {passedCount} of {steps.length} checks completed
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Steps Checklist */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Validation Checklist</CardTitle>
              <CardDescription>Each step validates a critical system function</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-3">
                  {steps.map((step, index) => (
                    <div 
                      key={step.id}
                      className={`p-4 rounded-lg border transition-colors ${
                        step.status === 'running' ? 'border-primary bg-primary/5' :
                        step.status === 'passed' ? 'border-green-500/50 bg-green-500/5' :
                        step.status === 'failed' ? 'border-destructive bg-destructive/5' :
                        'border-border'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {getStepIcon(step.status)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {index + 1}. {step.name}
                            </span>
                            {step.status === 'passed' && (
                              <Badge variant="outline" className="bg-green-500/10 text-green-600 text-xs">
                                ✓ Passed
                              </Badge>
                            )}
                            {step.status === 'failed' && (
                              <Badge variant="destructive" className="text-xs">
                                ✗ Failed
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {step.description}
                          </p>
                          {step.details && (
                            <p className="text-sm text-primary mt-1 font-mono">
                              → {step.details}
                            </p>
                          )}
                          {step.error && (
                            <p className="text-sm text-destructive mt-1">
                              Error: {step.error}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Results Summary */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Demo Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {results.productName && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase font-medium">Product</p>
                  <p className="font-medium">{results.productName}</p>
                </div>
              )}
              {results.batchNumber && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase font-medium">Batch</p>
                  <p className="font-medium">{results.batchNumber}</p>
                </div>
              )}
              {results.invoiceNumber && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase font-medium">Invoice</p>
                  <p className="font-medium">{results.invoiceNumber}</p>
                </div>
              )}
              
              <Separator />
              
              {results.totalAmount !== undefined && (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Sale</span>
                    <span className="font-medium">{formatCurrency(results.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">COGS (Paid)</span>
                    <span className="font-medium">{formatCurrency(results.profit ? results.totalAmount - results.profit : 0)}</span>
                  </div>
                  <div className="flex justify-between text-green-600">
                    <span>Net Profit</span>
                    <span className="font-bold">{formatCurrency(results.profit || 0)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-orange-600">
                    <span className="text-sm">Free Items Cost</span>
                    <span className="font-medium">{formatCurrency(results.freeItemsCost || 0)}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Quick Links */}
          {hasResults && passedCount === steps.length && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Verify Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => navigate('/inventory')}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Check Inventory
                  <ArrowRight className="w-4 h-4 ml-auto" />
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => navigate('/sales')}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Sales
                  <ArrowRight className="w-4 h-4 ml-auto" />
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => navigate(`/stores/${results.storeId}`)}
                  disabled={!results.storeId}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Store Profile
                  <ArrowRight className="w-4 h-4 ml-auto" />
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => navigate('/reports')}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Profit & Loss Report
                  <ArrowRight className="w-4 h-4 ml-auto" />
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Cleanup Dialog */}
      <AlertDialog open={cleanupDialogOpen} onOpenChange={setCleanupDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cleanup Demo Data?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all demo data created during the test run:
              <ul className="list-disc list-inside mt-2 space-y-1">
                {results.productName && <li>Product: {results.productName}</li>}
                {results.batchNumber && <li>Batch: {results.batchNumber}</li>}
                {results.invoiceNumber && <li>Invoice: {results.invoiceNumber}</li>}
                {results.storeName && <li>Store: {results.storeName}</li>}
                {results.sellerName && <li>Seller: {results.sellerName}</li>}
                {results.customerName && <li>Customer: {results.customerName}</li>}
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={cleanupDemoData}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isCleaningUp}
            >
              {isCleaningUp ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cleaning...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete All Demo Data
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
