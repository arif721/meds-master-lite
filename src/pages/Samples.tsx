import { useState, useMemo } from 'react';
import { Plus, Search, Loader2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useProducts, useBatches, useCustomers, useSellers } from '@/hooks/useDatabase';
import { useStores } from '@/hooks/useStores';
import { useSamples, useSampleLines, DbSample, DbSampleLine } from '@/hooks/useSamples';
import { useDefaultSignature } from '@/hooks/useSignatures';
import { startOfDay, endOfDay, isWithinInterval, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { DateRange } from '@/components/SalesDateFilter';
import { SampleCreateDialog } from '@/components/samples/SampleCreateDialog';
import { SampleSummaryCards } from '@/components/samples/SampleSummaryCards';
import { SampleFilters } from '@/components/samples/SampleFilters';
import { SampleTable } from '@/components/samples/SampleTable';
import { SampleDetailDialog } from '@/components/samples/SampleDetailDialog';
import { exportSamplesCSV, exportSamplesPDF } from '@/components/samples/sampleExport';

export type SampleWithLines = DbSample & { lines: DbSampleLine[] };

export default function Samples() {
  const { data: dbProducts = [], isLoading: productsLoading } = useProducts();
  const { data: dbBatches = [], isLoading: batchesLoading } = useBatches();
  const { data: customers = [] } = useCustomers();
  const { data: stores = [] } = useStores();
  const { data: dbSellers = [] } = useSellers();
  const { data: dbSamples = [], isLoading: samplesLoading } = useSamples();
  const { data: dbSampleLines = [] } = useSampleLines();
  const preparedBySig = useDefaultSignature(null, 'prepared_by');

  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [detailSample, setDetailSample] = useState<SampleWithLines | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [storeFilter, setStoreFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [sellerFilter, setSellerFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);

  const samplesWithLines = useMemo(() => {
    return dbSamples.map(s => ({
      ...s,
      lines: dbSampleLines.filter(l => l.sample_id === s.id),
    }));
  }, [dbSamples, dbSampleLines]);

  const filteredSamples = useMemo(() => {
    return samplesWithLines.filter(s => {
      if (showDeleted ? !s.is_deleted : s.is_deleted) return false;

      const q = search.toLowerCase();
      const matchesSearch = !q || s.sample_number.toLowerCase().includes(q) ||
        (s.receiver_name || '').toLowerCase().includes(q) ||
        (s.receiver_phone || '').toLowerCase().includes(q);
      if (!matchesSearch) return false;

      if (dateRange.from || dateRange.to) {
        const d = parseISO(s.sale_date_time);
        const start = dateRange.from ? startOfDay(dateRange.from) : new Date(0);
        const end = dateRange.to ? endOfDay(dateRange.to) : endOfDay(new Date());
        if (!isWithinInterval(d, { start, end })) return false;
      }

      if (storeFilter && s.store_id !== storeFilter) return false;
      if (customerFilter && s.customer_id !== customerFilter) return false;
      if (sellerFilter && s.seller_id !== sellerFilter) return false;
      if (statusFilter && s.status !== statusFilter) return false;

      return true;
    });
  }, [samplesWithLines, search, dateRange, storeFilter, customerFilter, sellerFilter, statusFilter, showDeleted]);

  // Summary calculations
  const totalTPValue = useMemo(() => filteredSamples.reduce((sum, s) => sum + s.total_value, 0), [filteredSamples]);
  const totalCostValue = useMemo(() => filteredSamples.reduce((sum, s) => sum + s.lines.reduce((ls, l) => ls + l.cost_price * l.quantity, 0), 0), [filteredSamples]);

  // Top sampled product this month
  const topProduct = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const monthSamples = samplesWithLines.filter(s => !s.is_deleted && s.status === 'CONFIRMED' && isWithinInterval(parseISO(s.sale_date_time), { start: monthStart, end: monthEnd }));
    const productQty: Record<string, number> = {};
    monthSamples.forEach(s => s.lines.forEach(l => { productQty[l.product_id] = (productQty[l.product_id] || 0) + l.quantity; }));
    const topId = Object.entries(productQty).sort((a, b) => b[1] - a[1])[0];
    if (!topId) return null;
    const product = dbProducts.find(p => p.id === topId[0]);
    return product ? { name: product.name, qty: topId[1] } : null;
  }, [samplesWithLines, dbProducts]);

  // Top receiver
  const topReceiver = useMemo(() => {
    const receiverCount: Record<string, number> = {};
    filteredSamples.forEach(s => {
      const key = s.store_id ? stores.find(st => st.id === s.store_id)?.name :
        s.customer_id ? customers.find(c => c.id === s.customer_id)?.name :
          s.receiver_name || 'Unknown';
      if (key) receiverCount[key] = (receiverCount[key] || 0) + 1;
    });
    const top = Object.entries(receiverCount).sort((a, b) => b[1] - a[1])[0];
    return top ? { name: top[0], count: top[1] } : null;
  }, [filteredSamples, stores, customers]);

  const isLoading = productsLoading || batchesLoading || samplesLoading;
  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Samples</h1>
          <p className="text-muted-foreground">Manage sample / free deliveries</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportSamplesCSV(filteredSamples, dbProducts, stores, customers, dbSellers)}>
            <Download className="w-4 h-4 mr-2" />CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportSamplesPDF(filteredSamples, dbProducts, stores, customers, dbSellers)}>
            <Download className="w-4 h-4 mr-2" />PDF
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />Create Sample
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <SampleSummaryCards
        totalSamples={filteredSamples.length}
        totalTPValue={totalTPValue}
        totalCostValue={totalCostValue}
        topProduct={topProduct}
        topReceiver={topReceiver}
      />

      {/* Filters */}
      <SampleFilters
        search={search}
        onSearchChange={setSearch}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        storeFilter={storeFilter}
        onStoreFilterChange={setStoreFilter}
        customerFilter={customerFilter}
        onCustomerFilterChange={setCustomerFilter}
        sellerFilter={sellerFilter}
        onSellerFilterChange={setSellerFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        showDeleted={showDeleted}
        onShowDeletedChange={setShowDeleted}
        stores={stores}
        customers={customers}
        sellers={dbSellers}
      />

      {/* Table */}
      <SampleTable
        samples={filteredSamples}
        products={dbProducts}
        stores={stores}
        customers={customers}
        sellers={dbSellers}
        batches={dbBatches}
        showDeleted={showDeleted}
        onView={setDetailSample}
        preparedBySignatureUrl={preparedBySig?.image_url}
      />

      {/* Create Dialog */}
      <SampleCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        products={dbProducts}
        batches={dbBatches}
        stores={stores}
        customers={customers}
        sellers={dbSellers}
      />

      {/* Detail Dialog */}
      <SampleDetailDialog
        sample={detailSample}
        onClose={() => setDetailSample(null)}
        products={dbProducts}
        stores={stores}
        customers={customers}
        sellers={dbSellers}
        batches={dbBatches}
        preparedBySignatureUrl={preparedBySig?.image_url}
      />
    </div>
  );
}
