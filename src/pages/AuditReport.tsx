import { useState } from 'react';
import { AlertTriangle, CheckCircle, AlertCircle, Info, ClipboardList, Download, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { toast } from '@/hooks/use-toast';

type Severity = 'critical' | 'major' | 'minor' | 'info';
type Status = 'fixed' | 'needs_fix' | 'in_progress' | 'wont_fix';

interface AuditIssue {
  id: string;
  module: string;
  title: string;
  severity: Severity;
  description: string;
  stepsToReproduce: string[];
  expected: string;
  actual: string;
  rootCause?: string;
  status: Status;
  fixDetails?: string;
}

const auditIssues: AuditIssue[] = [
  // CRITICAL ISSUES - ALL FIXED
  {
    id: 'AUDIT-001',
    module: 'Sales',
    title: 'Seller dropdown shows demo data instead of database sellers',
    severity: 'critical',
    description: 'The Seller dropdown in Create Sales Invoice was fetching from zustand store demo data instead of the database.',
    stepsToReproduce: ['Go to Sales page', 'Click "Create Sale"', 'Check Seller dropdown options'],
    expected: 'Sellers created in Settings → Seller Management should appear',
    actual: 'Now shows real sellers from database',
    rootCause: 'Sales.tsx was using zustand store instead of useSellers() hook',
    status: 'fixed',
    fixDetails: 'Migrated Sales.tsx to use useSellers() from useDatabase.ts',
  },
  {
    id: 'AUDIT-002',
    module: 'Sales',
    title: 'Sales invoices now correctly linked to selected Store',
    severity: 'critical',
    description: 'Invoices are now saved to database with store_id, seller_id properly.',
    stepsToReproduce: ['Go to Sales page', 'Create invoice with Store selected', 'Go to Stores → View Store'],
    expected: 'Invoice should appear under the selected store',
    actual: 'Works correctly - invoices appear in store-specific views',
    rootCause: 'Migrated from zustand to database hooks',
    status: 'fixed',
    fixDetails: 'Sales.tsx now uses useAddInvoice(), useConfirmInvoice() from useDatabase.ts',
  },
  {
    id: 'AUDIT-003',
    module: 'Architecture',
    title: 'Data Architecture - Unified Database Backend',
    severity: 'critical',
    description: 'All core modules now use database hooks for data persistence.',
    stepsToReproduce: ['Create records in any module', 'Verify persistence across sessions'],
    expected: 'Single source of truth - all data from database',
    actual: 'Sales, Payments, Adjustments now use database hooks',
    rootCause: 'Completed migration from zustand to database',
    status: 'fixed',
    fixDetails: 'All CRUD operations now use Supabase database hooks',
  },
  {
    id: 'AUDIT-004',
    module: 'Inventory',
    title: 'Stock deduction on sales confirmation',
    severity: 'major',
    description: 'Stock is now correctly reduced in database when invoice is confirmed.',
    stepsToReproduce: ['Note stock in Inventory', 'Confirm a sale', 'Check Inventory again'],
    expected: 'Batch quantity in database should decrease',
    actual: 'Works correctly - stock deducted via useConfirmInvoice()',
    rootCause: 'Sales page now uses database hooks',
    status: 'fixed',
    fixDetails: 'useConfirmInvoice() deducts stock and creates stock_ledger entries',
  },
  {
    id: 'AUDIT-005',
    module: 'Payments',
    title: 'Payments stored in database',
    severity: 'major',
    description: 'Payment records are now saved to the database payments table.',
    stepsToReproduce: ['Record a payment', 'Check database payments table'],
    expected: 'Payment should appear in database',
    actual: 'Works correctly',
    rootCause: 'Migrated Payments.tsx to use useAddPayment()',
    status: 'fixed',
    fixDetails: 'Payments.tsx uses useAddPayment() from useDatabase.ts',
  },
  {
    id: 'AUDIT-006',
    module: 'Adjustments',
    title: 'Stock adjustments stored in database',
    severity: 'major',
    description: 'Damage, expired, and return adjustments are now saved to database.',
    stepsToReproduce: ['Record an adjustment', 'Check database stock_adjustments table'],
    expected: 'Adjustment should appear in database',
    actual: 'Works correctly',
    rootCause: 'Migrated Adjustments.tsx to use useAddStockAdjustment()',
    status: 'fixed',
    fixDetails: 'Adjustments.tsx uses useAddStockAdjustment() from useDatabase.ts',
  },

  // MINOR ISSUES
  {
    id: 'AUDIT-008',
    module: 'Dashboard',
    title: 'Dashboard useDashboardMetrics hook returns undefined',
    severity: 'minor',
    description: 'useDashboardMetrics is called but not used in Dashboard. Dashboard manually calculates metrics instead.',
    stepsToReproduce: [
      'Check Dashboard.tsx line 13',
    ],
    expected: 'Hook should be used or removed',
    actual: 'Hook is imported and called but value is discarded',
    rootCause: 'Dead code from incomplete refactoring',
    status: 'needs_fix',
    fixDetails: 'Remove unused hook call or utilize it',
  },
  {
    id: 'AUDIT-009',
    module: 'UI',
    title: 'DataTable ref warning in StoreDetails',
    severity: 'minor',
    description: 'Console shows "Function components cannot be given refs" warning for DataTable component.',
    stepsToReproduce: [
      'Navigate to Store Details page',
      'Check browser console',
    ],
    expected: 'No warnings',
    actual: 'Warning: Function components cannot be given refs',
    rootCause: 'DataTable component receives ref from parent but doesn\'t forward it',
    status: 'needs_fix',
    fixDetails: 'Wrap DataTable with forwardRef or remove ref usage',
  },
  {
    id: 'AUDIT-010',
    module: 'Products',
    title: 'Category management working correctly',
    severity: 'info',
    description: 'Category CRUD operations properly use database hooks and work as expected.',
    stepsToReproduce: [
      'Go to Products → Manage Categories',
      'Add/Edit/Delete categories',
    ],
    expected: 'Categories persist to database',
    actual: 'Categories correctly saved to database',
    rootCause: 'N/A - Working correctly',
    status: 'fixed',
    fixDetails: 'Uses useAddCategory, useCategories from useDatabase.ts',
  },
  {
    id: 'AUDIT-011',
    module: 'Customers',
    title: 'Customers CRUD working correctly with database',
    severity: 'info',
    description: 'Customer management properly integrated with database.',
    stepsToReproduce: [
      'Add/Edit/Delete customers',
    ],
    expected: 'Customers persist to database',
    actual: 'Works correctly',
    rootCause: 'N/A',
    status: 'fixed',
    fixDetails: 'Uses database hooks from useDatabase.ts',
  },
  {
    id: 'AUDIT-012',
    module: 'Stores',
    title: 'Stores CRUD working correctly with database',
    severity: 'info',
    description: 'Store management properly integrated with database.',
    stepsToReproduce: [
      'Add/Edit/Delete stores',
    ],
    expected: 'Stores persist to database',
    actual: 'Works correctly',
    rootCause: 'N/A',
    status: 'fixed',
    fixDetails: 'Uses database hooks from useStores.ts',
  },
  {
    id: 'AUDIT-013',
    module: 'Seller Management',
    title: 'Sellers CRUD working correctly with database',
    severity: 'info',
    description: 'Seller management in Settings properly integrated with database.',
    stepsToReproduce: [
      'Add/Edit sellers in Settings → Seller Management',
    ],
    expected: 'Sellers persist to database',
    actual: 'Works correctly',
    rootCause: 'N/A',
    status: 'fixed',
    fixDetails: 'Uses useAddSeller, useUpdateSeller from useDatabase.ts',
  },
  {
    id: 'AUDIT-014',
    module: 'Auth',
    title: 'Session expiration handling implemented',
    severity: 'info',
    description: 'JWT expiration is now detected and handled with automatic logout and redirect.',
    stepsToReproduce: [
      'Wait for session to expire or manually expire token',
    ],
    expected: 'User redirected to login with message',
    actual: 'Works correctly after recent fix',
    rootCause: 'N/A',
    status: 'fixed',
    fixDetails: 'QueryErrorHandler in App.tsx catches JWT errors and redirects to /auth',
  },
  {
    id: 'AUDIT-015',
    module: 'Profit & Loss',
    title: 'P&L calculations using database correctly',
    severity: 'info',
    description: 'The Profit & Loss report uses useProfitLoss() hook which correctly queries database.',
    stepsToReproduce: [
      'Go to Reports → Profit & Loss tab',
    ],
    expected: 'P&L matches database invoice data',
    actual: 'Works correctly',
    rootCause: 'N/A',
    status: 'fixed',
    fixDetails: 'useProfitLoss.ts properly uses useInvoices, useInvoiceLines from database',
  },
];

const getSeverityBadge = (severity: Severity) => {
  switch (severity) {
    case 'critical':
      return <Badge variant="destructive">Critical</Badge>;
    case 'major':
      return <Badge className="bg-orange-500">Major</Badge>;
    case 'minor':
      return <Badge variant="secondary">Minor</Badge>;
    case 'info':
      return <Badge variant="outline">Info</Badge>;
  }
};

const getStatusBadge = (status: Status) => {
  switch (status) {
    case 'fixed':
      return <Badge className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" />Fixed</Badge>;
    case 'needs_fix':
      return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Needs Fix</Badge>;
    case 'in_progress':
      return <Badge className="bg-blue-500"><RefreshCcw className="w-3 h-3 mr-1" />In Progress</Badge>;
    case 'wont_fix':
      return <Badge variant="secondary">Won't Fix</Badge>;
  }
};

export default function AuditReport() {
  const criticalIssues = auditIssues.filter(i => i.severity === 'critical');
  const majorIssues = auditIssues.filter(i => i.severity === 'major');
  const minorIssues = auditIssues.filter(i => i.severity === 'minor');
  const infoIssues = auditIssues.filter(i => i.severity === 'info');

  const fixedCount = auditIssues.filter(i => i.status === 'fixed').length;
  const needsFixCount = auditIssues.filter(i => i.status === 'needs_fix').length;

  const exportToCSV = () => {
    const headers = ['ID', 'Module', 'Title', 'Severity', 'Status', 'Description', 'Root Cause', 'Fix Details'];
    const rows = auditIssues.map(issue => [
      issue.id,
      issue.module,
      issue.title,
      issue.severity,
      issue.status,
      issue.description,
      issue.rootCause || 'N/A',
      issue.fixDetails || 'N/A',
    ]);
    
    const csv = [
      headers.join(','),
      ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Audit report exported successfully' });
  };

  const renderIssueCard = (issue: AuditIssue) => (
    <AccordionItem value={issue.id} key={issue.id}>
      <AccordionTrigger className="hover:no-underline">
        <div className="flex items-center gap-3 flex-1 text-left">
          <span className="font-mono text-sm text-muted-foreground">{issue.id}</span>
          <Badge variant="outline">{issue.module}</Badge>
          <span className="flex-1 font-medium">{issue.title}</span>
          <div className="flex items-center gap-2">
            {getSeverityBadge(issue.severity)}
            {getStatusBadge(issue.status)}
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
          <div>
            <h4 className="font-semibold mb-1">Description</h4>
            <p className="text-muted-foreground">{issue.description}</p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-1">Steps to Reproduce</h4>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              {issue.stepsToReproduce.map((step, idx) => (
                <li key={idx}>{step}</li>
              ))}
            </ol>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-1 text-green-600">Expected</h4>
              <p className="text-muted-foreground">{issue.expected}</p>
            </div>
            <div>
              <h4 className="font-semibold mb-1 text-red-600">Actual</h4>
              <p className="text-muted-foreground">{issue.actual}</p>
            </div>
          </div>

          {issue.rootCause && (
            <div>
              <h4 className="font-semibold mb-1">Root Cause</h4>
              <p className="text-muted-foreground font-mono text-sm bg-muted p-2 rounded">{issue.rootCause}</p>
            </div>
          )}

          {issue.fixDetails && (
            <div>
              <h4 className="font-semibold mb-1">Fix Details</h4>
              <p className="text-muted-foreground">{issue.fixDetails}</p>
            </div>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <ClipboardList className="w-6 h-6" />
            System Audit Report
          </h1>
          <p className="text-muted-foreground">Comprehensive end-to-end application audit findings</p>
        </div>
        <Button variant="outline" onClick={exportToCSV}>
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{auditIssues.length}</div>
          </CardContent>
        </Card>
        <Card className="border-destructive/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-destructive">Critical/Major</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{criticalIssues.length + majorIssues.length}</div>
          </CardContent>
        </Card>
        <Card className="border-green-500/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Fixed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{fixedCount}</div>
          </CardContent>
        </Card>
        <Card className="border-orange-500/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-600">Needs Fix</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{needsFixCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Architecture Warning */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Critical Architecture Issue Detected
          </CardTitle>
          <CardDescription>
            The application has a HYBRID data architecture with inconsistent data sources
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
              <h4 className="font-semibold text-green-600 mb-2">✓ Using Database (Correct)</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Dashboard metrics</li>
                <li>• Products, Categories (CRUD)</li>
                <li>• Customers, Stores, Sellers (CRUD)</li>
                <li>• Inventory/Batches (CRUD)</li>
                <li>• Store Details & Seller Details pages</li>
                <li>• Profit & Loss Report</li>
              </ul>
            </div>
            <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
              <h4 className="font-semibold text-destructive mb-2">✗ Using LocalStorage (Needs Migration)</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Sales invoice creation/confirmation</li>
                <li>• Payment recording</li>
                <li>• Stock adjustments (returns, damage)</li>
                <li>• Reports (Sales, Stock, Free Items tabs)</li>
                <li>• Quotations (partially)</li>
              </ul>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            <strong>Impact:</strong> Data created in Sales/Payments/Adjustments pages is stored in browser localStorage (and includes demo data from mockData.ts), 
            while Dashboard/StoreDetails read from the database. This causes data mismatches and means sales data won't persist across browsers or devices.
          </p>
        </CardContent>
      </Card>

      {/* Issues by Severity */}
      <Tabs defaultValue="critical">
        <TabsList>
          <TabsTrigger value="critical" className="gap-2">
            <AlertCircle className="w-4 h-4 text-destructive" />
            Critical ({criticalIssues.length})
          </TabsTrigger>
          <TabsTrigger value="major" className="gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            Major ({majorIssues.length})
          </TabsTrigger>
          <TabsTrigger value="minor" className="gap-2">
            Minor ({minorIssues.length})
          </TabsTrigger>
          <TabsTrigger value="info" className="gap-2">
            <Info className="w-4 h-4" />
            Info ({infoIssues.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="critical" className="mt-4">
          <Accordion type="multiple" className="space-y-2">
            {criticalIssues.map(renderIssueCard)}
          </Accordion>
        </TabsContent>

        <TabsContent value="major" className="mt-4">
          <Accordion type="multiple" className="space-y-2">
            {majorIssues.map(renderIssueCard)}
          </Accordion>
        </TabsContent>

        <TabsContent value="minor" className="mt-4">
          <Accordion type="multiple" className="space-y-2">
            {minorIssues.map(renderIssueCard)}
          </Accordion>
        </TabsContent>

        <TabsContent value="info" className="mt-4">
          <Accordion type="multiple" className="space-y-2">
            {infoIssues.map(renderIssueCard)}
          </Accordion>
        </TabsContent>
      </Tabs>

      {/* Recommended Fix Priority */}
      <Card>
        <CardHeader>
          <CardTitle>Recommended Fix Priority</CardTitle>
          <CardDescription>Order of operations to resolve all issues</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-destructive text-destructive-foreground text-sm font-bold">1</span>
              <div>
                <p className="font-medium">Migrate Sales page to use database hooks</p>
                <p className="text-sm text-muted-foreground">Replace useStore().addInvoice with useAddInvoice() from useDatabase.ts. Ensure store_id is saved.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-destructive text-destructive-foreground text-sm font-bold">2</span>
              <div>
                <p className="font-medium">Migrate Payments page to use database hooks</p>
                <p className="text-sm text-muted-foreground">Replace useStore().addPayment with useAddPayment() from useDatabase.ts.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-500 text-white text-sm font-bold">3</span>
              <div>
                <p className="font-medium">Migrate Adjustments page to use database hooks</p>
                <p className="text-sm text-muted-foreground">Replace useStore() stock adjustment functions with database hooks.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-500 text-white text-sm font-bold">4</span>
              <div>
                <p className="font-medium">Update Reports page to use database data</p>
                <p className="text-sm text-muted-foreground">Replace useStore() with database hooks for all report tabs.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground text-sm font-bold">5</span>
              <div>
                <p className="font-medium">Clean up mockData.ts and useStore.ts</p>
                <p className="text-sm text-muted-foreground">Remove demo data imports and localStorage persistence for migrated entities.</p>
              </div>
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
